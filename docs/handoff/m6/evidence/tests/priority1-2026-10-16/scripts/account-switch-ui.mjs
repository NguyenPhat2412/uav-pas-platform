import {launch,pageFor,fixture,assert,api,check,shot,finish,secretValues} from './browser-common.mjs';
const browser=await launch();let fatal;
try{
 const c=await pageFor(browser,'same-browser-account-switch',3101,'customer','/missions');
 const missions=await api(c.token,'GET','/api/v1/missions?size=100');let owned,file;
 for(const m of missions.content){const assets=await api(c.token,'GET',`/api/v1/missions/${m.id}/media`);if(assets.length){owned=m;file=assets[0].media.originalName;break;}}
 assert.ok(owned);await c.page.goto(`http://localhost:3101/missions/${owned.id}`);await c.page.getByText(file,{exact:true}).waitFor();
 await check('Logout removes owned media from the authenticated UI',async()=>{await c.page.getByRole('button',{name:/Đăng xuất/}).click();await c.page.waitForURL(u=>u.pathname==='/login');assert.equal(await c.page.getByText(file,{exact:true}).count(),0);});
 await check('Account B in the same browser cannot recover account A media with direct navigation or Back',async()=>{
  await c.page.locator('input').first().fill(fixture.users.customer_b.username);await c.page.locator('input[type=password]').fill(fixture.password);
  const response=c.page.waitForResponse(r=>new URL(r.url()).pathname==='/api/v1/auth/login');await c.page.locator('button[type=submit]').click();assert.equal((await response).status(),200);const auth=await (await response).json();secretValues.add(auth.accessToken);secretValues.add(auth.refreshToken);await c.page.waitForURL(u=>u.pathname!=='/login');
  const denied=c.page.waitForResponse(r=>new URL(r.url()).pathname===`/api/v1/missions/${owned.id}`);await c.page.goto(`http://localhost:3101/missions/${owned.id}`);assert.equal((await denied).status(),403);assert.equal(await c.page.getByText(file,{exact:true}).count(),0);await shot(c.page,'same-browser-ownership-denied');
  await c.page.goBack();await c.page.getByRole('button',{name:/Đăng xuất/}).waitFor();assert.equal(await c.page.getByText(file,{exact:true}).count(),0);
 });
}catch(e){fatal=e;}finally{await finish('account-switch-ui',fatal);await browser.close();}if(fatal)process.exitCode=1;
