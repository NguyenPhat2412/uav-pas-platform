#!/usr/bin/env python3
"""Disposable real-service browser/recovery runner. Public output is an allowlist only."""
import argparse, concurrent.futures, hashlib, json, os, pathlib, re, secrets, shutil, signal, socket, subprocess, sys, time, urllib.error, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[3]
PARSER = argparse.ArgumentParser()
PARSER.add_argument('--frontend', type=pathlib.Path, default=ROOT/'frontend')
PARSER.add_argument('--work-dir', type=pathlib.Path, default=ROOT/'docs/work/e2e-private')
PARSER.add_argument('--result-dir', type=pathlib.Path, default=ROOT/'docs/work/e2e-safe')
PARSER.add_argument('--project', default='uav-e2e-'+secrets.token_hex(6))
PARSER.add_argument('--recovery', action='store_true')
PARSER.add_argument('--rollback-classes', type=pathlib.Path, help='Optional compatible immutable prior release classes; copied before use')
PARSER.add_argument('--reuse-build', action='store_true', help='Only for a previously successful build with identical source/API origin')
ARGS = PARSER.parse_args()
os.umask(0o077)
F=ARGS.frontend.resolve(); W=ARGS.work_dir.resolve(); O=ARGS.result_dir.resolve()
assert re.fullmatch(r'uav-[a-z0-9-]+',ARGS.project), 'Owned project prefix required'
assert not W.exists(), 'Use a fresh private work directory'
assert W != O and W not in O.parents, 'Safe results must be outside private work'
W.mkdir(parents=True); O.mkdir(parents=True,exist_ok=True)
(W/'owner.json').write_text(json.dumps({'project':ARGS.project}))
PORTS={k:int(os.getenv('UAV_E2E_'+k.upper()+'_PORT',v)) for k,v in dict(db=55446,storage=9044,storage_console=9045,backend=18584,web=3410,customer=3411,operations=3412,admin=3413,legacy=3430).items()}
assert len(set(PORTS.values()))==len(PORTS), 'Ports must be distinct'
for port in PORTS.values():
    with socket.socket() as sock:
        sock.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1)
        sock.bind(('127.0.0.1',port))
ENV=dict(os.environ)
# Do not inherit a developer's credential, target, or auth configuration.
for key in list(ENV):
    if key.startswith(('APP_','SPRING_','UAV_TEST_','UAV_STABILIZATION_')): ENV.pop(key)
for key,value in {'UAV_TEST_DB_PASSWORD':secrets.token_hex(24),'UAV_TEST_STORAGE_PASSWORD':secrets.token_hex(24),'APP_JWT_SECRET':secrets.token_hex(64)}.items():
    if os.getenv('GITHUB_ACTIONS')=='true': print('::add-mask::'+value,flush=True)
    ENV[key]=value
ENV.update(COMPOSE_PROJECT_NAME=ARGS.project,UAV_VOLUME_GENERATION='source',UAV_TEST_STORAGE_USER='uav_e2e',
 SPRING_PROFILES_ACTIVE='stabilization',SERVER_PORT=str(PORTS['backend']),SERVER_ADDRESS='127.0.0.1',
 SPRING_DATASOURCE_URL=f"jdbc:postgresql://127.0.0.1:{PORTS['db']}/uav_e2e",SPRING_DATASOURCE_USERNAME='uav_test',SPRING_DATASOURCE_PASSWORD=ENV['UAV_TEST_DB_PASSWORD'],
 APP_STORAGE_ENDPOINT=f"http://127.0.0.1:{PORTS['storage']}",APP_STORAGE_PUBLIC_ENDPOINT=f"http://127.0.0.1:{PORTS['storage']}",APP_STORAGE_ACCESS_KEY='uav_e2e',APP_STORAGE_SECRET_KEY=ENV['UAV_TEST_STORAGE_PASSWORD'],APP_STORAGE_BUCKET='uav-e2e',APP_STORAGE_ENSURE_BUCKET='true',
 APP_CORS_ALLOWED_ORIGINS=','.join(f'http://localhost:{PORTS[k]}' for k in ['web','customer','operations','admin','legacy']),APP_STORAGE_CORS_ORIGIN=f"http://localhost:{PORTS['operations']}",
 APP_WEBHOOK_ENABLED='false',APP_WEBHOOK_APPROVED_URLS='',APP_BILLING_PROVIDER_ENABLED='false',APP_COOKIE_SECURE='false',APP_COOKIE_DOMAIN='',APP_COOKIE_SAME_SITE='Lax',
 APP_BILLING_INVOICE_WORKER_ENABLED='false',APP_FINANCIAL_OUTBOX_WORKER_ENABLED='false',APP_FINANCIAL_OUTBOX_RETRY_DELAY_MS='1000',
 NEXT_TELEMETRY_DISABLED='1',NEXT_PUBLIC_API_URL=f"http://localhost:{PORTS['backend']}",UAV_E2E_PRIVATE_DIR=str(W),UAV_E2E_RESULT_DIR=str(O))
for key in ['db','storage','storage_console']: ENV['UAV_E2E_'+key.upper()+'_PORT']=str(PORTS[key])
BASE=f"http://localhost:{PORTS['backend']}"; PROCESSES={}; RESULTS=[]; COMMANDS=[]; GENERATIONS=[]; CURRENT='initialization'; COUNTER=0
COMPOSE=['docker','compose','-p',ARGS.project,'-f',str(ROOT/'backend/infra/ci/compose.yml')]

def frontend_build_identity():
    digest=hashlib.sha256()
    for directory, dirs, files in os.walk(F):
        dirs[:]=sorted(d for d in dirs if d not in ['node_modules','.next','.git','out','dist','tests'])
        for filename in sorted(files):
            source=pathlib.Path(directory)/filename
            if filename.endswith('.tsbuildinfo') or filename=='next-env.d.ts': continue
            digest.update(str(source.relative_to(F)).encode());digest.update(source.read_bytes())
    return {'sourceSha256':digest.hexdigest(),'apiOrigin':ENV['NEXT_PUBLIC_API_URL']}


def command(args,cwd=ROOT,timeout=180, input=None):
    global COUNTER
    COUNTER+=1
    COMMANDS.append({'command':[str(x).replace(str(ROOT),'$ROOT').replace(str(F),'$FRONTEND').replace(str(W),'$PRIVATE') for x in args], 'timeoutSeconds':timeout})
    with (W/f'command-{COUNTER}.log').open('wb') as log:
        process=subprocess.Popen(list(map(str,args)),cwd=cwd,env=ENV,stdin=subprocess.PIPE if input else None,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
        try: process.communicate(input=input,timeout=timeout)
        except BaseException:
            if process.poll() is None: os.killpg(process.pid,signal.SIGTERM)
            try: process.wait(timeout=15)
            except subprocess.TimeoutExpired: os.killpg(process.pid,signal.SIGKILL);process.wait(timeout=10)
            raise
    if process.returncode: raise RuntimeError('COMMAND_FAILED')

def capture(args,input=None):
    result=subprocess.run(args,input=input,env=ENV,capture_output=True,timeout=90)
    if result.returncode: raise RuntimeError('PRIVATE_COMMAND_FAILED')
    return result.stdout

def sql(query):
    return capture(COMPOSE+['exec','-T','postgres','psql','-X','-U','uav_test','-d','uav_e2e','-At','-v','ON_ERROR_STOP=1'],query.encode()).decode().strip()

def wait_url(url,process=None):
    for _ in range(120):
        if process and process.poll() is not None: raise RuntimeError('PROCESS_EXITED')
        try:
            with urllib.request.urlopen(url,timeout=1) as response:
                if response.status==200: return
        except (OSError,urllib.error.URLError): pass
        time.sleep(.5)
    raise RuntimeError('READINESS_TIMEOUT')

def start(name,args,cwd,extra=None):
    with (W/(name+'-private.log')).open('ab') as log:
        process=subprocess.Popen(list(map(str,args)),cwd=cwd,env=dict(ENV,**(extra or {})),stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
    PROCESSES[name]=process
    return process

def stop(name):
    process=PROCESSES.pop(name,None)
    if not process: return
    if process.poll() is None:
        os.killpg(process.pid,signal.SIGTERM)
        try: process.wait(timeout=20)
        except subprocess.TimeoutExpired: os.killpg(process.pid,signal.SIGKILL); process.wait(timeout=10)

def backend(worker=False,classes=None):
    cp=(W/'classpath.txt').read_text().strip()
    p=start('backend',['java','-cp',str(classes or W/'backend-target/classes')+os.pathsep+cp,'com.uav.platform.UavPlatformApplication'],W,{'APP_FINANCIAL_OUTBOX_WORKER_ENABLED':str(worker).lower()})
    wait_url(BASE+'/actuator/health/readiness',p)
    return p.pid

def api(path,body=None,token=None,method=None,expected=200):
    headers={'Content-Type':'application/json'}
    if token: headers['Authorization']='Bearer '+token
    request=urllib.request.Request(BASE+path,data=json.dumps(body).encode() if body is not None else None,headers=headers,method=method or ('POST' if body is not None else 'GET'))
    try:
        with urllib.request.urlopen(request,timeout=15) as response:
            assert response.status==expected,'API_STATUS'
            return json.loads(response.read())
    except urllib.error.HTTPError as error:
        assert error.code==expected,'API_STATUS'
        return None

def login(role):
    return api('/api/v1/auth/login',{'usernameOrEmail':FIXTURE['users'][role]['username'],'password':FIXTURE['password']})['accessToken']

def passed(name,**detail):
    RESULTS.append({'name':name,'status':'PASS',**detail}); print('PASS '+name,flush=True)

def stage(name):
    global CURRENT
    CURRENT=name; print('START '+name,flush=True)

def up(generation):
    if generation=='source':
        assert not capture(['docker','ps','-aq','--filter','label=com.docker.compose.project='+ARGS.project]).strip(),'PROJECT_ALREADY_EXISTS'
    ENV['UAV_VOLUME_GENERATION']=generation
    for kind in ['postgres','minio']:
        existing=capture(['docker','volume','ls','--filter',f'name=^{ARGS.project}_{kind}_{generation}$','-q']).strip()
        assert not existing,'VOLUME_ALREADY_EXISTS'
    (W/'owns-resources').touch()
    GENERATIONS.append(generation)
    command(COMPOSE+['up','-d','--wait','--wait-timeout','90'],timeout=900)
    wait_url(f"http://127.0.0.1:{PORTS['storage']}/minio/health/ready")

def object_state():
    token=login('customer'); mission=json.loads((W/'mission.json').read_text()); mid=mission['missionId']; media=mission['mediaId']
    assert api(f'/api/v1/missions/{mid}',token=token)['status']=='COMPLETED','MISSION_STATE'
    rows=api(f'/api/v1/missions/{mid}/media',token=token)
    assert any(row.get('media',{}).get('id')==media for row in rows),'MEDIA_ASSOCIATION'
    url=api(f'/api/v1/media/{media}/download-url',token=token)['url']
    with urllib.request.urlopen(url,timeout=15) as response: digest=hashlib.sha256(response.read()).hexdigest()
    assert digest==mission['pdfSha256'],'OBJECT_HASH'
    counts={table:int(sql(f'SELECT count(*) FROM {table}')) for table in ['users','missions','media_assets','mission_media','invoices','payment_transactions','user_quotas','notifications','financial_outbox_events','flyway_schema_history']}
    financial=hashlib.sha256()
    for table in ['invoices','payment_transactions','user_quotas','financial_outbox_events']:
        financial.update(table.encode());financial.update(sql(f'SELECT row_to_json(t)::text FROM {table} t ORDER BY id').encode())
    return {'counts':counts,'objectSha256':digest,'financialStateSha256':financial.hexdigest(),'associationVerified':True}

def recovery():
    stage('financial pending work survives physical backend restart')
    admin=login('admin'); customer=login('customer')
    quota=api('/api/v1/billing/quota',token=customer)
    invoice=api('/api/v1/billing/invoices',{'userId':FIXTURE['users']['customer']['id'],'amount':123456,'notes':'Synthetic recovery amount'},admin,expected=201)
    iid=int(invoice['id'])
    assert sql(f"SELECT status FROM financial_outbox_events WHERE invoice_id={iid}")=='PENDING','PENDING_REQUIRED'
    sql("CREATE FUNCTION e2e_fail_notification() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'E2E_CONTROLLED_FAILURE'; END $$; CREATE TRIGGER e2e_controlled_failure BEFORE INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION e2e_fail_notification();")
    previous=PROCESSES['backend'].pid; stop('backend'); current=backend(True); assert current!=previous
    for _ in range(60):
        if sql(f"SELECT last_error FROM financial_outbox_events WHERE invoice_id={iid}")=='LOCAL_EVENT_PROCESSING_FAILED': break
        time.sleep(.5)
    else: raise RuntimeError('CONTROLLED_FAILURE_NOT_OBSERVED')
    sql('DROP TRIGGER e2e_controlled_failure ON notifications; DROP FUNCTION e2e_fail_notification();')
    sql(f"UPDATE financial_outbox_events SET next_attempt_at=CURRENT_TIMESTAMP WHERE invoice_id={iid}")
    for _ in range(60):
        if sql(f"SELECT notification_created FROM financial_outbox_events WHERE invoice_id={iid}")=='t': break
        time.sleep(.5)
    else: raise RuntimeError('RETRY_NOT_COMPLETED')
    # A second real process restart and forced due retry must not duplicate local effects.
    stop('backend');backend(True)
    sql(f"UPDATE financial_outbox_events SET next_attempt_at=CURRENT_TIMESTAMP WHERE invoice_id={iid}")
    time.sleep(3)
    assert sql(f"SELECT count(*) FROM notifications WHERE reference_type='INVOICE' AND reference_id={iid}")=='1','NOTIFICATION_DUPLICATE'
    assert sql(f'SELECT count(*) FROM invoices WHERE id={iid}')=='1','INVOICE_DUPLICATE'
    assert sql(f'SELECT count(*) FROM payment_transactions WHERE invoice_id={iid}')=='0','PAYMENT_UNEXPECTED'
    assert api('/api/v1/billing/quota',token=login('customer'))==quota,'QUOTA_CHANGED'
    assert sql('SELECT count(*) FROM webhook_delivery_logs')=='0','EXTERNAL_SEND_UNEXPECTED'
    passed(CURRENT,physicalBackendRestarts=2,controlledFailureObserved=True,invoices=1,payments=0,localNotifications=1,quotaUnchanged=True,externalSends=0)
    stop('backend');backend(False)
    stage('named-volume backup restore and association readback')
    original=object_state(); stop('backend')
    backup=W/'backup';backup.mkdir()
    (backup/'postgres.dump').write_bytes(capture(COMPOSE+['exec','-T','postgres','pg_dump','-U','uav_test','-d','uav_e2e','-Fc']))
    command(COMPOSE+['stop','minio'])
    cid=capture(COMPOSE+['ps','-a','-q','minio']).decode().strip()
    (backup/'minio.tar').write_bytes(capture(['docker','cp','-a',cid+':/data/.','-']))
    command(COMPOSE+['down'])
    up('restored')
    capture(COMPOSE+['exec','-T','postgres','pg_restore','-U','uav_test','-d','uav_e2e','--exit-on-error'],(backup/'postgres.dump').read_bytes())
    command(COMPOSE+['stop','minio'])
    cid=capture(COMPOSE+['ps','-a','-q','minio']).decode().strip()
    capture(['docker','cp','-a','-',cid+':/data'],(backup/'minio.tar').read_bytes())
    command(COMPOSE+['start','minio']);wait_url(f"http://127.0.0.1:{PORTS['storage']}/minio/health/ready")
    backend(False); restored=object_state();assert restored==original,'RESTORE_MISMATCH'
    passed(CURRENT,**restored,backupPrivate=True,freshDestination=True)
    stage('physical container restart preserves named-volume data')
    stop('backend');command(COMPOSE+['restart']);wait_url(f"http://127.0.0.1:{PORTS['storage']}/minio/health/ready");backend(False)
    assert object_state()==original,'RESTART_MISMATCH'
    passed(CURRENT,**original)

    if ARGS.rollback_classes:
        stage('prior application artifact rollback without downmigration')
        assert sql('SELECT count(*) FROM webhook_subscriptions WHERE is_active')=='0'
        old=W/'rollback-classes';shutil.copytree(ARGS.rollback_classes.resolve(),old)
        def artifact_hash(directory):
            digest=hashlib.sha256()
            for file in sorted(directory.rglob('*')):
                if file.is_file(): digest.update(str(file.relative_to(directory)).encode());digest.update(file.read_bytes())
            return digest.hexdigest()
        prior_hash=artifact_hash(old);final_hash=artifact_hash(W/'backend-target/classes')
        assert prior_hash!=final_hash,'ROLLBACK_REQUIRES_DISTINCT_ARTIFACT'
        stop('backend')
        try:
            backend(False,old)
            assert object_state()==original,'ROLLBACK_STATE_MISMATCH'
            passed(CURRENT,olderArtifactReady=True,downmigration=False,priorArtifactSha256=prior_hash,finalArtifactSha256=final_hash,**original)
        finally:
            stop('backend');backend(False)
        assert object_state()==original,'FORWARD_STATE_MISMATCH'
        passed('final application restored after rollback',**original)


def load_probe():
    stage('bounded authenticated local load')
    token=login('customer'); durations=[]; failures=0
    def request(_):
        started=time.monotonic()
        try: api('/api/v1/missions?page=0&size=10',token=token);return (time.monotonic()-started)*1000,True
        except Exception:return (time.monotonic()-started)*1000,False
    started=time.monotonic()
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for duration,ok in pool.map(request,range(40)): durations.append(duration); failures+=not ok
    durations.sort()
    passed(CURRENT,concurrency=4,requests=40,durationSeconds=round(time.monotonic()-started,3),errors=failures,p50Ms=round(durations[19],2),p95Ms=round(durations[37],2),maxMs=round(durations[-1],2),productionSla=False)
    assert failures==0,'LOAD_ERRORS'

def cancelled(signum, frame):
    raise SystemExit('CANCELLED')
signal.signal(signal.SIGTERM,cancelled)
signal.signal(signal.SIGINT,cancelled)
FAILED=False
try:
    stage('isolated PostgreSQL and MinIO readiness');up('source');passed(CURRENT)
    stage('compile backend into private target')
    command(['./mvnw','-B','-Duav.build.directory='+str(W/'backend-target'),'compile','dependency:build-classpath','-Dmdep.outputFile='+str(W/'classpath.txt')],cwd=ROOT/'backend',timeout=600)
    backend(False);passed(CURRENT)
    stage('generated synthetic fixture')
    password=secrets.token_urlsafe(24)
    if os.getenv('GITHUB_ACTIONS')=='true': print('::add-mask::'+password,flush=True)
    suffix=secrets.token_hex(5);users={}
    for role in ['customer','customer_b','operator','operator_b','admin']:
        username='e2e_'+role+'_'+suffix
        data=api('/api/v1/auth/register',{'username':username,'email':username+'@example.invalid','password':password,'phoneNumber':'09'+str(secrets.randbelow(100000000)).zfill(8)},expected=201)
        users[role]={'username':username,'id':int(data['id'])}
    sql(f"UPDATE users SET role='ROLE_ADMIN' WHERE id={users['admin']['id']}; UPDATE users SET role='ROLE_OPERATOR' WHERE id IN ({users['operator']['id']},{users['operator_b']['id']}); INSERT INTO user_permissions(user_id,permission_id,granted,created_at,updated_at) SELECT {users['admin']['id']},id,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP FROM permissions;")
    FIXTURE={'base':BASE,'password':password,'users':users,'ports':PORTS,'storagePort':PORTS['storage']};token=login('admin')
    station=api('/api/v1/stations',{'code':'E2E-ST-'+suffix,'name':'Synthetic station','address':'Synthetic','status':'ACTIVE'},token,expected=201)
    uav=api('/api/v1/uavs',{'serialNumber':'E2E-UAV-'+suffix,'model':'Synthetic','manufacturer':'Synthetic'},token,expected=201)
    equipment=api('/api/v1/inventory/equipment',{'name':'Synthetic camera','type':'CAMERA','serialNumber':'E2E-CAM-'+suffix,'stationId':station['id']},token,expected=201)
    api(f"/api/v1/inventory/equipment/{equipment['id']}/stock-in",{'quantity':5,'note':'Synthetic E2E stock'},token)
    FIXTURE.update(stationId=station['id'],uavId=uav['id'],equipmentId=equipment['id'])
    (W/'fixture.json').write_text(json.dumps(FIXTURE));passed(CURRENT,users=5)
    stage('production frontend builds')
    identity=frontend_build_identity();manifest=F/'node_modules/.cache/uav-e2e-build.json'
    if ARGS.reuse_build:
        assert manifest.exists() and json.loads(manifest.read_text())==identity,'STALE_BUILD_OR_API_ORIGIN'
    else:
        command(['npm','run','build','--workspaces'],cwd=F,timeout=900)
        command(['npm','run','build'],cwd=F/'legacy',timeout=600)
        manifest.parent.mkdir(parents=True,exist_ok=True);manifest.write_text(json.dumps(frontend_build_identity()))
    for app in ['web','customer','operations','admin','legacy']:
        directory=F/'apps'/app if app!='legacy' else F/'legacy'
        # Use the documented production server; no dev server or demo auth bypass.
        cli=F/'node_modules/next/dist/bin/next' if app!='legacy' else F/'legacy/node_modules/next/dist/bin/next'
        assert (directory/'.next/BUILD_ID').exists(),'PRODUCTION_BUILD_REQUIRED'
        process=start(app,['node',cli,'start','-p',str(PORTS[app]),'-H','127.0.0.1'],directory)
        wait_url(f'http://127.0.0.1:{PORTS[app]}',process)
    passed(CURRENT,reused=ARGS.reuse_build)
    stage('portable real browser mission suite');command(['npm','run','test:e2e'],cwd=F,timeout=420);passed(CURRENT)
    if ARGS.recovery: recovery()
    load_probe()
except BaseException as error:
    FAILED=True;RESULTS.append({'name':CURRENT,'status':'FAIL','category':type(error).__name__});print('FAIL '+CURRENT+' ('+type(error).__name__+')',flush=True)
finally:
    for name in list(PROCESSES): stop(name)
    cleanup=True
    for generation in GENERATIONS:
        ENV['UAV_VOLUME_GENERATION']=generation
        try: command(COMPOSE+['down','--volumes','--remove-orphans'])
        except Exception: cleanup=False
    RESULTS.append({'name':'owned process/container/volume cleanup','status':'PASS' if cleanup else 'FAIL'})
    (O/'runner.json').write_text(json.dumps({'status':'FAIL' if FAILED or not cleanup else 'PASS','checks':RESULTS,'commands':COMMANDS,'ports':PORTS,'hostedCiExecuted':False},indent=2)+'\n')
    # Raw logs/backups/fixtures remain mode 0700/0600 locally, and are never uploaded.
    # On cleanup failure the workflow needs owns-resources for its label-scoped fallback.
    # It removes this private directory only after attempting fallback cleanup.
    if os.getenv('GITHUB_ACTIONS')=='true' and cleanup: shutil.rmtree(W)
    print('Safe results: '+str(O),flush=True)
    sys.exit(1 if FAILED or not cleanup else 0)
