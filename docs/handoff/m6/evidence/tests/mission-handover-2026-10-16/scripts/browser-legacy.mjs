import {assert,fs,path,work,fixture,launch,pageFor,api,check,shot,finish,secretValues,network,errors,failed,consoleMessages,safe} from './browser-common.mjs';
const browser=await launch();let error,current,p,id,admin,operatorToken;
try{
 await check('Synthetic API setup and actual legacy operator login',async()=>{
  admin=await pageFor(browser,'Legacy dispatcher fixture',3102,'admin','/dispatch/missions');
  const login=await fetch(fixture.base+'/api/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({usernameOrEmail:fixture.users.customer.username,password:fixture.password})});const c=await login.json();secretValues.add(c.accessToken);secretValues.add(c.refreshToken);
  const m=await api(c.accessToken,'POST','/api/v1/missions',{missionType:'AREA_INSPECTION',title:'Legacy handover '+Date.now(),requestedDate:'2027-03-01',startTime:'2027-03-01T09:00:00',expectedEndTime:'2027-03-01T10:00:00',locationName:'Synthetic location'},201);id=m.id;await api(c.accessToken,'POST',`/api/v1/missions/${id}/submit`);await api(admin.token,'POST',`/api/v1/missions/${id}/confirm`);
  const people=await api(admin.token,'GET','/api/v1/users?role=ROLE_OPERATOR&size=100');const op=people.content.find(x=>x.username===fixture.users.operator.username);
  for(const [name,resourceId] of [['station',fixture.stationId],['uav',fixture.uavId],['operator',op.id]])await api(admin.token,'POST',`/api/v1/missions/${id}/assign-${name}`,{resourceId,quantity:1});await api(admin.token,'POST',`/api/v1/missions/${id}/reserve-equipment`,{resourceId:fixture.equipmentId,quantity:1});
  const ctx=await browser.newContext({viewport:{width:1440,height:1000}});p=await ctx.newPage();current=p;p.setDefaultTimeout(12000);
  p.on('pageerror',e=>errors.push({label:'Legacy operator',message:safe(e.message)}));
  p.on('console',m=>{if(['warning','error'].includes(m.type()))consoleMessages.push({label:'Legacy operator',type:m.type(),message:safe(m.text())});});
  p.on('response',r=>{const u=new URL(r.url());if(u.origin===fixture.base)network.push({label:'Legacy operator',method:r.request().method(),path:u.pathname,status:r.status()});});
  p.on('requestfailed',r=>{if(new URL(r.url()).origin===fixture.base)failed.push({label:'Legacy operator',path:new URL(r.url()).pathname,error:'NETWORK_ERROR'});});
  await p.goto('http://localhost:3100/login');await p.locator('input').first().fill(fixture.users.operator.username);await p.locator('input[type=password]').fill(fixture.password);
  const pending=p.waitForResponse(r=>new URL(r.url()).pathname==='/api/v1/auth/login'&&r.request().method()==='POST');await p.locator('button[type=submit]').click();const session=await(await pending).json();operatorToken=session.accessToken;secretValues.add(session.accessToken);secretValues.add(session.refreshToken);
  await p.waitForURL(u=>u.pathname!='/login');await p.goto(`http://localhost:3100/missions/${id}`);await p.getByRole('button',{name:'Nhận nhiệm vụ',exact:true}).waitFor();
 });
 await check('Legacy stale acceptance refreshes the reviewed version and retry succeeds',async()=>{
  await api(admin.token,'POST',`/api/v1/missions/${id}/reserve-equipment`,{resourceId:fixture.equipmentId,quantity:1});
  async function accept(){const pending=p.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/accept')&&r.request().method()==='POST');await p.getByRole('button',{name:'Nhận nhiệm vụ',exact:true}).click();const result=await pending;await p.getByText('Đang xử lý',{exact:true}).waitFor({state:'hidden'});return result.status();}
  assert.equal(await accept(),409);await shot(p,'legacy-stale-acceptance');assert.equal(await accept(),200);assert.equal((await api(operatorToken,'GET',`/api/v1/missions/${id}`)).operatorAccepted,true);
 });
 await check('Legacy lost acceptance response reloads committed state without duplicate acceptance',async()=>{
  await api(operatorToken,'POST',`/api/v1/missions/${id}/report-conflict?note=Recheck`);await p.reload();await p.getByRole('button',{name:'Nhận nhiệm vụ',exact:true}).waitFor();
  let intercepted=false;await p.route(`**/api/v1/missions/${id}/accept`,async route=>{if(!intercepted){intercepted=true;const r=await route.fetch();assert.equal(r.status(),200);await route.abort('failed');}else await route.continue();});
  await p.getByRole('button',{name:'Nhận nhiệm vụ',exact:true}).click();await p.getByText('Chưa xác nhận được kết quả thao tác.',{exact:false}).waitFor();await p.getByText('Đang xử lý',{exact:true}).waitFor({state:'hidden'});await p.unroute(`**/api/v1/missions/${id}/accept`);
  assert.equal(intercepted,true);assert.equal(await p.getByRole('button',{name:'Nhận nhiệm vụ',exact:true}).count(),0);assert.equal((await api(operatorToken,'GET',`/api/v1/missions/${id}`)).operatorAccepted,true);
 });
 await check('Legacy result upload satisfies new completion gate and authored fields persist',async()=>{
  await api(admin.token,'POST',`/api/v1/missions/${id}/ready`);await p.reload();await p.getByRole('button',{name:'Bắt đầu',exact:true}).click();await p.getByRole('button',{name:'Hoàn tất',exact:true}).waitFor();
  const pending=p.waitForResponse(r=>new URL(r.url()).pathname===`/api/v1/missions/${id}/media`&&r.request().method()==='POST');await p.locator('input[type=file]').setInputFiles({name:'legacy-result.txt',mimeType:'text/plain',buffer:Buffer.from('Synthetic legacy handover')});assert.equal((await pending).status(),201);await p.getByText('legacy-result.txt',{exact:true}).waitFor();
  const files=await api(operatorToken,'GET',`/api/v1/missions/${id}/media`);assert.equal(files[0].mediaRole,'OUTPUT');
  await p.getByRole('button',{name:'Hoàn tất',exact:true}).click();const f=p.getByRole('form',{name:'Hoàn tất nhiệm vụ',exact:true});await f.getByLabel('Ghi chú kết quả').fill('Bàn giao qua giao diện legacy');await f.getByLabel('Tình trạng thiết bị khi hoàn trả').fill('Nguyên vẹn');
  const completed=p.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/complete')&&r.request().method()==='POST');await f.getByRole('button',{name:'Xác nhận hoàn tất',exact:true}).click();assert.equal((await completed).status(),200);assert.equal((await api(operatorToken,'GET',`/api/v1/missions/${id}`)).status,'COMPLETED');await shot(p,'legacy-completed');
 });
assert.equal(errors.length,0);assert.equal(network.filter(x=>x.status>=500).length,0);
}catch(e){error=e;process.exitCode=1;if(current)await shot(current,'legacy-failure').catch(()=>{});}
finally{
 if(id&&admin){const m=await api(admin.token,'GET',`/api/v1/missions/${id}`).catch(()=>null);if(m&&['DRAFT','PENDING_CONFIRMATION','CONFIRMED','RESOURCE_RESERVED','READY'].includes(m.status))await api(admin.token,'POST',`/api/v1/missions/${id}/cancel`).catch(()=>{});}
 await finish('browser-legacy',error);await browser.close();
}
