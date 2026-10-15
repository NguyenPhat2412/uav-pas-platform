import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const work=process.env.UAV_BROWSER_WORK;
const fixture=JSON.parse(await fs.readFile(path.join(work,'fixture.json'),'utf8'));
assert.equal(fixture.base,'http://127.0.0.1:18080');
const resource=JSON.parse(await fs.readFile(path.join(work,'operations-history-result.json'),'utf8')).created;
const expectation=process.env.UAV_SERIAL_EXPECTATION || 'found';
assert.ok(['missing','found'].includes(expectation));
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE});
const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(20000);
const result={status:'FAIL',expectation,resourceId:resource.uavId};
try{
 await page.goto('http://localhost:3102/login');await page.waitForLoadState('networkidle');
 await page.locator('input').first().fill(fixture.users.admin.username);await page.locator('input[type=password]').fill(fixture.password);
 await page.locator('button[type=submit]').click();await page.waitForURL(u=>!u.pathname.includes('login'));
 await page.goto('http://localhost:3102/uavs');
 const search=page.getByRole('textbox',{name:/Tìm.*Bảng đội UAV/});
 await search.fill(resource.model);
 const table=page.getByRole('table',{name:'Bảng đội UAV',exact:true});
 await table.getByText(resource.serialNumber,{exact:true}).waitFor();
 result.matchByModel=await table.locator('tbody tr').count();assert.equal(result.matchByModel,1);
 await search.fill(resource.serialNumber);
 if(expectation==='missing')await page.getByText('Không có kết quả phù hợp',{exact:true}).waitFor();
 else await table.getByText(resource.serialNumber,{exact:true}).waitFor();
 result.matchBySerial=await table.locator('tbody tr').count();assert.equal(result.matchBySerial,expectation==='missing'?0:1);
 result.status='PASS';result.finding=expectation==='missing'?'Reproduced: displayed UAV serial cannot be found by global search':'Fixed: both model and displayed UAV serial find the same UAV';
 await page.screenshot({path:path.join(process.env.UAV_BROWSER_SCREENSHOTS,`operations-uav-serial-${expectation}.png`),fullPage:true});
 console.log(JSON.stringify(result));
}catch(error){result.error=error.message.replace(/https?:\/\/\S+/g,'[URL]').split(fixture.password).join('[REDACTED]');process.exitCode=1;console.log('FAIL',result.error);}
finally{await fs.writeFile(path.join(work,`operations-uav-search-${expectation}.json`),JSON.stringify(result,null,2));await browser.close();}
