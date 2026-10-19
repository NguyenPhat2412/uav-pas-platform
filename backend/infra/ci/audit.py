#!/usr/bin/env python3
"""Run production and complete npm audits without suppressions or automatic fixes."""
import argparse,json,pathlib,subprocess,sys
p=argparse.ArgumentParser();p.add_argument('--frontend',type=pathlib.Path,default=pathlib.Path('frontend'));p.add_argument('--output',type=pathlib.Path,required=True);a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
summary=[]
for tree,folder in [('application',a.frontend)]:
    for scope,flags in [('production',['--omit=dev']),('all',[])]:
        cmd=['npm','audit','--json','--audit-level=high']+flags
        result=subprocess.run(cmd,cwd=folder,capture_output=True,text=True,timeout=180)
        try: report=json.loads(result.stdout)
        except ValueError: report={'error':{'code':'AUDIT_INVALID_RESPONSE'}}
        (a.output/f'{tree}-audit-{scope}.json').write_text(json.dumps(report,indent=2)+'\n')
        row={'tree':tree,'scope':scope,'command':' '.join(cmd),'exitCode':result.returncode,'vulnerabilities':report.get('metadata',{}).get('vulnerabilities',{}),'clean':result.returncode==0}
        summary.append(row);print(json.dumps(row),flush=True)
(a.output/'audit-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
# Full audit stays visibly failing when dev findings remain; no risk acceptance is implied.
sys.exit(1 if any(not row['clean'] for row in summary) else 0)
