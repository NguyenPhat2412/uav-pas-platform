import os,secrets,json,subprocess,pathlib,time,urllib.request,sys,signal,shutil
ROOT=pathlib.Path('/Volumes/D/Codex/projects/uav-pas-platform')
P=ROOT/'work/uav-resource-redispatch-20261016'
PROJECT='uav-resource-redispatch-20261016'
NODE='/Users/admin/.nvm/versions/node/v20.20.2/bin'
action=sys.argv[1]
def load():return json.loads((P/'env.json').read_text())
def pids():return json.loads((P/'pids.json').read_text()) if (P/'pids.json').exists() else {}
def saveids(ids):(P/'pids.json').write_text(json.dumps(ids))
if action=='infra':
 env=dict(UAV_TEST_DB_PASSWORD=secrets.token_hex(24),UAV_TEST_STORAGE_USER='uav_dispatch_test',UAV_TEST_STORAGE_PASSWORD=secrets.token_hex(24))
 env.update(SPRING_PROFILES_ACTIVE='stabilization',SERVER_PORT='18080',SERVER_ADDRESS='127.0.0.1',SPRING_DATASOURCE_URL='jdbc:postgresql://127.0.0.1:55444/uav_stabilization',SPRING_DATASOURCE_USERNAME='uav_test',SPRING_DATASOURCE_PASSWORD=env['UAV_TEST_DB_PASSWORD'],APP_JWT_SECRET=secrets.token_hex(64),APP_CORS_ALLOWED_ORIGINS=','.join('http://localhost:'+str(n) for n in range(3100,3104)),APP_STORAGE_ENDPOINT='http://127.0.0.1:9014',APP_STORAGE_ACCESS_KEY=env['UAV_TEST_STORAGE_USER'],APP_STORAGE_SECRET_KEY=env['UAV_TEST_STORAGE_PASSWORD'],APP_STORAGE_BUCKET='uav-resource-redispatch-test',APP_STORAGE_CORS_ORIGIN='http://localhost:3102')
 (P/'env.json').write_text(json.dumps(env));(P/'env.json').chmod(0o600)
 with (P/'infra-private.log').open('w') as log:subprocess.run(['docker','compose','-p',PROJECT,'-f','docker-compose.stabilization.yml','up','-d','--wait'],cwd=ROOT,env=dict(os.environ,**env),stdout=log,stderr=subprocess.STDOUT,check=True)
 print('Disposable database and storage ready; isolated ports 55444 and 9014/9015.')
elif action=='backend':
 if subprocess.run(['lsof','-tiTCP:18080','-sTCP:LISTEN'],stdout=subprocess.DEVNULL).returncode==0:raise RuntimeError('Isolated backend port is already occupied')
 env=dict(os.environ,**load());ids=pids()
 with (P/'backend-private.log').open('w') as log:process=subprocess.Popen(['./mvnw','-Duav.build.directory='+str(P/'backend-target'),'spring-boot:run'],cwd=ROOT/'backend',env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
 ids['backend']=process.pid
 saveids(ids)
 for _ in range(90):
  if process.poll() is not None:raise RuntimeError('Owned backend process exited before readiness')
  try:
   if urllib.request.urlopen('http://127.0.0.1:18080/actuator/health/readiness',timeout=1).status==200:break
  except Exception:time.sleep(1)
 else:raise RuntimeError('Backend readiness timeout; inspect private log with redaction')
 print('Backend ready on isolated port 18080.')
elif action=='seed':
 subprocess.run(['python3',str(P/'seed.py')],cwd=ROOT,env=dict(os.environ,UAV_BROWSER_WORK=str(P),UAV_BROWSER_POSTGRES_CONTAINER=PROJECT+'-postgres-1'),check=True)
elif action=='frontends':
 ids=pids()
 for app,port in [('web',3100),('customer',3101),('operations',3102),('admin',3103)]:
  if len(sys.argv)>2 and app!=sys.argv[2]:continue
  old=ids.pop(app,None)
  if old:
   try:os.killpg(old,signal.SIGTERM)
   except ProcessLookupError:pass
   time.sleep(0.3)
  ad=ROOT/'apps'/app;server=ad/'.next/standalone/apps'/app
  shutil.copytree(ad/'.next/static',server/'.next/static',dirs_exist_ok=True)
  if (ad/'public').exists():shutil.copytree(ad/'public',server/'public',dirs_exist_ok=True)
  env=dict(os.environ,PATH=NODE+':'+os.environ['PATH'],PORT=str(port),HOSTNAME='127.0.0.1',NEXT_TELEMETRY_DISABLED='1')
  with (P/(app+'-private.log')).open('w') as log:ids[app]=subprocess.Popen([NODE+'/node',str(server/'server.js')],cwd=ROOT,env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True).pid
 saveids(ids);print('Four standalone frontend apps started on 3100–3103.')
elif action=='stop-backend':
 ids=pids();pid=ids.pop('backend',None)
 if pid:
  try:os.killpg(pid,signal.SIGTERM)
  except ProcessLookupError:pass
 saveids(ids)
 for _ in range(100):
  try: urllib.request.urlopen('http://127.0.0.1:18080/actuator/health/readiness',timeout=0.2);time.sleep(0.1)
  except Exception:break
 else:raise RuntimeError('Backend port still busy after stopping owned process')
 print('Owned backend process stopped.')
elif action=='stop-frontends':
 ids=pids()
 for name in ['web','customer','operations','admin']:
  pid=ids.pop(name,None)
  if pid:
   try:os.killpg(pid,signal.SIGTERM)
   except ProcessLookupError:pass
 saveids(ids);print('Owned frontend processes stopped.')
elif action=='cleanup':
 for pid in pids().values():
  try:os.killpg(pid,signal.SIGTERM)
  except ProcessLookupError:pass
 saveids({})
 with (P/'cleanup-private.log').open('w') as log:subprocess.run(['docker','compose','-p',PROJECT,'-f','docker-compose.stabilization.yml','down','--volumes'],cwd=ROOT,env=dict(os.environ,**load()),stdout=log,stderr=subprocess.STDOUT,check=True)
 for name in ['env.json','fixture.json']:
  (P/name).unlink(missing_ok=True)
 for path in P.glob('*private.log'):path.unlink()
 print('Owned processes, disposable containers, private credentials and raw logs removed.')
