import {assert,fs,path,work,fixture,launch,secretValues,safe} from './browser-common.mjs';
const browser=await launch();const rows=[];
try {
 for (const [label,port,role,target] of [['customer',3101,'customer','/missions/1'],['operations',3102,'operator','/missions/1'],['admin',3103,'admin','/audit-logs'],['legacy',3100,'operator','/missions']]) {
  const context=await browser.newContext();const page=await context.newPage();const row={label,status:'PASS',resourceErrors:[],console:[],pageErrors:[]};rows.push(row);
  page.on('response',r=>{if(r.status()>=400){const u=new URL(r.url());row.resourceErrors.push({origin:u.origin,path:u.pathname,status:r.status(),type:r.request().resourceType()});}});
  page.on('pageerror',e=>row.pageErrors.push(safe(e.message)));
  page.on('console',m=>{if(['warning','error'].includes(m.type())){const u=m.location().url;row.console.push({text:safe(m.text()),path:u?new URL(u).pathname:null});}});
  await page.goto(`http://localhost:${port}/login`);await page.locator('input').first().fill(fixture.users[role].username);await page.locator('input[type=password]').fill(fixture.password);
  const pending=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/v1/auth/login'&&r.request().method()==='POST');await page.locator('button[type=submit]').click();assert.equal((await pending).status(),200);
  await page.waitForURL(u=>u.pathname!='/login');await page.goto(`http://localhost:${port}${target}`);await page.waitForLoadState('networkidle');assert.equal(row.pageErrors.length,0);assert.equal(row.resourceErrors.filter(x=>x.path!=='/favicon.ico').length,0);await context.close();
 }
}finally{await fs.writeFile(path.join(work,'browser-diagnostics.json'),JSON.stringify({checks:rows},null,2));await browser.close();}
console.log(JSON.stringify(rows));
