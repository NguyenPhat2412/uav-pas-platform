from pathlib import Path
import os,json,subprocess,sys,xml.etree.ElementTree as E
r=Path('/Volumes/D/Codex/projects/uav-pas-platform');w=r/'work/uav-auth-concurrency-20261015';e=json.loads((w/'env.json').read_text());env=dict(os.environ)
env.update(UAV_STABILIZATION_DB_URL='jdbc:postgresql://127.0.0.1:55444/uav_auth_test_suite',UAV_STABILIZATION_DB_USER='uav_test',UAV_STABILIZATION_DB_PASSWORD=e['UAV_TEST_DB_PASSWORD'])
c='uav-auth-concurrency-20261015-postgres-1'
assert subprocess.check_output(['docker','inspect','--format','{{index .Config.Labels "com.docker.compose.project"}}',c],text=True).strip()=='uav-auth-concurrency-20261015'
if not subprocess.check_output(['docker','exec',c,'psql','-U','uav_test','-d','postgres','-tAc',"SELECT 1 FROM pg_database WHERE datname='uav_auth_test_suite'"],text=True).strip():subprocess.run(['docker','exec',c,'createdb','-U','uav_test','uav_auth_test_suite'],check=True)
phase=sys.argv[1]; tests=sys.argv[2] if len(sys.argv)>2 else 'AuthConcurrencyPostgresTest'
target=w/('backend-'+phase+'-target')
with (w/('backend-'+phase+'-private.log')).open('w') as log:p=subprocess.run(['./mvnw','-q','-Duav.build.directory='+str(target),'-Dtest='+tests,'test'],cwd=r/'backend',env=env,stdout=log,stderr=subprocess.STDOUT)
suites=[]
for f in (target/'surefire-reports').glob('TEST-*.xml'):
 x=E.parse(f).getroot();suites.append({'name':x.get('name'),**{k:int(x.get(k)) for k in ['tests','failures','errors','skipped']},'cases':[{'name':t.get('name'),'status':'FAIL' if t.find('failure') is not None or t.find('error') is not None else 'PASS'} for t in x.findall('testcase')]})
result={'exitCode':p.returncode,'suites':suites};(w/('backend-'+phase+'-summary.json')).write_text(json.dumps(result,indent=2));print(json.dumps(result));raise SystemExit(p.returncode)
