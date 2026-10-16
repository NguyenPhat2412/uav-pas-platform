import {launch,pageFor,fixture,assert,api,check,shot,finish} from './browser-common.mjs';
const browser=await launch();let fatal;
try{
 const a=await pageFor(browser,'mission-media-admin',3102,'admin','/dispatch/missions'),c=await pageFor(browser,'mission-media-owner',3101,'customer','/missions'),o=await pageFor(browser,'unassigned-operator',3102,'operator','/assigned-missions');const stamp=Date.now();const start=new Date(Date.now()+9*86400000),end=new Date(+start+3600000);
 const mission=await api(c.token,'POST','/api/v1/missions',{missionType:'AREA_INSPECTION',title:'Mission media UI '+stamp,requestedDate:start.toISOString().slice(0,10),startTime:start.toISOString().slice(0,19),expectedEndTime:end.toISOString().slice(0,19),locationName:'Synthetic',priority:'NORMAL'},201);const name=`mission-ui-${stamp}.txt`,bytes=Buffer.from('Synthetic full UI attachment '+stamp);
 await check('Mission UI uploads, confirms and attaches media; customer downloads matching bytes',async()=>{
  await a.page.goto(`http://localhost:3102/missions/${mission.id}`);const attached=a.page.waitForResponse(r=>new URL(r.url()).pathname===`/api/v1/missions/${mission.id}/media`&&r.request().method()==='POST');
  await a.page.getByLabel('Tải tệp kết quả lên',{exact:true}).setInputFiles({name,mimeType:'text/plain',buffer:bytes});assert.equal((await attached).status(),201);await a.page.getByText(name,{exact:true}).waitFor();await a.page.locator('#media').scrollIntoViewIfNeeded();await shot(a.page,'mission-media-upload-after');
  await c.page.goto(`http://localhost:3101/missions/${mission.id}`);await c.page.getByText(name,{exact:true}).waitFor();const promise=c.context.waitForEvent('page');await c.page.getByRole('button',{name:'Tải xuống',exact:true}).click();const popup=await promise;await popup.waitForLoadState('domcontentloaded');assert.equal((await popup.locator('body').innerText()).trim(),bytes.toString());await popup.close();
 });
 await check('Unassigned operator cannot view the mission or upload to it',async()=>{
  const denied=o.page.waitForResponse(r=>new URL(r.url()).pathname===`/api/v1/missions/${mission.id}`);await o.page.goto(`http://localhost:3102/missions/${mission.id}`);assert.equal((await denied).status(),403);assert.equal(await o.page.getByText(name,{exact:true}).count(),0);assert.equal(await o.page.getByLabel('Tải tệp kết quả lên',{exact:true}).count(),0);
  await api(o.token,'POST',`/api/v1/missions/${mission.id}/media/upload-url`,{originalName:'denied.txt',contentType:'text/plain',size:1,type:'DOCUMENT'},403);await shot(o.page,'unassigned-operator-media-denied');
 });
}catch(e){fatal=e;}finally{await finish('mission-media-ui',fatal);await browser.close();}if(fatal)process.exitCode=1;
