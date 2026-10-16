import {assert,fs,path,work,out,fixture,launch,pageFor,api,check,shot,finish,errors,network,observe} from './browser-common.mjs';
const browser=await launch();let error,current,customer,outsider,tabB,id;
const stamp=Date.now();const date=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
const inputs={requestedDate:date,startTime:`${date}T10:00`,expectedEndTime:`${date}T11:30`,locationName:'Khu khảo sát thử nghiệm Hà Nội',description:'Dữ liệu tổng hợp kiểm tra bản nháp',notes:'Ghi chú thử nghiệm — không có thông tin cá nhân'};
const endpoint=()=>`/api/v1/missions/${id}`;
async function fields(page,title){await page.locator('#mission-title').fill(title);for(const [key,value] of Object.entries(inputs))await page.locator(`#mission-${key}`).fill(value);}
async function mutation(page,label,method,url,expected=200){
 const response=page.waitForResponse(r=>new URL(r.url()).pathname===url&&r.request().method()===method);
 await page.getByRole('button',{name:label,exact:true}).click();const r=await response;assert.equal(r.status(),expected,`${method} ${url} returned ${r.status()}`);return r.json();
}
async function read(){return api(customer.token,'GET',endpoint());}
async function events(){return api(customer.token,'GET',endpoint()+'/timeline');}
async function editPage(page,missionId=id){await page.goto(`http://localhost:3101/missions/${missionId}/edit`);await page.getByRole('heading',{name:'Chỉnh sửa bản nháp',exact:true}).waitFor();await page.locator('#mission-title').waitFor();}
async function createThroughUi(page,title){
 await page.goto('http://localhost:3101/missions/create');await fields(page,title);
 await page.getByRole('button',{name:'Kiểm tra & xem lại',exact:true}).click();await page.getByRole('button',{name:'Lưu bản nháp',exact:true}).waitFor();
 const created=await mutation(page,'Lưu bản nháp','POST','/api/v1/missions',201);await page.waitForURL(`**/missions/${created.id}`);return created;
}
try{
 await check('Protected create route redirects anonymous browser to login',async()=>{
  const c=await browser.newContext();const p=await c.newPage();await p.goto('http://localhost:3101/missions/create');await p.waitForURL(/\/login/);await p.locator('input[type=password]').waitFor();await c.close();
 });
 await check('Customer login and create form: invalid data stays editable and sends no create request',async()=>{
  customer=await pageFor(browser,'customer A',3101,'customer','/missions/create');current=customer.page;
  const p=customer.page;await fields(p,'   ');await p.locator('#mission-expectedEndTime').fill(`${date}T09:00`);
  const before=network.filter(r=>r.method==='POST'&&r.path==='/api/v1/missions').length;
  await p.getByRole('button',{name:'Kiểm tra & xem lại',exact:true}).click();await p.locator('#mission-error-summary').waitFor();
  assert.ok((await p.locator('#mission-error-summary').innerText()).includes('Tiêu đề')||(await p.locator('#mission-error-summary').innerText()).includes('tiêu đề'));
  assert.equal(network.filter(r=>r.method==='POST'&&r.path==='/api/v1/missions').length,before);
  assert.equal(await p.locator('#mission-description').inputValue(),inputs.description);
 });
 await check('Review, go back, create once and show correct draft details',async()=>{
  const p=customer.page;await fields(p,`Bản nháp an toàn ${stamp}`);
  await p.getByRole('button',{name:'Kiểm tra & xem lại',exact:true}).click();await p.getByRole('button',{name:'Lưu bản nháp',exact:true}).waitFor();
  await p.getByRole('button',{name:'Chỉnh sửa',exact:true}).click();assert.equal(await p.locator('#mission-notes').inputValue(),inputs.notes);
  await p.getByRole('button',{name:'Kiểm tra & xem lại',exact:true}).click();
  const created=await mutation(p,'Lưu bản nháp','POST','/api/v1/missions',201);id=created.id;assert.equal(created.version,0);assert.equal(created.status,'DRAFT');
  await p.waitForURL(`**/missions/${id}`);await p.getByRole('link',{name:'Chỉnh sửa bản nháp',exact:true}).waitFor();
  const stored=await read();assert.equal(stored.startTime,inputs.startTime+':00');assert.equal(stored.notes,inputs.notes);
  assert.equal((await events()).filter(e=>e.eventType==='CREATED').length,1);await shot(p,'created-draft-desktop');
 });
 await check('Two tabs: stale edit is rejected; background refresh cannot replace the form version',async()=>{
  const p=customer.page;await editPage(p);
  tabB=await customer.context.newPage();observe(tabB,'customer A tab B');await tabB.clock.install();await editPage(tabB);
  await tabB.locator('#mission-title').fill('Nội dung đang nhập ở tab B');const original=await read();
  await p.locator('#mission-title').fill('Nội dung đã lưu từ tab A');const saved=await mutation(p,'Lưu thay đổi','PATCH',endpoint());assert.equal(saved.version,original.version+1);await p.waitForURL(`**/missions/${id}`);
  // Make React Query's 30-second stale timeout elapse, then simulate returning to the tab.
  await tabB.clock.fastForward(31000);const refreshed=tabB.waitForResponse(r=>new URL(r.url()).pathname===endpoint()&&r.request().method()==='GET');
  await tabB.evaluate(()=>window.dispatchEvent(new Event('visibilitychange')));assert.equal((await refreshed).status(),200);
  assert.equal(await tabB.locator('#mission-title').inputValue(),'Nội dung đang nhập ở tab B');
  const beforeEvents=(await events()).length;
  const request=tabB.waitForRequest(r=>new URL(r.url()).pathname===endpoint()&&r.method()==='PATCH');
  await mutation(tabB,'Lưu thay đổi','PATCH',endpoint(),409);assert.equal((await request).postDataJSON().expectedVersion,original.version);
  await tabB.getByRole('button',{name:'Tải bản nháp mới nhất',exact:true}).waitFor();assert.equal(await tabB.getByRole('button',{name:'Lưu thay đổi',exact:true}).isDisabled(),true);
  assert.equal(await tabB.locator('#mission-title').inputValue(),'Nội dung đang nhập ở tab B');assert.equal((await read()).title,'Nội dung đã lưu từ tab A');assert.equal((await events()).length,beforeEvents);
  current=tabB;await tabB.getByRole('alert').filter({hasText:'Thông tin hoặc trạng thái yêu cầu đã thay đổi'}).scrollIntoViewIfNeeded();await shot(tabB,'stale-draft-conflict-desktop');
 });
 await check('Explicit reload enables a deliberate edit of the newest draft on mobile',async()=>{
  await tabB.setViewportSize({width:375,height:812});assert.equal(await tabB.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await shot(tabB,'stale-draft-conflict-mobile');await tabB.getByRole('button',{name:'Tải bản nháp mới nhất',exact:true}).click();
  await tabB.locator('#mission-title:enabled').waitFor();assert.equal(await tabB.locator('#mission-title').inputValue(),'Nội dung đã lưu từ tab A');
  await tabB.locator('#mission-title').fill('Nội dung mới sau đối chiếu');await mutation(tabB,'Lưu thay đổi','PATCH',endpoint());await tabB.waitForURL(`**/missions/${id}`);
  assert.equal((await read()).title,'Nội dung mới sau đối chiếu');assert.equal(await tabB.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await shot(tabB,'saved-draft-mobile');
  await tabB.setViewportSize({width:1440,height:1000});
 });
 await check('Lost PATCH response: stored edit remains; old version retry cannot create duplicate history',async()=>{
  await editPage(customer.page);current=customer.page;const p=customer.page;await p.locator('#mission-title').fill('Đã lưu dù mất phản hồi');
  const before=(await events()).filter(e=>e.eventType==='UPDATED').length;let intercepted=false;
  await p.route(`**${endpoint()}`,async route=>{if(route.request().method()!=='PATCH')return route.continue();const response=await route.fetch();assert.equal(response.status(),200);intercepted=true;await route.abort('failed');});
  await p.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();await p.getByRole('alert').filter({hasText:'Chưa xác nhận được kết quả lưu'}).waitFor();
  await p.unroute(`**${endpoint()}`);assert.equal(intercepted,true);assert.equal((await read()).title,'Đã lưu dù mất phản hồi');
  await mutation(p,'Lưu thay đổi','PATCH',endpoint(),409);await p.getByRole('button',{name:'Tải bản nháp mới nhất',exact:true}).waitFor();
  assert.equal((await events()).filter(e=>e.eventType==='UPDATED').length,before+1);
  await p.getByRole('button',{name:'Tải bản nháp mới nhất',exact:true}).click();await p.locator('#mission-title:enabled').waitFor();assert.equal(await p.locator('#mission-title').inputValue(),'Đã lưu dù mất phản hồi');
 });
 await check('Another customer cannot read/edit the draft through UI or direct API',async()=>{
  outsider=await pageFor(browser,'customer B',3101,'customer_b',`/missions/${id}/edit`);await outsider.page.getByRole('alert').filter({hasText:'Không thể tải nhiệm vụ'}).waitFor();
  assert.equal(await outsider.page.getByRole('button',{name:'Lưu thay đổi',exact:true}).count(),0);
  const own=await read();await api(outsider.token,'PATCH',endpoint(),{...inputs,title:'Unauthorized overwrite',expectedVersion:own.version},403);assert.equal((await read()).title,own.title);
 });
 await check('Submit from detail changes status; an already-open editor cannot save afterwards',async()=>{
  await editPage(tabB);await tabB.locator('#mission-title').fill('Tab cũ sau gửi');
  await customer.page.goto(`http://localhost:3101/missions/${id}`);current=customer.page;
  const submitted=await mutation(customer.page,'Gửi xác nhận','POST',endpoint()+'/submit');assert.equal(submitted.status,'PENDING_CONFIRMATION');
  await customer.page.getByRole('button',{name:'Gửi xác nhận',exact:true}).waitFor({state:'hidden'});assert.equal(await customer.page.getByRole('link',{name:'Chỉnh sửa bản nháp',exact:true}).count(),0);
  await mutation(tabB,'Lưu thay đổi','PATCH',endpoint(),409);await tabB.getByRole('alert').filter({hasText:'Chỉ bản nháp mới có thể chỉnh sửa'}).waitFor();
  assert.equal((await read()).status,'PENDING_CONFIRMATION');assert.equal((await events()).filter(e=>e.eventType==='SUBMITTED').length,1);
 });
 await check('Cancel confirmation can be dismissed; confirmed cancel updates status and removes actions',async()=>{
  const p=customer.page;await p.getByRole('button',{name:'Hủy yêu cầu',exact:true}).click();await p.getByRole('button',{name:'Giữ yêu cầu',exact:true}).click();assert.equal((await read()).status,'PENDING_CONFIRMATION');
  await p.getByRole('button',{name:'Hủy yêu cầu',exact:true}).click();const cancelled=await mutation(p,'Xác nhận hủy','POST',endpoint()+'/cancel');assert.equal(cancelled.status,'CANCELLED');
  await p.getByRole('button',{name:'Hủy yêu cầu',exact:true}).waitFor({state:'hidden'});assert.equal(await p.getByRole('button',{name:'Gửi xác nhận',exact:true}).count(),0);
  assert.equal((await events()).filter(e=>e.eventType==='CANCELLED').length,1);await shot(p,'cancelled-mission-desktop');
 });
 await check('Direct draft cancellation also blocks a stale editor and repeated cancel',async()=>{
  const draft=await createThroughUi(customer.page,`Bản nháp hủy trực tiếp ${stamp}`);id=draft.id;await editPage(tabB);await tabB.locator('#mission-title').fill('Không được lưu sau hủy');
  await customer.page.getByRole('button',{name:'Hủy yêu cầu',exact:true}).click();await mutation(customer.page,'Xác nhận hủy','POST',endpoint()+'/cancel');
  await mutation(tabB,'Lưu thay đổi','PATCH',endpoint(),409);await tabB.getByRole('alert').filter({hasText:'Chỉ bản nháp mới có thể chỉnh sửa'}).waitFor();
  await api(customer.token,'POST',endpoint()+'/cancel',undefined,409);assert.equal((await read()).title,draft.title);assert.equal((await events()).filter(e=>e.eventType==='CANCELLED').length,1);
 });
 await check('Repeated submit from another tab refreshes the UI without a second state transition',async()=>{
  const draft=await createThroughUi(customer.page,`Bản nháp gửi từ hai tab ${stamp}`);id=draft.id;await tabB.goto(`http://localhost:3101/missions/${id}`);await tabB.getByRole('button',{name:'Gửi xác nhận',exact:true}).waitFor();
  await mutation(customer.page,'Gửi xác nhận','POST',endpoint()+'/submit');await mutation(tabB,'Gửi xác nhận','POST',endpoint()+'/submit',409);
  await tabB.getByRole('button',{name:'Gửi xác nhận',exact:true}).waitFor({state:'hidden'});assert.equal((await events()).filter(e=>e.eventType==='SUBMITTED').length,1);
 });
 await check('Nonexistent backend paths return 404; protected anonymous paths retain 401; UI handles missing mission',async()=>{
  for(const [method,p] of [['GET','/api/v1/route-that-does-not-exist'],['POST',`/api/v1/uavs/${fixture.uavId}/station?stationId=${fixture.stationId}`],['GET','/missing-static-asset.svg']]){
   const body=await api(customer.token,method,p,undefined,404);assert.equal(body.code,'NOT_FOUND');assert.equal(body.status,404);
  }
  const r=await fetch(fixture.base+'/api/v1/route-that-does-not-exist');assert.equal(r.status,401);
  await customer.page.goto('http://localhost:3101/missions/999999999/edit');await customer.page.getByRole('alert').filter({hasText:'Không thể tải nhiệm vụ'}).waitFor();assert.equal(await customer.page.getByRole('button',{name:'Lưu thay đổi',exact:true}).count(),0);
 });
 await check('Rendered pages are nonblank, have no framework overlay or JS exceptions, and no unexpected API 5xx',async()=>{
  for(const p of [customer.page,tabB,outsider.page]){assert.ok((await p.title()).length>0);assert.ok((await p.locator('body').innerText()).length>100);assert.equal(await p.getByText(/Application error:|Unhandled Runtime Error|Build Error/).count(),0);}
  assert.deepEqual(errors,[]);assert.deepEqual(network.filter(r=>r.status>=500),[]);
 });
}catch(e){error=e;if(current)await shot(current,'drafts-failure').catch(()=>{});process.exitCode=1;}
finally{await finish('browser-drafts',error);await browser.close();}
