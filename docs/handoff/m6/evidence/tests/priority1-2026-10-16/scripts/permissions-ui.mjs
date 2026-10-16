import {launch,pageFor,fixture,assert,api,check,checks,shot,finish,fs,path,work,safe} from './browser-common.mjs';
const phase=process.env.UAV_PHASE||'before'; const browser=await launch();let fatal;let a,o,target;
async function isolated(name,fn){try{await check(name,fn)}catch(e){console.log('FAIL',name,safe(e.message));}}
async function detail(){await a.page.goto(`http://localhost:3103/users/${target.id}`);await a.page.getByRole('heading',{name:'Ma trận quyền hiệu lực'}).waitFor();}
async function save(code,value){const select=a.page.getByLabel(`${code} override`,{exact:true});await select.selectOption(value);const r=a.page.waitForResponse(r=>new URL(r.url()).pathname===`/api/v1/permissions/users/${target.id}/${code}`&&['PUT','DELETE'].includes(r.request().method()));await a.page.getByRole('button',{name:'Xem lại và lưu'}).click();const response=await r;await a.page.getByText('Đã lưu:',{exact:false}).waitFor();return response.status();}
try{
 a=await pageFor(browser,'admin',3103,'admin','/users');
 target=(await api(a.token,'GET',`/api/v1/users?keyword=${fixture.users.operator_b.username}`)).content[0];assert.ok(target);
 await api(a.token,'POST',`/api/v1/users/${target.id}/unlock`,undefined,204);
 const roleDefaults=(await api(a.token,'GET','/api/v1/role-templates')).find(x=>x.role===target.role).permissions;
 // Clean up only the synthetic target's override from prior runs.
 await api(a.token,'DELETE',`/api/v1/permissions/users/${target.id}/INVENTORY_MANAGE`,undefined,204);
 await isolated('Find user on UI and grant inventory management',async()=>{
  await a.page.getByRole('textbox',{name:'Tìm người dùng'}).fill(target.username);await a.page.getByRole('button',{name:'Tìm kiếm',exact:true}).click();
  const row=a.page.getByRole('row').filter({hasText:target.username});await row.getByRole('link',{name:'Chi tiết'}).click();
  assert.equal(await save('INVENTORY_MANAGE','true'),204);
  o=await pageFor(browser,'operator-with-grant',3102,'operator_b','/inventory');await o.page.getByRole('button',{name:'Ghi nhận',exact:true}).waitFor();
  assert.ok((await api(o.token,'GET','/api/v1/permissions/me')).includes('INVENTORY_MANAGE'));
  await shot(a.page,`permissions-granted-${phase}`);
 });
 await isolated('Reload actual permissions allows another edit without page refresh',async()=>{
  await a.page.getByRole('button',{name:'Tải lại quyền thực tế'}).click();
  await a.page.waitForTimeout(400);
  assert.equal(await a.page.getByLabel('INVENTORY_MANAGE override',{exact:true}).isEnabled(),true,'Permission editor stays permanently disabled after reloading actual permissions');
 });
 await isolated('Revoke permission on UI blocks a mutation from the already open tab',async()=>{
  await detail();await o.page.locator('#movement-equipment').selectOption(String(fixture.equipmentId));await o.page.locator('#movement-quantity').fill('1');
  const before=await api(a.token,'GET',`/api/v1/inventory/equipment/${fixture.equipmentId}`);
  assert.equal(await save('INVENTORY_MANAGE','false'),204);
  const response=o.page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/stock-in')&&r.request().method()==='POST');
  await o.page.getByRole('button',{name:'Ghi nhận',exact:true}).click();assert.equal((await response).status(),403);
  assert.equal((await api(a.token,'GET',`/api/v1/inventory/equipment/${fixture.equipmentId}`)).quantity,before.quantity);
  await o.page.reload();await o.page.getByRole('heading',{name:'Kho thiết bị',exact:true}).waitFor();assert.equal(await o.page.getByRole('button',{name:'Ghi nhận',exact:true}).count(),0);
  await shot(o.page,`inventory-permission-denied-${phase}`);
 });
 await isolated('Reset override returns to role defaults',async()=>{
  await detail();assert.equal(await save('INVENTORY_MANAGE','inherit'),204);
  assert.equal((await api(a.token,'GET',`/api/v1/permissions/users/${target.id}`)).filter(x=>x.code==='INVENTORY_MANAGE').length,0);
  assert.equal((await api(o.token,'GET','/api/v1/permissions/me')).includes('INVENTORY_MANAGE'),roleDefaults.includes('INVENTORY_MANAGE'));
 });
 await isolated('Lock and unlock user on UI enforce access for an existing token',async()=>{
  await detail();const locked=a.page.waitForResponse(r=>new URL(r.url()).pathname.endsWith(`/users/${target.id}/lock`));await a.page.getByRole('button',{name:'Khóa tài khoản',exact:true}).click();assert.equal((await locked).status(),204);
  assert.equal((await api(a.token,'GET',`/api/v1/users/${target.id}`)).status,'ACTIVE','Manual access lock is separate from profile status');await api(o.token,'GET','/api/v1/inventory/equipment',undefined,401);
  await shot(a.page,`locked-account-${phase}`);await a.page.getByRole('button',{name:'Mở khóa',exact:true}).waitFor();
  const unlocked=a.page.waitForResponse(r=>new URL(r.url()).pathname.endsWith(`/users/${target.id}/unlock`));await a.page.getByRole('button',{name:'Mở khóa',exact:true}).click();assert.equal((await unlocked).status(),204);
  await a.page.getByRole('button',{name:'Khóa tài khoản',exact:true}).waitFor();await api(o.token,'GET','/api/v1/inventory/equipment');
 });
 await isolated('Last access administrator cannot be locked from UI',async()=>{
  await a.page.goto(`http://localhost:3103/users/${a.user.id}`);await a.page.getByRole('button',{name:'Khóa tài khoản',exact:true}).waitFor();
  const r=a.page.waitForResponse(r=>new URL(r.url()).pathname.endsWith(`/users/${a.user.id}/lock`));await a.page.getByRole('button',{name:'Khóa tài khoản',exact:true}).click();assert.equal((await r).status(),409);
  assert.equal((await api(a.token,'GET',`/api/v1/users/${a.user.id}`)).status,'ACTIVE');await shot(a.page,`last-admin-protected-${phase}`);
 });
}catch(e){fatal=e;}finally{if(!fatal&&checks.some(x=>x.status==='FAIL'))fatal=new Error('One or more checks failed');await finish('permissions-ui-'+phase,fatal);await browser.close();}if(fatal)process.exitCode=1;
