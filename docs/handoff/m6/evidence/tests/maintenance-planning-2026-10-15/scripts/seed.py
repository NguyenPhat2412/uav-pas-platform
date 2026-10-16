# Synthetic fixture setup only; no mission workflow is performed here.
import json,secrets,urllib.request,subprocess,pathlib,os
p=pathlib.Path(os.environ['UAV_BROWSER_WORK'])
p.mkdir(parents=True,exist_ok=True);p.chmod(0o700)
container=os.environ['UAV_BROWSER_POSTGRES_CONTAINER']
project=subprocess.check_output(['docker','inspect','--format','{{index .Config.Labels \"com.docker.compose.project\"}}',container],text=True).strip()
assert project == 'uav-maint-planning-20261015', 'Only the owned disposable maintenance stack is allowed'
base='http://127.0.0.1:18080'
password=secrets.token_urlsafe(24)
suffix=secrets.token_hex(3)
def api(path,body=None,token=None):
 headers={'Content-Type':'application/json'}
 if token: headers['Authorization']='Bearer '+token
 req=urllib.request.Request(base+path,data=json.dumps(body).encode() if body is not None else None,headers=headers)
 with urllib.request.urlopen(req) as r:
  data=json.load(r)
  return data.get('data',data) if isinstance(data,dict) else data
users={}
for role in ['customer','customer_b','operator','operator_b','admin']:
 username='ui_'+role+'_'+suffix
 result=api('/api/v1/auth/register',{'username':username,'email':username+'@example.invalid','password':password,'phoneNumber':'09'+str(secrets.randbelow(100000000)).zfill(8)})
 users[role]={'username':username}
subprocess.run(['docker','exec','-i',container,'psql','-U','uav_test','-d','uav_stabilization','-v','ON_ERROR_STOP=1'],input=f"UPDATE users SET role='ROLE_ADMIN' WHERE username='{users['admin']['username']}'; UPDATE users SET role='ROLE_OPERATOR' WHERE username IN ('{users['operator']['username']}', '{users['operator_b']['username']}');",text=True,stdout=subprocess.DEVNULL,check=True)
auth=api('/api/v1/auth/login',{'usernameOrEmail':users['admin']['username'],'password':password})
token=auth['token'] if 'token' in auth else auth['accessToken']
station=api('/api/v1/stations',{'code':'UI-STATION-'+suffix,'name':'UI Test Station','address':'Synthetic location','status':'ACTIVE'},token)
uav=api('/api/v1/uavs',{'serialNumber':'UI-UAV-'+suffix,'model':'Synthetic UAV','manufacturer':'Test'},token)
equip=api('/api/v1/inventory/equipment',{'name':'UI Test Camera','type':'CAMERA','serialNumber':'UI-CAMERA-'+suffix,'stationId':station['id']},token)
api('/api/v1/inventory/equipment/'+str(equip['id'])+'/stock-in',{'quantity':5,'note':'Synthetic browser fixture'},token)
services=api('/api/v1/uav-services',token=token)
fixture={'base':base,'password':password,'users':users,'stationId':station['id'],'uavId':uav['id'],'equipmentId':equip['id'],'services':services}
(p/'fixture.json').write_text(json.dumps(fixture));(p/'fixture.json').chmod(0o600)
print('Synthetic users and resources ready; service names:',[(s['code'],s['name']) for s in services])
