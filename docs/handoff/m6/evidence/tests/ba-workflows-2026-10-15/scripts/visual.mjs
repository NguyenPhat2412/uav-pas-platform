const { chromium }=await import(process.env.PLAYWRIGHT_MODULE);
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const work=process.env.UAV_BROWSER_WORK,shots=process.env.UAV_BROWSER_SCREENSHOTS;
const fixture=JSON.parse(await fs.readFile(`${work}/fixture.json`));const {missionId}=JSON.parse(await fs.readFile(`${work}/mission.json`));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE});const results=[],errors=[];
try {
for(const [role,port,path] of [['customer',3101,`/missions/${missionId}`],['operator',3102,`/missions/${missionId}`],['admin',3103,'/audit-logs']]) {
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});context.setDefaultTimeout(20000);const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400){const u=new URL(r.url());console.log('HTTP',r.status(),u.origin,u.pathname)}});
 await p.goto(`http://localhost:${port}/login`);await p.waitForLoadState('networkidle');await p.locator('input').first().fill(fixture.users[role].username);await p.locator('input[type=password]').fill(fixture.password);await p.locator('button[type=submit]').click();await p.waitForURL(u=>!u.pathname.includes('login'));
 await p.goto(`http://localhost:${port}${path}`);await p.waitForLoadState('networkidle');await p.getByRole('heading',{level:1}).waitFor();
 assert.ok((await p.title()).includes('UAV'));assert.equal(new URL(p.url()).pathname,path);
 for(const width of [1440,1024,768,375,320]){
  await p.setViewportSize({width,height:width<500?812:1000});await p.evaluate(()=>scrollTo(0,0));await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  if(!await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)){console.log('overflow elements',await p.evaluate(()=>[...document.querySelectorAll('body *')].filter(el=>el.getBoundingClientRect().right>innerWidth+1).slice(0,18).map(el=>({tag:el.tagName,cls:el.className,width:el.getBoundingClientRect().width,right:el.getBoundingClientRect().right}))));await p.screenshot({path:`${shots}/${role}-overflow.png`});}assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${role} overflow ${width}`);
  if(width<500&&role!=='customer') {await p.getByRole('button',{name:'Mở điều hướng'}).click();await p.getByRole('button',{name:'Đóng điều hướng'}).first().waitFor();await p.keyboard.press('Tab');assert.ok(await p.evaluate(()=>document.activeElement?.closest('#portal-navigation')!==null));await p.keyboard.press('Escape');await p.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Mở điều hướng');}
  const skip=await p.locator('.skip-link').evaluate(el=>({top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom,transform:getComputedStyle(el).transform,focused:document.activeElement===el}));
  results.push({role,width,overflow:false,skip,styles:await p.evaluate(()=>['.sidebar','.sidebar nav','.sidebar nav a','.topbar','.customer-main','.audit-table .console-table'].map(sel=>{const el=document.querySelector(sel);if(!el)return null;const s=getComputedStyle(el);return {sel,width:s.width,height:s.height,padding:s.padding,font:s.fontSize,border:s.borderBottomWidth};}))});
  if(width===375||width===1440){await p.screenshot({path:`${shots}/${role}-${width}.png`,fullPage:false});if(width===375){await p.evaluate(()=>scrollTo(0,document.body.scrollHeight));await p.screenshot({path:`${shots}/${role}-375-bottom.png`,fullPage:false});}}
 }
 if(role==='customer') {await p.setViewportSize({width:375,height:812});await p.getByRole('navigation',{name:'Điều hướng khách hàng'}).getByRole('link',{name:'Nhiệm vụ của tôi'}).click();await p.waitForURL('**/missions');await p.waitForLoadState('networkidle');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await p.screenshot({path:`${shots}/customer-list-375.png`,fullPage:false});}
 if(role!=='customer')await p.getByRole('button',{name:'Mở điều hướng'}).click();
 const logout=p.waitForResponse(r=>new URL(r.url()).pathname==='/api/v1/auth/logout');await p.getByRole('button',{name:'Đăng xuất',exact:true}).click();assert.equal((await logout).status(),200);await p.waitForURL('**/login');await p.goto(`http://localhost:${port}${path}`);await p.waitForURL('**/login');results.push({role,logout:'PASS',protectedRouteAfterLogout:'PASS'});
 await context.close();
}
assert.deepEqual(errors,[]);
}catch(e){console.log('FAIL',e.message);process.exitCode=1;}finally{await fs.writeFile(`${work}/visual-result.json`,JSON.stringify({status:process.exitCode?'FAIL':'PASS',results,errors},null,2));console.log('Visual checks',results.length,process.exitCode?'FAIL':'PASS');await browser.close();}
