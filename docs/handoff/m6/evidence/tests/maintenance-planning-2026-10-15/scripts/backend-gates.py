import os,subprocess,json,pathlib,time,xml.etree.ElementTree as ET
root=pathlib.Path('/Volumes/D/Codex/projects/uav-pas-platform');w=root/'work/uav-maintenance-planning-20261015'
e=json.loads((w/'env.json').read_text());env=dict(os.environ)
env.update(UAV_STABILIZATION_DB_URL='jdbc:postgresql://127.0.0.1:55444/uav_ba_test_suite',UAV_STABILIZATION_DB_USER='uav_test',UAV_STABILIZATION_DB_PASSWORD=e['UAV_TEST_DB_PASSWORD'],UAV_STABILIZATION_MINIO_ENDPOINT='http://127.0.0.1:9014',UAV_STABILIZATION_MINIO_USER=e['UAV_TEST_STORAGE_USER'],UAV_STABILIZATION_MINIO_PASSWORD=e['UAV_TEST_STORAGE_PASSWORD'],UAV_STABILIZATION_MINIO_BUCKET='uav-maint-planning-suite')
container='uav-maint-planning-20261015-postgres-1'
assert subprocess.check_output(['docker','inspect','--format','{{index .Config.Labels "com.docker.compose.project"}}',container],text=True).strip()=='uav-maint-planning-20261015'
exists=subprocess.check_output(['docker','exec',container,'psql','-U','uav_test','-d','postgres','-tAc',"SELECT 1 FROM pg_database WHERE datname='uav_ba_test_suite'"],text=True).strip()
if not exists:subprocess.run(['docker','exec',container,'createdb','-U','uav_test','uav_ba_test_suite'],check=True)
start=time.time();target=w/'full-maven-target'
with (w/'backend-suite-private.log').open('w') as log:
 r=subprocess.run(['./mvnw','-Duav.build.directory='+str(target),'test'],cwd=root/'backend',env=env,stdout=log,stderr=subprocess.STDOUT)
suites=[]
for path in (target/'surefire-reports').glob('TEST-*.xml'):
 x=ET.parse(path).getroot();suites.append({'name':x.attrib['name'],**{k:int(x.attrib.get(k,0)) for k in ['tests','failures','errors','skipped']}})
totals={k:sum(s[k] for s in suites) for k in ['tests','failures','errors','skipped']}
result={'status':'PASS' if r.returncode==0 and totals.get('tests',0)>0 and not totals['skipped'] else 'FAIL','command':'./mvnw -Duav.build.directory=<isolated test target> test','exitCode':r.returncode,'seconds':round(time.time()-start,1),'totals':totals,'database':'uav_ba_test_suite','storageBucket':'uav-maint-planning-suite','suites':suites}
(w/'backend-suite-summary.json').write_text(json.dumps(result,indent=2))
(w/'backend-suite-sanitized.log').write_text('\n'.join([result['command'],str(totals)]+[f"{s['name']}: tests={s['tests']} failures={s['failures']} errors={s['errors']} skipped={s['skipped']}" for s in suites]))
print(result['status'],totals,flush=True)
raise SystemExit(r.returncode or (1 if result['status']=='FAIL' else 0))
