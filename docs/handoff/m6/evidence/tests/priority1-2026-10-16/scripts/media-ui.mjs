import {launch,pageFor,fixture,assert,api,check,checks,shot,finish,fs,path,work,secretValues,safe} from './browser-common.mjs';
const phase=process.env.UAV_PHASE||'before';const browser=await launch();const stamp=Date.now();let fatal,a,c,b,mission,asset,privateAsset;const bytes=Buffer.from('Synthetic UAV media '+stamp);const filename=`mission-result-${stamp}.txt`;
async function isolated(name,fn){try{await check(name,fn)}catch(e){console.log('FAIL',name,safe(e.message));}}
async function mediaPage(){await a.page.goto('http://localhost:3102/media');await a.page.getByRole('heading',{name:'Tệp và tài liệu',exact:true}).waitFor();}
function row(name){return a.page.getByRole('row').filter({hasText:name});}
async function upload(name,link=false){
 await a.page.getByLabel('Tệp tải lên',{exact:true}).setInputFiles({name,mimeType:'text/plain',buffer:bytes});
 await a.page.getByRole('combobox',{name:/^Liên kết tài nguyên/}).selectOption(link?'MISSION':'');if(link)await a.page.getByLabel('Mã tài nguyên',{exact:true}).fill(String(mission.id));
 const registered=a.page.waitForResponse(r=>new URL(r.url()).pathname==='/api/v1/media'&&r.request().method()==='POST');
 await a.page.getByRole('button',{name:'Tải lên và xác nhận',exact:true}).click();const r=await registered;assert.equal(r.status(),201);return r.json();
}
try{
 a=await pageFor(browser,'media-admin',3102,'admin','/media');c=await pageFor(browser,'customer-A',3101,'customer','/missions');b=await pageFor(browser,'customer-B',3101,'customer_b','/missions');
 const start=new Date(Date.now()+7*86400000);const end=new Date(+start+3600000);
 mission=await api(c.token,'POST','/api/v1/missions',{missionType:'AREA_INSPECTION',title:'Kết quả riêng '+stamp,requestedDate:start.toISOString().slice(0,10),startTime:start.toISOString().slice(0,19),expectedEndTime:end.toISOString().slice(0,19),locationName:'Synthetic Hanoi',priority:'NORMAL'},201);
 await isolated('Upload bytes and confirm mission-linked media through UI without forwarding bearer to storage',async()=>{
  let leaked=false,puts=0;const listener=r=>{const u=new URL(r.url());if(u.origin==='http://127.0.0.1:9014'&&r.method()==='PUT'){puts++;if(r.headers().authorization)leaked=true;}};a.page.on('request',listener);
  asset=await upload(filename,true);await row(filename).getByText('Đã xác nhận',{exact:true}).waitFor();a.page.off('request',listener);assert.equal(puts,1);assert.equal(leaked,false);
  await api(a.token,'POST',`/api/v1/missions/${mission.id}/media`,{mediaId:asset.id,mediaRole:'OUTPUT'},201);return {linkStep:'API fixture/read-back; library upload and confirmation performed on UI'};
 });
 await isolated('Preview and open actual private file from UI',async()=>{
  await row(filename).getByRole('button',{name:'Xem / tải xuống',exact:true}).click();const detail=a.page.getByRole('region',{name:'Xem tệp: '+filename,exact:true});await detail.waitFor();
  const href=await detail.getByRole('link',{name:'Mở / tải xuống tệp'}).getAttribute('href');secretValues.add(href);
  const pagePromise=a.context.waitForEvent('page');await detail.getByRole('link',{name:'Mở / tải xuống tệp'}).click();const popup=await pagePromise;await popup.waitForLoadState('domcontentloaded');assert.equal((await popup.locator('body').innerText()).trim(),bytes.toString());await popup.close();await shot(a.page,`media-preview-${phase}`);await detail.getByRole('button',{name:'Đóng chi tiết'}).click();
 });
 await isolated('Customer A sees and downloads the owned mission result',async()=>{
  await c.page.goto(`http://localhost:3101/missions/${mission.id}`);await c.page.getByText(filename,{exact:true}).waitFor();const promise=c.context.waitForEvent('page');await c.page.getByRole('button',{name:'Tải xuống',exact:true}).click();const popup=await promise;await popup.waitForLoadState('domcontentloaded');assert.equal((await popup.locator('body').innerText()).trim(),bytes.toString());await popup.close();await shot(c.page,`customer-owned-media-${phase}`);
 });
 await isolated('Customer B cannot read mission, timeline, media or get a signed download',async()=>{
  for(const suffix of ['', '/timeline','/media'])await api(b.token,'GET',`/api/v1/missions/${mission.id}${suffix}`,undefined,403);
  await api(b.token,'GET',`/api/v1/media/${asset.id}/download-url`,undefined,403);
  const list=await api(b.token,'GET','/api/v1/media?size=100');assert.equal(list.content.some(x=>x.id===asset.id),false);
  const denied=b.page.waitForResponse(r=>new URL(r.url()).pathname===`/api/v1/missions/${mission.id}`);await b.page.goto(`http://localhost:3101/missions/${mission.id}`);assert.equal((await denied).status(),403);assert.equal(await b.page.getByText(filename,{exact:true}).count(),0);await shot(b.page,`customer-media-denied-${phase}`);
 });
 await isolated('Deleting attached media is rejected with an error visible beside the action',async()=>{
  await mediaPage();await row(filename).getByRole('button',{name:'Xóa',exact:true}).click();const panel=a.page.getByRole('region',{name:'Xóa tệp',exact:true});const r=a.page.waitForResponse(r=>new URL(r.url()).pathname===`/api/v1/media/${asset.id}`&&r.request().method()==='DELETE');await panel.getByRole('button',{name:'Xác nhận xóa',exact:true}).click();assert.equal((await r).status(),409);
  await a.page.getByRole('alert').last().waitFor();await a.page.waitForTimeout(400);await panel.scrollIntoViewIfNeeded();await shot(a.page,`media-delete-attached-${phase}`);
  assert.equal(await panel.getByRole('alert').count(),1,'Delete error is not beside the confirmation action');
  assert.equal((await api(a.token,'GET',`/api/v1/missions/${mission.id}/media`)).some(x=>x.media.id===asset.id),true);
 });
 await isolated('Interrupted confirm stays unconfirmed and can be recovered on UI',async()=>{
  await mediaPage();const name=`recover-${stamp}.txt`;await a.page.route('**/api/v1/media/*/confirm',route=>route.abort('failed'),{times:1});privateAsset=await upload(name);
  await row(name).getByText('Chờ xác nhận',{exact:true}).waitFor();assert.equal(await row(name).getByRole('button',{name:'Xem / tải xuống'}).count(),0);
  await api(a.token,'GET',`/api/v1/media/${privateAsset.id}/download-url`,undefined,409);
  await api(a.token,'POST',`/api/v1/missions/${mission.id}/media`,{mediaId:privateAsset.id,mediaRole:'OUTPUT'},409);
  const r=a.page.waitForResponse(r=>new URL(r.url()).pathname===`/api/v1/media/${privateAsset.id}/confirm`);await row(name).getByRole('button',{name:'Xác nhận',exact:true}).click();assert.equal((await r).status(),200);await row(name).getByText('Đã xác nhận',{exact:true}).waitFor();
  assert.equal((await api(a.token,'GET','/api/v1/media?size=100')).content.filter(x=>x.originalName===name).length,1);
  await api(a.token,'GET',`/api/v1/media/${privateAsset.id}/upload-url`,undefined,409);
  await shot(a.page,`media-recovery-${phase}`);await a.page.getByText('Failed to fetch',{exact:true}).waitFor({state:'hidden'});assert.equal(await a.page.getByText('Tải tệp chưa hoàn tất.',{exact:false}).count(),0,'A stale upload status remains after successful recovery');
  return {mode:'actual UI with deliberate cancellation of confirmation; no fake API success'};
 });
 await isolated('Delete unlinked file on UI removes metadata visibility and stored bytes',async()=>{
  const signed=await api(a.token,'GET',`/api/v1/media/${privateAsset.id}/download-url`);secretValues.add(signed.url);assert.equal((await fetch(signed.url)).status,200);
  await row(privateAsset.originalName).getByRole('button',{name:'Xóa',exact:true}).click();const panel=a.page.getByRole('region',{name:'Xóa tệp',exact:true});const r=a.page.waitForResponse(r=>new URL(r.url()).pathname===`/api/v1/media/${privateAsset.id}`&&r.request().method()==='DELETE');await panel.getByRole('button',{name:'Xác nhận xóa'}).click();assert.equal((await r).status(),204);
  await row(privateAsset.originalName).waitFor({state:'hidden'});await api(a.token,'GET',`/api/v1/media/${privateAsset.id}/download-url`,undefined,404);assert.equal((await fetch(signed.url)).status,404);
 });
 await isolated('Missing object and wrong media scope cannot become confirmed mission output',async()=>{
  const missing=await api(a.token,'POST','/api/v1/media',{originalName:'missing-'+stamp+'.txt',contentType:'text/plain',size:1,type:'DOCUMENT'},201);
  await api(a.token,'POST',`/api/v1/media/${missing.id}/confirm`,undefined,409);
  await api(b.token,'POST',`/api/v1/missions/${mission.id}/media/upload-url`,{originalName:'wrong-owner.txt',contentType:'text/plain',size:1,type:'DOCUMENT'},403);
 });
 await isolated('Mobile media screen has no page overflow',async()=>{await mediaPage();await a.page.setViewportSize({width:375,height:812});assert.equal(await a.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await shot(a.page,`media-mobile-${phase}`);});
}catch(e){fatal=e;}finally{if(!fatal&&checks.some(x=>x.status==='FAIL'))fatal=new Error('One or more media checks failed');await finish('media-ui-'+phase,fatal);await browser.close();}if(fatal)process.exitCode=1;
