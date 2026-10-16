import {assert,fs,path,work,out,fixture,launch,pageFor,api,check,shot,finish,errors,network} from './browser-common.mjs';
const browser=await launch();let error,current;
const stamp=Date.now();let id,customer,admin,oldOperator,newOperator,otherCustomer,opId,newOpId,stationB,uavB,equipmentA,equipmentB;
async function mutation(page,label,suffix,expected=200){
 const pending=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith(suffix)&&r.request().method()==='POST');
 await page.getByRole('button',{name:label,exact:true}).click();const r=await pending;
 assert.equal(r.status(),expected,`${suffix} HTTP ${r.status()}`);const data=await r.json();
 await page.getByText('Đang xử lý…',{exact:true}).waitFor({state:'hidden'});return data;
}
async function snapshot(){return api(admin.token,'GET',`/api/v1/missions/${id}/dispatch-resources`);}
async function form(kind){await admin.page.getByRole('button',{name:kind==='operator'?'Đổi hoặc gỡ người vận hành':'Đổi hoặc gỡ trạm',exact:true}).click();return admin.page.getByRole('form',{name:kind==='operator'?'Điều phối lại người vận hành':'Điều phối lại trạm',exact:true});}
async function equipmentForm(){const s=await snapshot();const r=s.reservations.find(x=>!x.released);assert.ok(r);await admin.page.getByRole('button',{name:`Đổi hoặc hoàn trả khoản giữ ${r.id}`,exact:true}).click();return {s,r,f:admin.page.getByRole('form',{name:'Điều phối lại thiết bị',exact:true})};}
async function assign(label,value,button,endpoint){await admin.page.getByRole('combobox',{name:label,exact:true}).selectOption(String(value));return mutation(admin.page,button,'/'+endpoint);}
try {
 await check('Login actual customer and admin portals',async()=>{
  customer=await pageFor(browser,'customer',3101,'customer','/missions');admin=await pageFor(browser,'admin operations',3102,'admin','/dispatch/missions');current=admin.page;
  const old=await api(admin.token,'GET','/api/v1/missions?size=100');
  for(const m of old.content)if((m.title.startsWith('Điều phối tổng hợp ')||m.title.startsWith('Lịch trùng '))&&['DRAFT','PENDING_CONFIRMATION','CONFIRMED','RESOURCE_RESERVED','READY'].includes(m.status))await api(admin.token,'POST',`/api/v1/missions/${m.id}/cancel`);
 });
 await check('Customer creates and submits mission through UI',async()=>{
  const p=customer.page;current=p;await p.goto('http://localhost:3101/missions/create');
  await p.getByLabel(/^Tiêu đề/).fill('Điều phối tổng hợp '+stamp);await p.getByLabel('Ngày yêu cầu').fill('2027-01-20');
  await p.getByLabel(/^Bắt đầu/).fill('2027-01-20T09:00');await p.getByLabel('Kết thúc dự kiến').fill('2027-01-20T10:00');await p.getByLabel(/^Địa điểm/).fill('Khu vực thử nghiệm Hà Nội');
  await p.getByRole('button',{name:'Kiểm tra & xem lại'}).click();await p.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();await p.waitForURL(/\/missions\/\d+$/);id=Number(new URL(p.url()).pathname.split('/').pop());
  await mutation(p,'Gửi xác nhận','/submit');
 });
 await check('Admin confirms and assigns original resources on UI',async()=>{
  current=admin.page;await admin.page.goto(`http://localhost:3102/missions/${id}`);await mutation(admin.page,'Xác nhận','/confirm');
  const people=await api(admin.token,'GET','/api/v1/users?role=ROLE_OPERATOR&size=100');
  opId=people.content.find(u=>u.username===fixture.users.operator.username).id;newOpId=people.content.find(u=>u.username===fixture.users.operator_b.username).id;
  await assign('Trạm',fixture.stationId,'Gán trạm','assign-station');await assign('UAV',fixture.uavId,'Gán uav','assign-uav');await assign('Người vận hành',opId,'Gán người vận hành','assign-operator');
  await admin.page.getByRole('combobox',{name:'Thiết bị',exact:true}).selectOption(String(fixture.equipmentId));await admin.page.getByLabel('Số lượng giữ',{exact:true}).fill('2');await mutation(admin.page,'Giữ thiết bị','/reserve-equipment');
  oldOperator=await pageFor(browser,'old operator',3102,'operator',`/missions/${id}`);await mutation(oldOperator.page,'Nhận nhiệm vụ','/accept');await admin.page.reload();await mutation(admin.page,'Sẵn sàng','/ready');
 });
 await check('Inventory UI refuses to release stock owned by a mission and explains the correct workflow',async()=>{
  const inventoryPage=await admin.context.newPage();await inventoryPage.goto('http://localhost:3102/inventory');
  await inventoryPage.getByRole('combobox',{name:'Thiết bị',exact:true}).selectOption(String(fixture.equipmentId));await inventoryPage.getByLabel('Thao tác',{exact:true}).selectOption('release');await inventoryPage.getByLabel('Số lượng',{exact:true}).fill('1');
  const response=inventoryPage.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/release')&&r.request().method()==='POST');await inventoryPage.getByRole('button',{name:'Ghi nhận',exact:true}).click();assert.equal((await response).status(),409);
  await inventoryPage.getByText('Thiết bị này đang được giữ cho nhiệm vụ. Hãy mở nhiệm vụ và dùng chức năng hoàn trả thiết bị để tránh sai lệch kho.').waitFor();
  assert.equal((await api(admin.token,'GET',`/api/v1/inventory/equipment/${fixture.equipmentId}`)).reservedQuantity,2);await shot(inventoryPage,'inventory-owned-reservation');await inventoryPage.close();
 });
 await check('Synthetic candidate resources and conflicting schedule setup (supporting API)',async()=>{
  stationB=await api(admin.token,'POST','/api/v1/stations',{code:'DSB-'+stamp,name:'Trạm điều phối B',status:'ACTIVE'},201);
  uavB=await api(admin.token,'POST','/api/v1/uavs',{serialNumber:'DSB-UAV-'+stamp,model:'UAV trạm B',manufacturer:'Synthetic'},201);
  await api(admin.token,'PUT',`/api/v1/uavs/${uavB.id}/station/${stationB.id}`);
  equipmentA=await api(admin.token,'POST','/api/v1/inventory/equipment',{name:'Pin thay thế trạm A',type:'BATTERY',stationId:fixture.stationId},201);
  equipmentB=await api(admin.token,'POST','/api/v1/inventory/equipment',{name:'Camera trạm B',type:'CAMERA',stationId:stationB.id},201);
  for(const e of [equipmentA,equipmentB])await api(admin.token,'POST',`/api/v1/inventory/equipment/${e.id}/stock-in`,{quantity:6,note:'Synthetic fixture'});
 });
 let conflict;
 await check('Operator schedule conflict is visible and blocks UI confirmation',async()=>{
  conflict=await api(customer.token,'POST','/api/v1/missions',{missionType:'AREA_INSPECTION',title:'Lịch trùng '+stamp,requestedDate:'2027-01-20',startTime:'2027-01-20T09:30:00',expectedEndTime:'2027-01-20T10:30:00',locationName:'Synthetic'},201);
  await api(customer.token,'POST',`/api/v1/missions/${conflict.id}/submit`);await api(admin.token,'POST',`/api/v1/missions/${conflict.id}/confirm`);await api(admin.token,'POST',`/api/v1/missions/${conflict.id}/assign-operator`,{resourceId:newOpId,quantity:1});
  await admin.page.reload();const f=await form('operator');await f.getByLabel(/^Người vận hành thay thế/).selectOption(String(newOpId));await f.getByLabel(/^Lý do thay đổi tài nguyên/).fill('Đổi ca vận hành');
  await f.getByText('Người vận hành không khả dụng hoặc đã có lịch trùng. Hãy chọn người khác.').waitFor();assert.equal(await f.getByRole('button',{name:'Xác nhận thay đổi tài nguyên',exact:true}).isDisabled(),true);await shot(admin.page,'operator-schedule-conflict');
 });
 await check('Freed schedule permits replacement and resets ready/acceptance',async()=>{
  await api(admin.token,'POST',`/api/v1/missions/${conflict.id}/cancel`);
  const f=admin.page.getByRole('form',{name:'Điều phối lại người vận hành',exact:true});await f.getByLabel(/^Người vận hành thay thế/).selectOption('');await f.getByLabel(/^Người vận hành thay thế/).selectOption(String(newOpId));await f.getByText('Chưa có lịch trùng. Hệ thống sẽ kiểm tra lại khi xác nhận.').waitFor();
  const result=await mutation(admin.page,'Xác nhận thay đổi tài nguyên','/redispatch-operator');assert.equal(result.operatorId,newOpId);assert.equal(result.operatorAccepted,false);assert.equal(result.status,'RESOURCE_RESERVED');
 });
 await check('Old operator loses access; customer B and operator cannot redispatch (supporting API)',async()=>{
  await oldOperator.page.reload();await oldOperator.page.getByRole('alert').filter({hasText:'Không thể tải nhiệm vụ'}).waitFor();assert.equal(await oldOperator.page.getByRole('button',{name:'Bắt đầu',exact:true}).count(),0);
  otherCustomer=await pageFor(browser,'customer B',3101,'customer_b','/missions');newOperator=await pageFor(browser,'new operator',3102,'operator_b',`/missions/${id}`);
  await api(otherCustomer.token,'GET',`/api/v1/missions/${id}/dispatch-resources`,undefined,403);
  for(const token of [otherCustomer.token,newOperator.token])for(const kind of ['station','operator','equipment'])await api(token,'POST',`/api/v1/missions/${id}/redispatch-${kind}`,{expectedVersion:(await snapshot()).version,replacementId:null,reservationId:(await snapshot()).reservations[0].id,reason:'Denied'},403);
 });
 let stalePage;
 await check('Stale second tab cannot overwrite assignment after equipment quantity change',async()=>{
  stalePage=await admin.context.newPage();await stalePage.goto(`http://localhost:3102/missions/${id}`);await stalePage.getByRole('button',{name:'Đổi hoặc gỡ người vận hành',exact:true}).click();
  const staleForm=stalePage.getByRole('form',{name:'Điều phối lại người vận hành',exact:true});await staleForm.getByLabel(/^Người vận hành thay thế/).selectOption(String(opId));await staleForm.getByLabel(/^Lý do thay đổi tài nguyên/).fill('Màn hình cũ');await staleForm.getByText('Chưa có lịch trùng. Hệ thống sẽ kiểm tra lại khi xác nhận.').waitFor();
  const {f}=await equipmentForm();await f.getByLabel(/^Thiết bị thay thế/).selectOption(String(fixture.equipmentId));await f.getByLabel(/^Số lượng mới/).fill('1');await f.getByLabel(/^Lý do thay đổi tài nguyên/).fill('r'.repeat(500));await mutation(admin.page,'Xác nhận thay đổi tài nguyên','/redispatch-equipment');
  await mutation(stalePage,'Xác nhận thay đổi tài nguyên','/redispatch-operator',409);await stalePage.getByRole('alert').filter({hasText:'Phân công đã thay đổi'}).waitFor();assert.equal((await snapshot()).operatorId,newOpId);assert.equal((await api(admin.token,'GET',`/api/v1/inventory/equipment/${fixture.equipmentId}`)).reservedQuantity,1);
 });
 await check('Lost response reloads committed equipment balance and old request cannot duplicate return',async()=>{
  const {s,r,f}=await equipmentForm();await f.getByLabel(/^Thiết bị thay thế/).selectOption(String(fixture.equipmentId));await f.getByLabel(/^Số lượng mới/).fill('3');await f.getByLabel(/^Lý do thay đổi tài nguyên/).fill('Tăng thiết bị sau kiểm tra');
  let intercepted=false;
  await admin.page.route(`**/api/v1/missions/${id}/redispatch-equipment`,async route=>{if(route.request().method()==='POST'&&!intercepted){intercepted=true;const response=await route.fetch();assert.equal(response.status(),200);await route.abort('failed');}else await route.continue();});
  await f.getByRole('button',{name:'Xác nhận thay đổi tài nguyên',exact:true}).click();await admin.page.getByRole('alert').filter({hasText:'Chưa xác nhận được kết quả'}).waitFor();await admin.page.getByText('Đang xử lý…',{exact:true}).waitFor({state:'hidden'});await admin.page.unroute(`**/api/v1/missions/${id}/redispatch-equipment`);
  assert.ok(intercepted);assert.equal((await api(admin.token,'GET',`/api/v1/inventory/equipment/${fixture.equipmentId}`)).reservedQuantity,3);
  await api(admin.token,'POST',`/api/v1/missions/${id}/redispatch-equipment`,{expectedVersion:s.version,reservationId:r.id,replacementId:fixture.equipmentId,quantity:3,reason:'Tăng thiết bị sau kiểm tra'},409);
 });
 await check('Equipment replacement returns old stock atomically; mobile form remains usable',async()=>{
  const {f}=await equipmentForm();await f.getByLabel(/^Thiết bị thay thế/).selectOption(String(equipmentA.id));await f.getByLabel(/^Số lượng mới/).fill('2');await f.getByLabel(/^Lý do thay đổi tài nguyên/).fill('Đổi sang pin dự phòng');
  await admin.page.setViewportSize({width:375,height:812});await f.scrollIntoViewIfNeeded();assert.equal(await admin.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await shot(admin.page,'equipment-change-mobile');
  await mutation(admin.page,'Xác nhận thay đổi tài nguyên','/redispatch-equipment');assert.equal((await api(admin.token,'GET',`/api/v1/inventory/equipment/${fixture.equipmentId}`)).reservedQuantity,0);assert.equal((await api(admin.token,'GET',`/api/v1/inventory/equipment/${equipmentA.id}`)).reservedQuantity,2);await admin.page.setViewportSize({width:1440,height:1000});
 });
 await check('Station change rejects incompatible held equipment without releasing it',async()=>{
  const f=await form('station');await f.getByLabel(/^Trạm thay thế/).selectOption(String(stationB.id));await f.getByLabel(/^Lý do thay đổi tài nguyên/).fill('Đổi trạm điều phối');await mutation(admin.page,'Xác nhận thay đổi tài nguyên','/redispatch-station',409);await admin.page.getByRole('alert').filter({hasText:'Tài nguyên không cùng trạm'}).waitFor();assert.equal((await snapshot()).stationId,fixture.stationId);assert.equal((await api(admin.token,'GET',`/api/v1/inventory/equipment/${equipmentA.id}`)).reservedQuantity,2);
 });
 await check('Explicit equipment return and UAV unassign allow changing station',async()=>{
  const {s,r,f}=await equipmentForm();await f.getByLabel(/^Lý do thay đổi tài nguyên/).fill('Hoàn trả để đổi trạm');await mutation(admin.page,'Xác nhận hoàn trả thiết bị','/redispatch-equipment');
  await api(admin.token,'POST',`/api/v1/missions/${id}/redispatch-equipment`,{expectedVersion:s.version,reservationId:r.id,replacementId:null,quantity:null,reason:'Hoàn trả để đổi trạm'},409);
  await admin.page.getByRole('button',{name:'Gỡ UAV khỏi nhiệm vụ',exact:true}).click();await admin.page.getByLabel(/^Lý do điều phối lại/).fill('Đổi sang UAV trạm B');await mutation(admin.page,'Xác nhận gỡ UAV','/unassign-uav');
  const sf=await form('station');await sf.getByLabel(/^Trạm thay thế/).selectOption(String(stationB.id));await sf.getByLabel(/^Lý do thay đổi tài nguyên/).fill('Đổi trạm sau hoàn trả');const result=await mutation(admin.page,'Xác nhận thay đổi tài nguyên','/redispatch-station');assert.equal(result.stationId,stationB.id);assert.equal(result.operatorId,newOpId);assert.equal(result.status,'CONFIRMED');
 });
 await check('Station removal and reassignment work through UI',async()=>{
  const f=await form('station');await f.getByLabel(/^Lý do thay đổi tài nguyên/).fill('Kiểm tra thao tác gỡ trạm');const result=await mutation(admin.page,'Xác nhận gỡ tài nguyên','/redispatch-station');assert.equal(result.stationId,null);await assign('Trạm',stationB.id,'Gán trạm','assign-station');
 });
 await check('Operator removal releases assignment then original operator can be assigned through UI',async()=>{
  const f=await form('operator');await f.getByLabel(/^Lý do thay đổi tài nguyên/).fill('Điều chỉnh ca lần cuối');assert.equal((await mutation(admin.page,'Xác nhận gỡ tài nguyên','/redispatch-operator')).operatorId,null);await assign('Người vận hành',opId,'Gán người vận hành','assign-operator');
 });
 await check('Reassigned resources reach READY and assigned operator starts on UI',async()=>{
  await assign('UAV',uavB.id,'Gán uav','assign-uav');await admin.page.getByRole('combobox',{name:'Thiết bị',exact:true}).selectOption(String(equipmentB.id));await admin.page.getByLabel('Số lượng giữ',{exact:true}).fill('2');await mutation(admin.page,'Giữ thiết bị','/reserve-equipment');
  await oldOperator.page.reload();await mutation(oldOperator.page,'Nhận nhiệm vụ','/accept');await admin.page.reload();await mutation(admin.page,'Sẵn sàng','/ready');await oldOperator.page.reload();await mutation(oldOperator.page,'Bắt đầu','/start');
 });
 await check('Operator uploads real MinIO media and completes mission; all stock returned once',async()=>{
  const p=oldOperator.page;current=p;const uploaded=p.waitForResponse(r=>new URL(r.url()).pathname===`/api/v1/missions/${id}/media`&&r.request().method()==='POST');
  await p.locator('input[type=file]').setInputFiles({name:'redispatch-result.txt',mimeType:'text/plain',buffer:Buffer.from('Synthetic resource redispatch result')});assert.equal((await uploaded).status(),201);await p.getByText('redispatch-result.txt',{exact:true}).waitFor();
  await p.getByRole('button',{name:'Hoàn tất',exact:true}).click();await p.getByLabel(/^Tình trạng thiết bị khi hoàn trả/).fill('Đủ số lượng, nguyên vẹn');await mutation(p,'Xác nhận hoàn tất','/complete');
  for(const e of [fixture.equipmentId,equipmentA.id,equipmentB.id])assert.equal((await api(admin.token,'GET',`/api/v1/inventory/equipment/${e}`)).reservedQuantity,0);
  await p.locator('[data-status=COMPLETED]').waitFor();assert.equal(await p.getByRole('button',{name:'Đổi hoặc gỡ người vận hành',exact:true}).count(),0);await shot(p,'mission-completed-redispatch');
 });
 await check('Customer sees redispatch timeline and downloads actual result',async()=>{
  current=customer.page;await customer.page.reload();await customer.page.getByText('redispatch-result.txt',{exact:false}).waitFor();await customer.page.getByRole('button',{name:/Xem toàn bộ/}).click();assert.ok(await customer.page.locator('.timeline-item').count()>12);await customer.page.getByText('Thay người vận hành',{exact:true}).waitFor();await customer.page.getByText('Đổi ca vận hành',{exact:true}).waitFor();
  const popup=customer.context.waitForEvent('page');await customer.page.getByRole('button',{name:'Tải xuống',exact:true}).click();const download=await popup;await download.waitForLoadState();assert.ok((await download.locator('body').innerText()).includes('Synthetic resource redispatch result'));await download.close();await shot(customer.page,'customer-timeline-result');
 });
 await check('Admin audit UI contains redispatch history',async()=>{
  const portal=await pageFor(browser,'admin audit',3103,'admin','/audit-logs');current=portal.page;await portal.page.getByRole('heading',{name:'Nhật ký quản trị',exact:true}).waitFor();await portal.page.locator('tbody tr').first().waitFor();assert.ok(await portal.page.locator('tbody tr').count()>0);await portal.page.getByLabel('Tìm trong trang hiện tại').fill('Hoàn tất');await portal.page.getByRole('row').filter({hasText:'Hoàn tất'}).first().waitFor();await shot(portal.page,'admin-audit');
  const events=await api(admin.token,'GET',`/api/v1/missions/${id}/timeline`);for(const type of ['OPERATOR_REPLACED','OPERATOR_UNASSIGNED','STATION_REPLACED','STATION_UNASSIGNED','EQUIPMENT_CHANGED','EQUIPMENT_RELEASED'])assert.ok(events.some(e=>e.eventType===type),type);
 });
 await check('HTTP validation rejects missing revision, overlong reason and negative quantity',async()=>{
  for(const body of [{replacementId:null,reason:'x'},{expectedVersion:0,replacementId:null,reason:'x'.repeat(501)}])await api(admin.token,'POST',`/api/v1/missions/${id}/redispatch-operator`,body,400);
  await api(admin.token,'POST',`/api/v1/missions/${id}/redispatch-equipment`,{expectedVersion:0,reservationId:1,replacementId:1,quantity:-1,reason:'invalid'},400);
 });
 await check('Public portal renders and browser has no JS exceptions or API 5xx',async()=>{
  const p=await browser.newPage();await p.goto('http://localhost:3100');assert.ok((await p.locator('body').innerText()).length>100);assert.ok((await p.title()).length>0);assert.deepEqual(errors,[]);assert.deepEqual(network.filter(r=>r.status>=500),[]);await p.close();
 });
 await fs.writeFile(path.join(work,'browser-mission.json'),JSON.stringify({missionId:id}));
} catch(e){error=e; if(current)await shot(current,'redispatch-failure').catch(()=>{});process.exitCode=1;}
finally{await finish('browser-redispatch',error);await browser.close();}
