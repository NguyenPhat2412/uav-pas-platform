import os,subprocess,json,time,pathlib,sys
root=pathlib.Path('/Volumes/D/Codex/projects/uav-pas-platform');p=root/'work/uav-resource-redispatch-20261016'
scope=sys.argv[1];cwd=root if scope=='root' else root/'frontend'
env=dict(os.environ,PATH='/Users/admin/.nvm/versions/node/v20.20.2/bin:'+os.environ['PATH'],NEXT_PUBLIC_API_URL='http://127.0.0.1:18080',NEXT_TELEMETRY_DISABLED='1')
results=[]
for gate in ['lint','typecheck','test','build']:
 start=time.time()
 with (p/(scope+'-'+gate+'.log')).open('w') as f:r=subprocess.run(['npm','run',gate],cwd=cwd,env=env,stdout=f,stderr=subprocess.STDOUT)
 results.append(dict(gate=gate,status='PASS' if r.returncode==0 else 'FAIL',exitCode=r.returncode,seconds=round(time.time()-start,1)))
 (p/(scope+'-gates.json')).write_text(json.dumps(results,indent=2))
 print(scope,gate,results[-1]['status'],flush=True)
 if r.returncode:sys.exit(r.returncode)
