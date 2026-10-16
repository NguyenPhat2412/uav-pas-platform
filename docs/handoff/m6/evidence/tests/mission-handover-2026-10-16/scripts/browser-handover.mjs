import {assert,fs,path,work,out,fixture,launch,pageFor,api,check,shot,finish,errors,network} from './browser-common.mjs';
const browser=await launch();let error,current,id,customer,admin,operator,otherCustomer,otherOperator;
const stamp=Date.now();const note='Đã kiểm tra khu vực và bàn giao kết quả khảo sát.';const condition='Đủ thiết bị, nguyên vẹn, pin đã kiểm tra.';
let uploadUrl,mediaId;
async function mutation(page,label,suffix,expected=200){
 const pending=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith(suffix)&&r.request().method()==='POST');
 await page.getByRole('button',{name:label,exact:true}).click();const r=await pending;
 assert.equal(r.status(),expected,`${suffix} HTTP ${r.status()}`);const data=await r.json();
 await page.getByText('Đang xử lý…',{exact:true}).waitFor({state:'hidden'});return data;
}
async function assign(label,value,button,endpoint){await admin.page.getByRole('combobox',{name:label,exact:true}).selectOption(String(value));return mutation(admin.page,button,'/'+endpoint);}
async function upload(name,role='OUTPUT'){
 const p=operator.page;await p.getByRole('combobox',{name:'Vai trò tệp',exact:true}).selectOption(role);
 const signed=p.waitForResponse(r=>new URL(r.url()).pathname===`/api/v1/missions/${id}/media/upload-url`&&r.request().method()==='POST');
 const attached=p.waitForResponse(r=>new URL(r.url()).pathname===`/api/v1/missions/${id}/media`&&r.request().method()==='POST');
 await p.locator('input[type=file]').setInputFiles({name,mimeType:'text/plain',buffer:Buffer.from('Synthetic handover result '+name)});
 const signedData=await (await signed).json();uploadUrl=signedData.url;mediaId=signedData.mediaId;
 assert.equal((await attached).status(),201);await p.getByText(name,{exact:true}).waitFor();return signedData;
}
async function downloadResult(session,name){
 const row=session.page.locator('.mission-file').filter({hasText:name});const popup=session.context.waitForEvent('page');
 await row.getByRole('button',{name:'Tải xuống',exact:true}).click();const p=await popup;await p.waitForLoadState();
 assert.ok((await p.locator('body').innerText()).includes('Synthetic handover result '+name));await p.close();
}
try {
 await check('Real Customer, Operations admin and operator login',async()=>{
  customer=await pageFor(browser,'Customer A',3101,'customer','/missions');admin=await pageFor(browser,'Dispatcher',3102,'admin','/dispatch/missions');
  operator=await pageFor(browser,'Assigned operator',3102,'operator','/assigned-missions');current=customer.page;
 });
 await check('Customer creates AREA_INSPECTION and submits through UI',async()=>{
  const p=customer.page;await p.goto('http://localhost:3101/missions/create');await p.locator('#mission-missionType').selectOption('AREA_INSPECTION');
  await p.getByLabel(/^Tiêu đề/).fill('Kiểm tra bàn giao '+stamp);await p.getByLabel('Ngày yêu cầu').fill('2027-02-10');
  await p.getByLabel(/^Bắt đầu/).fill('2027-02-10T09:00');await p.getByLabel('Kết thúc dự kiến').fill('2027-02-10T10:00');await p.getByLabel(/^Địa điểm/).fill('Khu vực thử nghiệm Hà Nội');
  await p.getByRole('button',{name:'Kiểm tra & xem lại'}).click();await p.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();await p.waitForURL(/\/missions\/\d+$/);id=Number(new URL(p.url()).pathname.split('/').pop());await mutation(p,'Gửi xác nhận','/submit');
 });
 await check('Dispatcher confirms and assigns resources; ready is unavailable until acceptance',async()=>{
  current=admin.page;await admin.page.goto(`http://localhost:3102/missions/${id}`);await mutation(admin.page,'Xác nhận','/confirm');
  await assign('Trạm',fixture.stationId,'Gán trạm','assign-station');await assign('UAV',fixture.uavId,'Gán uav','assign-uav');await assign('Người vận hành',operator.user.id,'Gán người vận hành','assign-operator');
  await admin.page.getByRole('combobox',{name:'Thiết bị',exact:true}).selectOption(String(fixture.equipmentId));await admin.page.getByLabel('Số lượng giữ',{exact:true}).fill('2');await mutation(admin.page,'Giữ thiết bị','/reserve-equipment');
  await admin.page.getByText('Chờ người vận hành tiếp nhận',{exact:true}).waitFor();assert.equal(await admin.page.getByRole('button',{name:'Sẵn sàng',exact:true}).count(),0);
  await api(admin.token,'POST',`/api/v1/missions/${id}/ready`,undefined,409);
  await operator.page.goto(`http://localhost:3102/missions/${id}`);await operator.page.getByRole('button',{name:'Nhận nhiệm vụ',exact:true}).waitFor();await shot(admin.page,'awaiting-acceptance');
 });
 await check('Old operator tab cannot accept a changed equipment assignment',async()=>{
  const old=await api(operator.token,'GET',`/api/v1/missions/${id}`);
  await admin.page.getByRole('button',{name:/Đổi hoặc hoàn trả khoản giữ/}).first().click();const f=admin.page.getByRole('form',{name:'Điều phối lại thiết bị',exact:true});
  await f.getByLabel(/^Thiết bị thay thế/).selectOption(String(fixture.equipmentId));await f.getByLabel(/^Số lượng mới/).fill('3');await f.getByLabel(/^Lý do thay đổi tài nguyên/).fill('Bổ sung thiết bị trước khi tiếp nhận');await mutation(admin.page,'Xác nhận thay đổi tài nguyên','/redispatch-equipment');
  current=operator.page;await mutation(operator.page,'Nhận nhiệm vụ','/accept',409);await operator.page.getByRole('alert').filter({hasText:'Phân công đã thay đổi'}).waitFor();
  const latest=await api(operator.token,'GET',`/api/v1/missions/${id}`);assert.ok(latest.version>old.version);assert.equal(latest.operatorAccepted,false);await shot(operator.page,'stale-acceptance');
  await mutation(operator.page,'Nhận nhiệm vụ','/accept');await admin.page.reload();await mutation(admin.page,'Sẵn sàng','/ready');
 });
 await check('Conflict after ready returns to preparation; reaccept and ready are required',async()=>{
  current=operator.page;await operator.page.reload();await operator.page.getByRole('button',{name:'Báo vướng mắc',exact:true}).click();await operator.page.getByLabel('Lý do / vướng mắc').fill('Cần kiểm tra pin lần cuối');await mutation(operator.page,'Xác nhận báo vướng mắc','/report-conflict');
  assert.equal((await api(operator.token,'GET',`/api/v1/missions/${id}`)).status,'RESOURCE_RESERVED');assert.equal(await operator.page.getByRole('button',{name:'Bắt đầu',exact:true}).count(),0);
  await api(operator.token,'POST',`/api/v1/missions/${id}/start`,undefined,409);await mutation(operator.page,'Nhận nhiệm vụ','/accept');await admin.page.reload();await mutation(admin.page,'Sẵn sàng','/ready');
  await operator.page.reload();await mutation(operator.page,'Bắt đầu','/start');
 });
 await check('Completion form requires both notes and a real handover result; mobile has no overflow',async()=>{
  const p=operator.page;current=p;await p.getByRole('button',{name:'Hoàn tất',exact:true}).click();const form=p.getByRole('form',{name:'Hoàn tất nhiệm vụ',exact:true});
  assert.equal(await form.getByRole('button',{name:'Xác nhận hoàn tất',exact:true}).isDisabled(),true);
  await form.getByLabel(/^Ghi chú kết quả/).fill(note);await form.getByLabel(/^Tình trạng thiết bị khi hoàn trả/).fill(condition);assert.equal(await form.getByRole('button',{name:'Xác nhận hoàn tất',exact:true}).isDisabled(),true);
  await api(operator.token,'POST',`/api/v1/missions/${id}/complete`,{completionNote:note,equipmentCondition:condition},409);
  await p.setViewportSize({width:375,height:812});await form.scrollIntoViewIfNeeded();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await shot(p,'missing-handover-mobile');await p.setViewportSize({width:1440,height:1000});
 });
 await check('Raw flight data uploads to MinIO but does not substitute for handover evidence',async()=>{
  await upload('flight-data.txt','FLIGHT_DATA');const form=operator.page.getByRole('form',{name:'Hoàn tất nhiệm vụ',exact:true});
  assert.equal(await form.getByRole('button',{name:'Xác nhận hoàn tất',exact:true}).isDisabled(),true);assert.equal(await form.getByLabel(/^Ghi chú kết quả/).inputValue(),note);
 });
 await check('A failed browser upload preserves authored completion notes and can recover',async()=>{
  const p=operator.page;await p.route('http://127.0.0.1:9014/**',async route=>{if(route.request().method()==='PUT')await route.abort('failed');else await route.continue();});
  await p.locator('input[type=file]').setInputFiles({name:'interrupted-result.txt',mimeType:'text/plain',buffer:Buffer.from('Synthetic interrupted upload')});
  await p.getByRole('alert').filter({hasText:'Chưa xác nhận được việc gắn tệp'}).waitFor();await p.unroute('http://127.0.0.1:9014/**');
  assert.equal(await p.getByRole('form',{name:'Hoàn tất nhiệm vụ',exact:true}).getByLabel(/^Ghi chú kết quả/).inputValue(),note);
  assert.equal((await api(operator.token,'GET',`/api/v1/missions/${id}/media`)).length,1);
 });
 await check('Operator uploads a report, downloads it and completes; stock returns exactly once',async()=>{
  const p=operator.page;await upload('handover-report.txt','DOCUMENT');await downloadResult(operator,'handover-report.txt');
  const form=p.getByRole('form',{name:'Hoàn tất nhiệm vụ',exact:true});assert.equal(await form.getByRole('button',{name:'Xác nhận hoàn tất',exact:true}).isEnabled(),true);
  await form.scrollIntoViewIfNeeded();await shot(p,'handover-ready');await mutation(p,'Xác nhận hoàn tất','/complete');await p.locator('[data-status=COMPLETED]').waitFor();
  assert.equal((await api(admin.token,'GET',`/api/v1/inventory/equipment/${fixture.equipmentId}`)).reservedQuantity,0);
  assert.equal(await p.locator('input[type=file]').count(),0);await api(operator.token,'POST',`/api/v1/missions/${id}/complete`,{completionNote:note,equipmentCondition:condition},409);
  await shot(p,'operator-completed');
 });
 await check('Replaying signed upload cannot overwrite the delivered object',async()=>{
  let r=await fetch(uploadUrl,{method:'PUT',headers:{'Content-Type':'text/plain','If-None-Match':'*'},body:'tampered'});assert.equal(r.status,412);
  r=await fetch(uploadUrl,{method:'PUT',headers:{'Content-Type':'text/plain'},body:'tampered'});assert.ok(r.status>=400&&r.status<500);
  await api(operator.token,'POST',`/api/v1/missions/${id}/media/upload-url`,{originalName:'late.txt',contentType:'text/plain',size:4,type:'DOCUMENT'},409);
  await api(admin.token,'DELETE',`/api/v1/media/${mediaId}`,undefined,409);await downloadResult(operator,'handover-report.txt');
 });
 await check('Customer sees handover notes, equipment condition, timeline and actual downloadable result',async()=>{
  const p=customer.page;current=p;await p.reload();await p.getByRole('heading',{name:'Kết quả bàn giao',exact:true}).waitFor();assert.ok(await p.getByText(note,{exact:true}).count()>0);await p.getByText(condition,{exact:true}).waitFor();await downloadResult(customer,'handover-report.txt');
  await p.getByRole('heading',{name:'Kết quả bàn giao',exact:true}).scrollIntoViewIfNeeded();await shot(p,'customer-handover');await p.setViewportSize({width:375,height:812});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await shot(p,'customer-handover-mobile');
 });
 await check('Another customer and unassigned operator cannot read mission, timeline, files or download',async()=>{
  otherCustomer=await pageFor(browser,'Customer B',3101,'customer_b','/missions');otherOperator=await pageFor(browser,'Unassigned operator',3102,'operator_b','/assigned-missions');
  for(const session of [otherCustomer,otherOperator]){for(const suffix of ['', '/timeline','/media'])await api(session.token,'GET',`/api/v1/missions/${id}${suffix}`,undefined,403);await api(session.token,'GET',`/api/v1/media/${mediaId}/download-url`,undefined,403);}
  current=otherCustomer.page;await otherCustomer.page.goto(`http://localhost:3101/missions/${id}`);await otherCustomer.page.getByRole('alert').filter({hasText:'không thuộc tài khoản'}).waitFor();assert.equal(await otherCustomer.page.getByText('handover-report.txt',{exact:true}).count(),0);
 });
 await check('Admin audit includes acceptance, conflict and completion; no unexpected runtime failure',async()=>{
  const portal=await pageFor(browser,'Admin audit',3103,'admin','/audit-logs');current=portal.page;await portal.page.getByRole('heading',{name:'Nhật ký quản trị',exact:true}).waitFor();await portal.page.locator('tbody tr').first().waitFor();await portal.page.getByLabel('Tìm trong trang hiện tại').fill('Hoàn tất');await portal.page.getByRole('row').filter({hasText:'Hoàn tất'}).first().waitFor();await shot(portal.page,'handover-audit');
  const timeline=await api(operator.token,'GET',`/api/v1/missions/${id}/timeline`);for(const type of ['OPERATOR_ACCEPTED','OPERATOR_CONFLICT','COMPLETED','MEDIA_ATTACHED'])assert.ok(timeline.some(e=>e.eventType===type));
  assert.equal(timeline.filter(e=>e.eventType==='COMPLETED').length,1);assert.deepEqual(errors,[]);assert.deepEqual(network.filter(r=>r.status>=500),[]);
 });
 await fs.writeFile(path.join(work,'browser-mission.json'),JSON.stringify({missionId:id}));
} catch(e){error=e;if(current)await shot(current,'handover-failure').catch(()=>{});process.exitCode=1;}
finally{await finish('browser-handover',error);await browser.close();}
