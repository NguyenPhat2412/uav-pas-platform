/** Opt-in synthetic browser checks. See M6_BUSINESS_UI_E2E_2026_10_15.md for setup.
 * Credentials come from a private fixture; no tokens, storage state or signed URLs are saved.
 */
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const work=process.env.UAV_BROWSER_WORK,shots=process.env.UAV_BROWSER_SCREENSHOTS;
const fixture=JSON.parse(await fs.readFile(`${work}/fixture.json`,'utf8'));
assert.equal(fixture.base, 'http://127.0.0.1:18080', 'Use the disposable local backend only');
const {missionId}=JSON.parse(await fs.readFile(`${work}/mission.json`,'utf8'));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE});
const result=[],errors=[];
async function page(){const c=await browser.newContext({viewport:{width:1440,height:1000}});c.setDefaultTimeout(10000);const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));return p;}
async function login(p,port,role){await p.goto(`http://localhost:${port}/login`);await p.locator('input').first().fill(fixture.users[role].username);await p.locator('input[type=password]').fill(fixture.password);await p.locator('button[type=submit]').click();await p.waitForURL(u=>!u.pathname.includes('login'));}
let p;
try{
p=await page();await login(p,3101,'customer_b');
let denied=p.waitForResponse(r=>new URL(r.url()).pathname===`/api/v1/missions/${missionId}`);
await p.goto(`http://localhost:3101/missions/${missionId}`);assert.equal((await denied).status(),403);
await p.getByText('Không thể tải mission hoặc mission không thuộc tài khoản này.').waitFor();assert.equal(await p.getByRole('button',{name:'Tải xuống'}).count(),0);await p.screenshot({path:shots+'/customer-b-denied.png',fullPage:true});result.push({name:'customer B direct-ID ownership denied',status:'PASS'});
await p.goto('http://localhost:3101/missions');await p.getByRole('heading',{name:'Mission của tôi',exact:true}).waitFor();await p.getByText(/chưa có mission|không có mission/i).waitFor();result.push({name:'customer B list excludes A missions',status:'PASS'});
p=await page();await login(p,3103,'admin');await p.getByRole('link',{name:'Nhật ký quản trị'}).click();await p.waitForURL('**/audit-logs');await p.getByRole('heading',{name:'Nhật ký quản trị',exact:true}).waitFor();await p.getByRole('row').filter({hasText:`MISSION`}).first().waitFor();await p.screenshot({path:shots+'/admin-audit.png',fullPage:true});result.push({name:'admin audit page loaded',status:'PASS'});
p=await page();await login(p,3101,'customer');await p.goto('http://localhost:3101/missions/create');
for(const [label,value] of [['Tiêu đề','UI stale draft '+Date.now()],['Ngày yêu cầu','2026-11-21'],['Bắt đầu','2026-11-21T09:00'],['Kết thúc dự kiến','2026-11-21T10:00'],['Địa điểm','Synthetic conflict test']])await p.getByLabel(label,{exact:true}).fill(value);
await p.getByRole('button',{name:'Kiểm tra & xem lại'}).click();await p.getByRole('button',{name:'Gửi yêu cầu',exact:true}).click();await p.waitForURL(/\/missions\/\d+$/);await p.getByRole('button',{name:'Gửi xác nhận',exact:true}).waitFor();
const stale=await p.context().newPage();stale.on('pageerror',e=>errors.push(e.message));await stale.goto(p.url());await stale.getByRole('button',{name:'Gửi xác nhận',exact:true}).waitFor();
await p.getByRole('button',{name:'Gửi xác nhận',exact:true}).click();await p.getByRole('button',{name:'Hủy yêu cầu'}).waitFor();
p=stale;const conflict=p.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/submit')&&r.request().method()==='POST');await p.getByRole('button',{name:'Gửi xác nhận',exact:true}).click();const code=(await conflict).status();console.log('stale submit status',code);assert.equal(code,409);await p.locator('.error[role=alert]').filter({hasText:'Trạng thái mission đã thay đổi'}).waitFor();await p.getByRole('button',{name:'Hủy yêu cầu',exact:true}).waitFor();await p.screenshot({path:shots+'/customer-conflict-recovered.png',fullPage:true});assert.equal(errors.length,0);result.push({name:'stale submit conflict is visible without uncaught rejection',status:'PASS'});
const cancelled=p.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/cancel')&&r.request().method()==='POST');await p.getByRole('button',{name:'Hủy yêu cầu',exact:true}).click();assert.equal((await cancelled).status(),200);await p.getByText('CANCELLED',{exact:true}).waitFor();assert.equal(await p.locator('.error[role=alert]').count(),0);assert.deepEqual(errors,[]);result.push({name:'cancel after conflict clears stale error and renders CANCELLED',status:'PASS'});

}catch(e){console.log('FAIL',e.message);console.log('PAGE',await p?.locator('body').innerText());await p?.screenshot({path:shots+'/negative-failure.png',fullPage:true});process.exitCode=1;}
finally{await fs.writeFile(`${work}/negative-result.json`,JSON.stringify({status:process.exitCode?'FAIL':'PASS',result,errors},null,2));console.log(JSON.stringify({result,errors}));await browser.close();}
