import {launch,pageFor,check,finish,assert,fixture,errors,shot} from './browser-common.mjs';
const browser=await launch();let failure;
try {
 const a=await pageFor(browser,'Profile recovery',3101,'customer','/profile');
 await check('Initial load failure has a usable retry and cannot expose an edit form',async()=>{
  await a.page.route('**/api/v1/users/profile',route=>route.fulfill({status:503,contentType:'application/json',body:'{"message":"Synthetic unavailable"}'}));
  await a.page.reload();await a.page.getByRole('alert').filter({hasText:'Không thể tải thông tin hồ sơ mới nhất.'}).waitFor();assert.equal(await a.page.getByRole('button',{name:'Chỉnh sửa hồ sơ',exact:true}).count(),0);await shot(a.page,'profile-load-retry');
  await a.page.unroute('**/api/v1/users/profile');await a.page.getByRole('button',{name:'Thử lại',exact:true}).click();await a.page.getByRole('button',{name:'Chỉnh sửa hồ sơ',exact:true}).waitFor();
 });
 await check('Optional name can be cleared and header falls back to username',async()=>{
  await a.page.getByRole('button',{name:'Chỉnh sửa hồ sơ',exact:true}).click();await a.page.getByLabel('Họ và tên',{exact:true}).fill('   ');await a.page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();await a.page.getByText('Đã lưu hồ sơ của bạn.',{exact:true}).waitFor();assert.equal(await a.page.locator('.account').innerText(),fixture.users.customer.username);await a.page.getByText('Chưa cập nhật',{exact:true}).waitFor();
 });
 await check('Delayed save response after logout cannot revive session or leak profile into account B',async()=>{
  await a.page.getByRole('button',{name:'Chỉnh sửa hồ sơ',exact:true}).click();await a.page.getByLabel('Họ và tên',{exact:true}).fill('Phản hồi đến muộn của A');
  let release,arrived;const waitRelease=new Promise(r=>release=r);const waitArrived=new Promise(r=>arrived=r);
  await a.page.route('**/api/v1/users/profile',async route=>{if(route.request().method()==='PATCH'){const response=await route.fetch();assert.equal(response.status(),200);arrived();await waitRelease;await route.fulfill({response});}else await route.continue();});
  await a.page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();await waitArrived;
  await a.page.getByRole('button',{name:'Đăng xuất',exact:true}).click();await a.page.waitForURL('**/login');assert.equal(await a.page.evaluate(()=>localStorage.getItem('token')),null);
  await a.page.locator('input').first().fill(fixture.users.customer_b.username);await a.page.locator('input[type=password]').fill(fixture.password);await a.page.locator('button[type=submit]').click();await a.page.waitForURL(u=>!u.pathname.includes('/login'));
  release();await a.page.goto('http://localhost:3101/profile');await a.page.getByRole('button',{name:'Chỉnh sửa hồ sơ',exact:true}).waitFor();assert.equal(await a.page.getByText('Phản hồi đến muộn của A',{exact:true}).count(),0);assert.equal(await a.page.locator('.account').innerText(),fixture.users.customer_b.username);
  await a.page.unroute('**/api/v1/users/profile');await a.page.reload();await a.page.getByRole('button',{name:'Chỉnh sửa hồ sơ',exact:true}).waitFor();assert.equal(await a.page.locator('.account').innerText(),fixture.users.customer_b.username);
 });
 assert.deepEqual(errors,[]);
}catch(error){failure=error;}finally{await finish('browser-profile-recovery',failure);await browser.close();}if(failure)process.exitCode=1;
