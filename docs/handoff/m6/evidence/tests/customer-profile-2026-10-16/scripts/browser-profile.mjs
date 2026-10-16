import {launch,pageFor,check,finish,shot,assert,api,fixture,network,errors,secretValues} from './browser-common.mjs';
const browser=await launch();let failure;
const endpoint='/api/v1/users/profile';let a,b,latest;
async function read(session){const token=await session.page.evaluate(()=>localStorage.getItem('token'));return api(token,'GET',endpoint);}
async function edit(page){await page.getByRole('button',{name:'Chỉnh sửa hồ sơ',exact:true}).click();await page.getByLabel('Họ và tên',{exact:true}).waitFor();}
async function save(page,expected=200){const response=page.waitForResponse(r=>new URL(r.url()).pathname===endpoint&&r.request().method()==='PATCH');await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();const r=await response;assert.equal(r.status(),expected);return r;}
try {
 await check('Anonymous profile API and protected browser route are denied',async()=>{
  for(const method of ['GET','PATCH']){const r=await fetch(fixture.base+endpoint,{method,headers:{'Content-Type':'application/json'},...(method==='PATCH'?{body:'{}'}:{})});assert.equal(r.status,401);network.push({label:'Anonymous',method,path:endpoint,status:r.status});}
  const ctx=await browser.newContext();const p=await ctx.newPage();await p.goto('http://localhost:3101/profile');await p.waitForURL('**/login');await ctx.close();
 });
 a=await pageFor(browser,'Customer A',3101,'customer','/profile');b=await pageFor(browser,'Customer B',3101,'customer_b','/profile');
 await check('Customer edits only full name and phone; save updates header and survives reload',async()=>{
  const before=await api(a.token,'GET','/api/v1/auth/me');await edit(a.page);
  assert.equal(await a.page.locator('input').count(),2);
  await a.page.getByLabel('Họ và tên',{exact:true}).fill('  Nguyễn An — Hồ sơ thử nghiệm  ');
  await a.page.getByLabel('Số điện thoại',{exact:true}).fill(' 0900123101 ');await save(a.page);
  await a.page.getByRole('status').filter({hasText:'Đã lưu hồ sơ của bạn.'}).waitFor();
  assert.equal(await a.page.locator('.account').innerText(),'Nguyễn An — Hồ sơ thử nghiệm');
  latest=await read(a);assert.equal(latest.fullName,'Nguyễn An — Hồ sơ thử nghiệm');assert.equal(latest.phoneNumber,'0900123101');
  const after=await api(a.token,'GET','/api/v1/auth/me');for(const key of ['id','username','email','role','status','avatarUrl','createdAt'])assert.equal(after[key],before[key],key);
  await a.page.reload();await a.page.getByRole('button',{name:'Chỉnh sửa hồ sơ',exact:true}).waitFor();assert.equal(await a.page.locator('.account').innerText(),latest.fullName);await shot(a.page,'profile-desktop-saved');
  return {url:new URL(a.page.url()).pathname,title:await a.page.title(),editableFields:2};
 });
 await check('Cancel keeps saved values; blank phone is rejected without a request',async()=>{
  await edit(a.page);await a.page.getByLabel('Họ và tên',{exact:true}).fill('Không lưu');await a.page.getByRole('button',{name:'Hủy chỉnh sửa',exact:true}).click();assert.deepEqual(await read(a),latest);
  await edit(a.page);await a.page.getByLabel('Số điện thoại',{exact:true}).fill('   ');const count=network.filter(r=>r.method==='PATCH'&&r.path===endpoint).length;
  await a.page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();await a.page.getByText('Vui lòng nhập số điện thoại.',{exact:true}).waitFor();assert.equal(network.filter(r=>r.method==='PATCH'&&r.path===endpoint).length,count);
  assert.equal(await a.page.getByLabel('Họ và tên',{exact:true}).getAttribute('maxlength'),'100');assert.equal(await a.page.getByLabel('Số điện thoại',{exact:true}).getAttribute('maxlength'),'20');await shot(a.page,'profile-validation');await a.page.getByRole('button',{name:'Hủy chỉnh sửa',exact:true}).click();
 });
 await check('Duplicate phone is rejected in the UI and the draft stays editable',async()=>{
  const other=await read(b);await edit(a.page);await a.page.getByLabel('Họ và tên',{exact:true}).fill('Bản chưa lưu');await a.page.getByLabel('Số điện thoại',{exact:true}).fill(other.phoneNumber);
  await save(a.page,409);await a.page.locator('#profile-phone-error').waitFor();assert.equal(await a.page.getByLabel('Họ và tên',{exact:true}).inputValue(),'Bản chưa lưu');assert.deepEqual(await read(a),latest);
  assert.equal(await a.page.getByRole('button',{name:'Lưu thay đổi',exact:true}).isEnabled(),true);await shot(a.page,'profile-duplicate');await a.page.getByRole('button',{name:'Hủy chỉnh sửa',exact:true}).click();
 });
 await check('Two real tabs cannot overwrite; explicit reload recovers from a 409',async()=>{
  const tab=await a.context.newPage();await tab.goto('http://localhost:3101/profile');await edit(tab);await edit(a.page);
  await tab.getByLabel('Họ và tên',{exact:true}).fill('Bản cũ ở tab hai');await a.page.getByLabel('Họ và tên',{exact:true}).fill('Bản mới ở tab một');await save(a.page);await a.page.getByText('Đã lưu hồ sơ của bạn.',{exact:true}).waitFor();
  await save(tab,409);assert.equal(await tab.getByLabel('Họ và tên',{exact:true}).inputValue(),'Bản cũ ở tab hai');assert.equal(await tab.getByRole('button',{name:'Lưu thay đổi',exact:true}).isDisabled(),true);await shot(tab,'profile-two-tabs-conflict');
  tab.once('dialog',d=>d.dismiss());await tab.getByRole('button',{name:'Tải bản mới nhất',exact:true}).click();assert.equal(await tab.getByLabel('Họ và tên',{exact:true}).inputValue(),'Bản cũ ở tab hai');
  tab.once('dialog',d=>d.accept());await tab.getByRole('button',{name:'Tải bản mới nhất',exact:true}).click();
  await tab.waitForFunction(()=>document.querySelector('#profile-name')?.value==='Bản mới ở tab một');await tab.getByRole('button',{name:'Hủy chỉnh sửa',exact:true}).click();await tab.close();latest=await read(a);
 });
 await check('Network failure retains draft and requires reconciliation before another save',async()=>{
  await edit(a.page);await a.page.getByLabel('Họ và tên',{exact:true}).fill('Giữ lại khi mất mạng');
  await a.page.route('**/api/v1/users/profile',async route=>{if(route.request().method()==='PATCH')await route.abort('internetdisconnected');else await route.continue();});
  await a.page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();await a.page.getByRole('alert').filter({hasText:'Chưa xác nhận được kết quả lưu'}).waitFor();
  assert.equal(await a.page.getByLabel('Họ và tên',{exact:true}).inputValue(),'Giữ lại khi mất mạng');assert.equal(await a.page.getByRole('button',{name:'Lưu thay đổi',exact:true}).isDisabled(),true);await shot(a.page,'profile-network-recovery');
  await a.page.unroute('**/api/v1/users/profile');await a.page.getByRole('button',{name:'Tải bản mới nhất',exact:true}).click();await a.page.waitForFunction(name=>document.querySelector('#profile-name')?.value===name,latest.fullName);await a.page.getByRole('button',{name:'Hủy chỉnh sửa',exact:true}).click();
 });
 await check('Lost success response is reconciled without a duplicate write',async()=>{
  await edit(a.page);await a.page.getByLabel('Họ và tên',{exact:true}).fill('Đã lưu dù mất phản hồi');let writes=0;
  await a.page.route('**/api/v1/users/profile',async route=>{if(route.request().method()==='PATCH'){writes++;const response=await route.fetch();assert.equal(response.status(),200);await route.abort('failed');}else await route.continue();});
  await a.page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();await a.page.getByRole('alert').filter({hasText:'Chưa xác nhận được kết quả lưu'}).waitFor();assert.equal(writes,1);
  await a.page.unroute('**/api/v1/users/profile');await a.page.getByRole('button',{name:'Tải bản mới nhất',exact:true}).click();await a.page.waitForFunction(()=>document.querySelector('#profile-name')?.value==='Đã lưu dù mất phản hồi');assert.equal((await read(a)).fullName,'Đã lưu dù mất phản hồi');await a.page.getByRole('button',{name:'Hủy chỉnh sửa',exact:true}).click();latest=await read(a);
 });
 await check('Customer B stays isolated and cannot target A or elevate permissions',async()=>{
  assert.notEqual((await read(b)).id,latest.id);await b.page.reload();await b.page.getByRole('button',{name:'Chỉnh sửa hồ sơ',exact:true}).waitFor();assert.equal(await b.page.getByText(latest.fullName,{exact:true}).count(),0);
  await api(b.token,'GET',`/api/v1/users/${a.user.id}`,undefined,403);
  await api(b.token,'GET',`/api/v1/users/${a.user.id}/profile`,undefined,404);
  const old=await read(b);await api(b.token,'PATCH',endpoint,{fullName:'Forged',phoneNumber:'0900123199',expectedRevision:old.revision,id:a.user.id,role:'ROLE_ADMIN'},400);assert.deepEqual(await read(b),old);
  await api(b.token,'PATCH',endpoint,{fullName:'Forged',phoneNumber:'0900123199',expectedRevision:latest.revision},409);assert.deepEqual(await read(a),latest);
 });
 await check('Automatic session refresh preserves the auth response shape and updated profile',async()=>{
  let once=false;
  await a.page.route('**/api/v1/users/profile',async route=>{if(!once&&route.request().method()==='GET'){once=true;await route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({message:'Synthetic expired access response'})});}else await route.continue();});
  const refreshed=a.page.waitForResponse(r=>new URL(r.url()).pathname==='/api/v1/auth/refresh'&&r.request().method()==='POST');await a.page.reload();const response=await refreshed;assert.equal(response.status(),200);const auth=await response.json();secretValues.add(auth.accessToken);secretValues.add(auth.refreshToken);assert.deepEqual(Object.keys(auth).sort(),['accessToken','refreshToken','tokenType','user']);assert.equal(auth.tokenType,'Bearer');assert.equal(auth.user.id,a.user.id);
  await a.page.getByRole('button',{name:'Chỉnh sửa hồ sơ',exact:true}).waitFor();assert.equal(await a.page.locator('.account').innerText(),latest.fullName);await a.page.unroute('**/api/v1/users/profile');
 });
 await check('Mobile form fits 375 px and can save using visible controls',async()=>{
  await a.page.setViewportSize({width:375,height:812});await edit(a.page);await a.page.getByLabel('Họ và tên',{exact:true}).fill('Hồ sơ khách hàng trên điện thoại');
  assert.equal(await a.page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  await a.page.getByRole('button',{name:'Lưu thay đổi',exact:true}).scrollIntoViewIfNeeded();await shot(a.page,'profile-mobile-edit');await save(a.page);await a.page.getByText('Đã lưu hồ sơ của bạn.',{exact:true}).waitFor();await shot(a.page,'profile-mobile-saved');latest=await read(a);
 });
 await check('Admin sees a Vietnamese audit record without personal field values',async()=>{
  const admin=await pageFor(browser,'Admin audit',3103,'admin','/audit-logs');await admin.page.getByRole('heading',{name:'Nhật ký quản trị',exact:true}).waitFor();await admin.page.locator('tbody tr').first().waitFor();await admin.page.getByLabel('Tìm trong trang hiện tại').fill('Hồ sơ cá nhân');const row=admin.page.getByRole('row').filter({hasText:'Hồ sơ cá nhân'}).first();await row.waitFor();assert.match(await row.innerText(),/Cập nhật hồ sơ: họ tên/);assert.doesNotMatch(await row.innerText(),/0900123101|Hồ sơ khách hàng trên điện thoại/);await shot(admin.page,'profile-admin-audit');
 });
 await check('Logout denies profile and same browser login as B never restores A data',async()=>{
  await a.page.getByRole('button',{name:'Đăng xuất',exact:true}).click();await a.page.waitForURL('**/login');assert.equal(await a.page.evaluate(()=>localStorage.getItem('token')),null);await a.page.goto('http://localhost:3101/profile');await a.page.waitForURL('**/login');
  await a.page.locator('input').first().fill(fixture.users.customer_b.username);await a.page.locator('input[type=password]').fill(fixture.password);await a.page.locator('button[type=submit]').click();await a.page.waitForURL(u=>!u.pathname.includes('/login'));await a.page.goto('http://localhost:3101/profile');await a.page.getByRole('button',{name:'Chỉnh sửa hồ sơ',exact:true}).waitFor();assert.equal(await a.page.getByText(latest.fullName,{exact:true}).count(),0);assert.equal((await read(a)).id,b.user.id);
 });
 assert.deepEqual(errors,[]);
} catch(error){failure=error;} finally {await finish('browser-profile',failure);await browser.close();}if(failure)process.exitCode=1;
