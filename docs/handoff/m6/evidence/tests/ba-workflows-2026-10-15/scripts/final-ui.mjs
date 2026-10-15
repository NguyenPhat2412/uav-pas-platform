import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const work=process.env.UAV_BROWSER_WORK, shots=process.env.UAV_BROWSER_SCREENSHOTS;
const fixture=JSON.parse(await fs.readFile(`${work}/fixture.json`));
assert.equal(fixture.base,'http://127.0.0.1:18080');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE});
const results=[],errors=[],network=[];
async function api(path,body,token){const r=await fetch(fixture.base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});assert.ok(r.ok,`${path}: ${r.status}`);const d=await r.json();return d.data??d;}
async function check(name,fn){await fn();results.push({name,status:'PASS'});console.log('PASS',name);}
let p;
try{
 const publicContext=await browser.newContext();p=await publicContext.newPage();p.on('pageerror',e=>errors.push(e.name));
 await check('public web responds with visible content on desktop and mobile',async()=>{const r=await p.goto('http://localhost:3100/');assert.equal(r.status(),200);await p.locator('h1').waitFor();for(const width of [1440,375]){await p.setViewportSize({width,height:900});await p.waitForLoadState('networkidle');assert.ok((await p.locator('body').innerText()).trim().length>100);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await p.screenshot({path:`${shots}/public-web-${width}.png`});}});await publicContext.close();
 const auth=await api('/api/v1/auth/login',{usernameOrEmail:fixture.users.customer.username,password:fixture.password});
 const token=auth.token??auth.accessToken;
 const mission=await api('/api/v1/missions',{missionType:'AREA_INSPECTION',title:'BA stale response and note boundary',requestedDate:'2026-12-20',startTime:'2026-12-20T09:00:00',expectedEndTime:'2026-12-20T10:00:00',locationName:'Synthetic BA race check',priority:'NORMAL'},token);
 await api(`/api/v1/missions/${mission.id}/submit`,{},token);
 const context=await browser.newContext({viewport:{width:1440,height:1000}});context.setDefaultTimeout(15000);p=await context.newPage();p.on('pageerror',e=>errors.push(e.name));p.on('response',r=>{const u=new URL(r.url());if(u.port==='18080')network.push({path:u.pathname,status:r.status(),method:r.request().method()});});
 await p.goto('http://localhost:3102/login');await p.waitForLoadState('networkidle');await p.locator('input').first().fill(fixture.users.admin.username);await p.locator('input[type=password]').fill(fixture.password);await p.locator('button[type=submit]').click();await p.waitForURL(u=>!u.pathname.includes('login'));
 let timelineFault=true;
 await p.route(`**/api/v1/missions/${mission.id}/timeline`,async route=>{if(timelineFault){timelineFault=false;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Synthetic transient timeline outage'})});}else await route.continue();});
 await p.goto(`http://localhost:3102/missions/${mission.id}`);await p.getByText('Chưa tải được:',{exact:false}).waitFor();
 let hold=true,releaseOld,observedOld;
 const held=new Promise(resolve=>{observedOld=resolve;});const release=new Promise(resolve=>{releaseOld=resolve;});
 await p.route(`**/api/v1/missions/${mission.id}`,async route=>{if(hold&&route.request().method()==='GET'){hold=false;const old=await route.fetch();observedOld();await release;await route.fulfill({response:old});}else await route.continue();});
 await check('late real GET cannot overwrite new mission state after UI confirm (controlled delay)',async()=>{await p.getByRole('button',{name:'Thử lại',exact:true}).click();await held;const response=p.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/confirm')&&r.request().method()==='POST');await p.getByRole('button',{name:'Xác nhận',exact:true}).click();assert.equal((await response).status(),200);await p.locator('[data-status=CONFIRMED]').waitFor();releaseOld();await p.waitForLoadState('networkidle');assert.equal(await p.locator('[data-status=CONFIRMED]').count(),1);assert.equal(await p.getByRole('button',{name:'Xác nhận',exact:true}).count(),0);await p.screenshot({path:`${shots}/operations-late-response-preserved.png`});});
 await check('rejection form enforces 500-character timeline boundary and valid boundary persists',async()=>{await p.getByRole('button',{name:'Từ chối',exact:true}).click();const field=p.getByLabel('Lý do / vướng mắc');assert.equal(await field.getAttribute('maxlength'),'500');await field.fill('R'.repeat(501));assert.equal((await field.inputValue()).length,500);const result=p.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/reject')&&r.request().method()==='POST');await p.getByRole('button',{name:'Xác nhận từ chối',exact:true}).click();assert.equal((await result).status(),200);await p.locator('[data-status=REJECTED]').waitFor();const detail=await api(`/api/v1/missions/${mission.id}`,undefined,token);assert.equal(detail.status,'REJECTED');});
 assert.deepEqual(errors,[]);
}catch(e){results.push({name:'final UI check failure',status:'FAIL',errorType:e.name,message:e.message.replace(/https?:\/\/\S+/g,'[URL]')});console.log('FAIL',e.name,e.message);process.exitCode=1;if(p&&!p.isClosed())await p.screenshot({path:`${shots}/final-ui-failure.png`});}
finally{await fs.writeFile(`${work}/final-ui-result.json`,JSON.stringify({status:process.exitCode?'FAIL':'PASS',scope:'Real browser/API; one synthetic timeline503 and delayed genuine GET response to test recovery. API fixture creation is not UI coverage.',results,errors,network},null,2));await browser.close();}
