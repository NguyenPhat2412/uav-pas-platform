#!/usr/bin/env python3
"""Complete Maven suite; expose counts/test identifiers without raw application logs."""
import json,os,pathlib,subprocess,sys,xml.etree.ElementTree as ET
root=pathlib.Path(__file__).resolve().parents[3];work=root/'docs/work/backend-test-private';safe=root/'docs/work/backend-test-safe'
os.umask(0o077);work.mkdir(parents=True,exist_ok=True);safe.mkdir(parents=True,exist_ok=True)
with (work/'maven.log').open('wb') as log:
    result=subprocess.run(['./mvnw','-B','verify'],cwd=root/'backend',stdout=log,stderr=subprocess.STDOUT,timeout=1500)
counts=dict(tests=0,failures=0,errors=0,skipped=0);failed=[]
for file in sorted((root/'backend/target/surefire-reports').glob('TEST-*.xml')):
    suite=ET.parse(file).getroot()
    for key in counts: counts[key]+=int(suite.get(key,0))
    for case in suite.findall('testcase'):
        if case.find('failure') is not None or case.find('error') is not None:
            failed.append({'class':case.get('classname'),'test':case.get('name')})
reasons=[]
if result.returncode: reasons.append('MAVEN_FAILED')
if counts['tests']==0: reasons.append('NO_TESTS_EXECUTED')
if counts['failures']: reasons.append('TEST_FAILURES')
if counts['errors']: reasons.append('TEST_ERRORS')
if counts['skipped']: reasons.append('TESTS_SKIPPED')
exit_code=result.returncode if result.returncode else (1 if reasons else 0)
summary={'command':'./mvnw -B verify','exitCode':exit_code,'mavenExitCode':result.returncode,'failureReasons':reasons,'counts':counts,'failedTests':failed}
(safe/'result.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary))
sys.exit(exit_code)
