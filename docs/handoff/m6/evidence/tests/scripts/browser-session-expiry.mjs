/** Opt-in synthetic browser checks. See M6_BUSINESS_UI_E2E_2026_10_15.md for setup.
 * Credentials come from a private fixture; no tokens, storage state or signed URLs are saved.
 */
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const work=process.env.UAV_BROWSER_WORK;const fixture=JSON.parse(await fs.readFile(`${work}/fixture.json`,'utf8'));
assert.equal(fixture.base, 'http://127.0.0.1:18080', 'Use the disposable local backend only');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE});
const results=[];
try {
for(const [role,port,path] of [['customer',3101,'/missions'],['operator',3102,'/assigned-missions'],['admin',3103,'/audit-logs']]){
 const context=await browser.newContext();context.setDefaultTimeout(15000);const page=await context.newPage();const network=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{const u=new URL(r.url());if(u.port==='18080')network.push({path:u.pathname,status:r.status()});});
 await page.goto(`http://localhost:${port}/login`);await page.locator('input').first().fill(fixture.users[role].username);await page.locator('input[type=password]').fill(fixture.password);await page.locator('button[type=submit]').click();await page.waitForURL(u=>!u.pathname.includes('login'));await page.getByRole('button',{name:/Đăng xuất/}).waitFor();
 await page.goto(`http://localhost:${port}${path}`);await page.getByRole('button',{name:/Đăng xuất/}).waitFor();
 const before=network.length;await page.waitForTimeout(6500);
 const refreshed=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/v1/auth/refresh'&&r.status()===200);
 await page.reload();await refreshed;await page.getByRole('button',{name:/Đăng xuất/}).waitFor();assert.equal(new URL(page.url()).pathname,path);
 assert.ok(network.slice(before).some(r=>r.status===401));
 const loggedOut=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/v1/auth/logout');await page.getByRole('button',{name:/Đăng xuất/}).click();assert.equal((await loggedOut).status(),200);await page.waitForURL('**/login');
 await page.goto(`http://localhost:${port}${path}`);await page.waitForURL('**/login');assert.deepEqual(errors,[]);
 results.push({role,naturalExpiryRefresh:'PASS',logout:'PASS',protectedRouteAfterLogout:'PASS',errors,network});await context.close();console.log('PASS',role,'natural expiry, refresh, logout, protected-route denial');
}
const c=await browser.newContext();c.setDefaultTimeout(15000);const p=await c.newPage();await p.goto('http://localhost:3103/login');await p.locator('input').first().fill(fixture.users.operator.username);await p.locator('input[type=password]').fill(fixture.password);await p.locator('button[type=submit]').click();await p.waitForURL('**/dashboard');await p.goto('http://localhost:3103/users');await p.getByText(/không có quyền|chưa được cấp quyền/i).waitFor();assert.equal(await p.getByRole('table').count(),0);results.push({role:'operator',adminUsersDenied:'PASS'});await c.close();
}catch(e){console.log('FAIL',e.message);process.exitCode=1;}finally{await fs.writeFile(`${work}/session-result.json`,JSON.stringify({status:process.exitCode?'FAIL':'PASS',accessTtlMs:5000,results,secretsRecorded:false},null,2));await browser.close();}
