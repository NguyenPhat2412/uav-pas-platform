/** Opt-in synthetic browser checks. See M6_UI_POLISH_2026_10_15.md for setup.
 * Credentials come from a private fixture; no tokens, storage state or signed URLs are saved.
 */
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const work=process.env.UAV_BROWSER_WORK;
const fixture=JSON.parse(await fs.readFile(`${work}/fixture.json`,'utf8'));
assert.equal(fixture.base, 'http://127.0.0.1:18080', 'Use the disposable local backend only');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const customer=await context.newPage();let current=customer;
const results=[],errors=[],network=[],consoleIssues=[];
const shots=process.env.UAV_BROWSER_SCREENSHOTS;await fs.mkdir(shots,{recursive:true});
async function mutation(p,label,suffix){const response=p.waitForResponse(r=>new URL(r.url()).pathname.endsWith(suffix)&&r.request().method()==='POST');await p.getByRole('button',{name:label,exact:true}).click();const r=await response;assert.ok(r.ok(),`${suffix}: HTTP ${r.status()}`);return r.json();}
async function snapshot(p,name){await p.screenshot({path:`${shots}/${name}.png`,fullPage:true});}
function watch(p){p.on('console',m=>{if(['error','warning'].includes(m.type()))consoleIssues.push({type:m.type(),message:m.text().replace(/https?:\/\/\S+/g,'[URL]')});});p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{const u=new URL(r.url());if(u.port==='18080')network.push({method:r.request().method(),path:u.pathname,status:r.status()});});}
context.setDefaultTimeout(20000);context.setDefaultNavigationTimeout(30000);watch(customer);
async function login(p,port,role){await p.goto(`http://localhost:${port}/login`);await p.waitForLoadState('networkidle');await p.locator('input').first().fill(fixture.users[role].username);await p.locator('input[type=password]').fill(fixture.password);await p.locator('button[type=submit]').click();await p.waitForURL(u=>!u.pathname.includes('login'));await p.getByRole('button',{name:/Đăng xuất/}).waitFor();}
async function check(name,fn){console.log('START',name);await fn();results.push({name,status:'PASS'});console.log('PASS',name);}
try {
await check('customer login',()=>login(customer,3101,'customer'));
await customer.goto('http://localhost:3101/missions/create');

await check('customer creates draft',async()=>{
await customer.getByLabel('Tiêu đề',{exact:true}).fill('Khảo sát khu vực thử nghiệm');
await customer.getByLabel('Ngày yêu cầu').fill('2026-11-20');
await customer.getByLabel('Bắt đầu',{exact:true}).fill('2026-11-20T09:00');
await customer.getByLabel('Kết thúc dự kiến').fill('2026-11-20T10:00');
await customer.getByLabel('Địa điểm',{exact:true}).fill('Khu vực thử nghiệm · Đà Nẵng');
await customer.getByRole('button',{name:'Kiểm tra & xem lại'}).click();
await customer.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();
await customer.waitForURL(/\/missions\/\d+$/);
});
await customer.getByRole('heading',{name:/Khảo sát khu vực thử nghiệm/}).waitFor();
const missionId=Number(new URL(customer.url()).pathname.split('/').pop());
await fs.writeFile(`${work}/mission.json`,JSON.stringify({missionId}));
await check('cancel confirmation can be dismissed without mutation',async()=>{await customer.getByRole('button',{name:'Hủy yêu cầu',exact:true}).click();await customer.getByRole('button',{name:'Giữ yêu cầu',exact:true}).click();assert.equal(await customer.locator('[data-status=DRAFT]').count(),1);assert.equal(network.filter(r=>r.path.endsWith('/cancel')).length,0);});
await check('customer submits',async()=>{const m=await mutation(customer,'Gửi xác nhận','/submit');assert.equal(m.status,'PENDING_CONFIRMATION');await customer.getByRole('button',{name:'Hủy yêu cầu'}).waitFor();});
const admin=await context.newPage();watch(admin);current=admin;
await check('admin login to operations',()=>login(admin,3102,'admin'));
await admin.goto(`http://localhost:3102/missions/${missionId}`);
await check('admin confirms',async()=>{const m=await mutation(admin,'Xác nhận','/confirm');assert.equal(m.status,'CONFIRMED');});
for(const [label,id,button,endpoint] of [['Trạm',fixture.stationId,'Gán trạm','assign-station'],['UAV',fixture.uavId,'Gán uav','assign-uav'],['Người vận hành',null,'Gán người vận hành','assign-operator'],['Thiết bị',fixture.equipmentId,'Gán thiết bị','reserve-equipment']]){
 await check(`admin ${endpoint}`,async()=>{
 const select=admin.getByRole('combobox',{name:label,exact:true});await select.waitFor();
 if(id)await select.selectOption(String(id));else {const option=select.locator('option').filter({hasText:fixture.users.operator.username});await option.waitFor({state:'attached'});await select.selectOption(await option.getAttribute('value'));}
 const m=await mutation(admin,button,'/'+endpoint);if(endpoint==='reserve-equipment')assert.equal(m.status,'RESOURCE_RESERVED');
 });
}
await snapshot(admin,'admin-resources');
const operatorContext=await browser.newContext({viewport:{width:1440,height:1000}});const operator=await operatorContext.newPage();operatorContext.setDefaultTimeout(20000);watch(operator);current=operator;
await check('operator login and scoped overview',async()=>{await login(operator,3102,'operator');await operator.getByText('Tài khoản này không có quyền xem thống kê nhiệm vụ tổng hợp.').waitFor();assert.equal(network.filter(r=>r.path==='/api/v1/dashboard/missions'&&r.status===403).length,0);});
await operator.goto(`http://localhost:3102/missions/${missionId}`);
await check('operator reports a reason before accepting',async()=>{await operator.getByRole('button',{name:'Báo vướng mắc',exact:true}).click();await operator.getByLabel('Lý do / vướng mắc').fill('Cần kiểm tra thời tiết trước khi khởi hành.');const m=await mutation(operator,'Xác nhận báo vướng mắc','/report-conflict');assert.equal(m.operatorAccepted,false);assert.equal(m.operatorConflictNote,'Cần kiểm tra thời tiết trước khi khởi hành.');});
await check('operator accepts',async()=>{const m=await mutation(operator,'Nhận nhiệm vụ','/accept');assert.equal(m.operatorAccepted,true);});
current=admin;await admin.reload();
await check('admin marks ready',async()=>{const m=await mutation(admin,'Sẵn sàng','/ready');assert.equal(m.status,'READY');});
current=operator;await operator.reload();
await check('operator starts',async()=>{const m=await mutation(operator,'Bắt đầu','/start');assert.equal(m.status,'IN_PROGRESS');});
await check('operator uploads media',async()=>{
const response=operator.waitForResponse(r=>new URL(r.url()).pathname===`/api/v1/missions/${missionId}/media`&&r.request().method()==='POST');
await operator.waitForFunction(()=>{const el=document.querySelector('input[type=file]');return el&&!el.disabled;});await operator.locator('input[type=file]').setInputFiles({name:'synthetic-result.txt',mimeType:'text/plain',buffer:Buffer.from('UAV PAS synthetic mission result\n')});
const r=await response;assert.ok(r.ok(),`media attach: HTTP ${r.status()}`);await operator.getByText('synthetic-result.txt',{exact:true}).waitFor();
});
await check('operator completes',async()=>{await operator.getByRole('button',{name:'Hoàn tất',exact:true}).click();const m=await mutation(operator,'Xác nhận hoàn tất','/complete');assert.equal(m.status,'COMPLETED');});
await check('terminal mission hides mutations',async()=>{await operator.locator('[data-status=COMPLETED]').waitFor();for(const label of ['Nhận nhiệm vụ','Báo vướng mắc','Bắt đầu','Hoàn tất','Sẵn sàng','Hủy nhiệm vụ'])assert.equal(await operator.getByRole('button',{name:label,exact:true}).count(),0);assert.equal(await operator.locator('input[type=file]').count(),0);});await snapshot(operator,'operator-completed');
current=customer;await customer.reload();
await check('customer sees result and timeline',async()=>{await customer.getByText('synthetic-result.txt',{exact:false}).waitFor();assert.equal(await customer.locator('.timeline-item').count(),4);await customer.getByRole('button',{name:/Xem toàn bộ/}).click();assert.ok(await customer.locator('.timeline-item').count()>=8);await customer.getByRole('button',{name:'Thu gọn lịch sử'}).click();assert.equal(await customer.locator('.timeline-item').count(),4);assert.equal(await customer.getByRole('button',{name:'Hủy yêu cầu'}).count(),0);});
await snapshot(customer,'customer-completed');
await check('customer downloads actual media',async()=>{const downloaded=context.waitForEvent('page');await customer.getByRole('button',{name:'Tải xuống',exact:true}).click();const popup=await downloaded;await popup.waitForLoadState();assert.ok((await popup.locator('body').innerText()).includes('UAV PAS synthetic mission result'));await popup.close();});
const adminPortal=await context.newPage();watch(adminPortal);current=adminPortal;
await check('admin portal login',()=>login(adminPortal,3103,'admin'));
await adminPortal.getByRole('link',{name:'Nhật ký quản trị'}).click();
await check('admin audit contains completed mission',async()=>{await adminPortal.waitForURL('**/audit-logs');await adminPortal.getByRole('heading',{name:'Nhật ký quản trị',exact:true}).waitFor();const row=adminPortal.getByRole('row').filter({hasText:'Hoàn tất'}).filter({has:adminPortal.getByRole('cell',{name:String(missionId),exact:true})});await row.first().waitFor();});
await check('audit filter changes visible rows',async()=>{await adminPortal.getByLabel('Tìm trong trang hiện tại').fill('không-có-kết-quả-này');await adminPortal.getByText('Không có kết quả trên trang này').waitFor();await adminPortal.getByLabel('Tìm trong trang hiện tại').fill('Hoàn tất');assert.equal(await adminPortal.locator('tbody tr').count(),1);await adminPortal.getByLabel('Tìm trong trang hiện tại').fill('');});await snapshot(adminPortal,'admin-audit');
for(const [p,name] of [[customer,'customer'],[operator,'operator'],[adminPortal,'admin']]){
 current=p;await check(name+' mobile detail and navigation',async()=>{await p.setViewportSize({width:375,height:812});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await snapshot(p,name+'-mobile');if(name==='customer'){await p.getByRole('navigation',{name:'Điều hướng khách hàng'}).getByRole('link',{name:'Nhiệm vụ của tôi'}).click();await p.waitForURL('**/missions');}else{await p.getByRole('button',{name:'Mở điều hướng'}).click();await p.getByRole('button',{name:/Đăng xuất/}).waitFor();await p.keyboard.press('Escape');assert.equal(await p.getByRole('button',{name:'Mở điều hướng'}).getAttribute('aria-expanded'),'false');await p.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Mở điều hướng');}});
}
await check('no unexpected API failures or page errors',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(consoleIssues,[]);assert.deepEqual(network.filter(r=>r.status>=400),[]);});
console.log('COMPLETE',results.length,'steps',errors.length,'page errors');
} catch(e){console.log('FAIL',e.message);console.log('PAGE',await current.locator('body').innerText().catch(()=>''));await snapshot(current,'failure');process.exitCode=1;}
finally{await fs.writeFile(`${work}/browser-result.json`,JSON.stringify({status:process.exitCode?'FAIL':'PASS',results,errors,consoleIssues,network},null,2));await browser.close();}
