import {launch,pageFor,fixture,assert,api,check,shot,finish,fs,path,work,network,safe} from './browser-common.mjs';
const phase=process.env.UAV_PHASE||'before';const browser=await launch();let fatal;let a,item,target;const stamp=Date.now();const name=`Vật tư kiểm thử ${stamp}`;
async function read(){return api(a.token,'GET',`/api/v1/inventory/equipment/${item.id}`);}
async function balance(q,available,reserved){const x=await read();assert.deepEqual([x.quantity,x.availableQuantity,x.reservedQuantity],[q,available,reserved]);const row=a.page.getByRole('row').filter({hasText:name}).first();await row.waitFor();return x;}
async function move(action,quantity,status=200,note=`UI ${action} ${stamp}`){await a.page.locator('#movement-equipment').selectOption(String(item.id));await a.page.locator('#movement-action').selectOption(action);await a.page.locator('#movement-quantity').fill(String(quantity));await a.page.locator('#movement-note').fill(note);if(action==='transfer')await a.page.locator('#movement-station').selectOption(String(target.id));const r=a.page.waitForResponse(r=>new URL(r.url()).pathname===`/api/v1/inventory/equipment/${item.id}/${action}${action==='transfer'?'/'+target.id:''}`&&r.request().method()==='POST');await a.page.getByRole('button',{name:'Ghi nhận',exact:true}).click();assert.equal((await r).status(),status);await a.page.getByRole('button',{name:'Ghi nhận',exact:true}).waitFor({state:'visible'});}
try{
 a=await pageFor(browser,'inventory-admin',3102,'admin','/inventory');
 target=await api(a.token,'POST','/api/v1/stations',{code:'INV-'+stamp,name:'Trạm đích '+stamp,address:'Synthetic',status:'ACTIVE'},201);
 await a.page.reload();
 await check('Create equipment through UI with a home station',async()=>{
  await a.page.getByRole('button',{name:'Tạo thiết bị',exact:true}).click();await a.page.locator('#equipment-name').fill(name);await a.page.locator('#equipment-type').selectOption('BATTERY');await a.page.locator('#equipment-station').selectOption(String(fixture.stationId));
  const response=a.page.waitForResponse(r=>new URL(r.url()).pathname==='/api/v1/inventory/equipment'&&r.request().method()==='POST');await a.page.getByRole('button',{name:'Tạo thiết bị',exact:true}).last().click();const r=await response;assert.equal(r.status(),201);item=await r.json();assert.equal(item.stationId,fixture.stationId);
 });
 await check('Stock in then reserve through UI preserve quantities and visible history',async()=>{
  await move('stock-in',10);await balance(10,10,0);await move('reserve',7);await balance(10,3,7);
  await a.page.getByRole('region',{name:'Lịch sử kho'}).getByText(`UI reserve ${stamp}`,{exact:true}).waitFor();
 });
 await check('Stock out above available is rejected with no balance change',async()=>{await move('stock-out',4,409);await balance(10,3,7);assert.equal(await a.page.locator('[role=alert]').count()>0,true);});
 await check('Release then stock out through UI update stock and history',async()=>{await move('release',2);await balance(10,5,5);await move('stock-out',3);await balance(7,2,5);});
 await check('Partial transfer preserves reservations and destination stock',async()=>{
  await move('transfer',2);await balance(5,0,5);const rows=(await api(a.token,'GET','/api/v1/inventory/equipment?size=100')).content.filter(x=>x.name===name);const dest=rows.find(x=>x.stationId===target.id);assert.ok(dest);assert.deepEqual([dest.quantity,dest.availableQuantity,dest.reservedQuantity],[2,2,0]);assert.equal(rows.reduce((s,x)=>s+x.quantity,0),7);
  await a.page.getByRole('region',{name:'Lịch sử kho'}).getByText(`UI transfer ${stamp}`,{exact:true}).waitFor();await shot(a.page,`inventory-transfer-${phase}`);
 });
 await check('Release above reserved is rejected and valid release restores availability',async()=>{await move('release',6,409);await balance(5,0,5);await move('release',5);await balance(5,5,0);});
 await check('Retry after a lost response does not apply stock-in twice',async()=>{
  let captured, committed;const commitDone=new Promise(resolve=>committed=resolve);const url=`${fixture.base}/api/v1/inventory/equipment/${item.id}/stock-in`;
  await a.page.route(url,async route=>{captured=route.request().postDataJSON().requestId;const r=await route.fetch();assert.equal(r.status(),200);await route.abort('failed');committed();},{times:1});
  await a.page.locator('#movement-action').selectOption('stock-in');await a.page.locator('#movement-quantity').fill('2');await a.page.locator('#movement-note').fill('UI retry '+stamp);
  await a.page.getByRole('button',{name:'Ghi nhận',exact:true}).click();await commitDone;await a.page.getByRole('alert').last().waitFor();await balance(7,7,0);assert.ok(captured);
  let replay;const response=a.page.waitForResponse(r=>new URL(r.url()).pathname.endsWith(`/${item.id}/stock-in`)&&r.request().method()==='POST');a.page.once('request',()=>{});
  const listener=r=>{if(r.url()===url&&r.method()==='POST')replay=r.postDataJSON().requestId};a.page.on('request',listener);
  await a.page.getByRole('button',{name:'Ghi nhận',exact:true}).click();assert.equal((await response).status(),200);a.page.off('request',listener);assert.equal(replay,captured);await balance(7,7,0);
  const h=(await api(a.token,'GET','/api/v1/inventory/equipment/history?size=100')).content.filter(x=>x.note==='UI retry '+stamp);assert.equal(h.length,1);
  return {mode:'actual UI with intentionally dropped real response; no successful API response mocked'};
 });
 await check('Mobile inventory form and table remain usable',async()=>{await a.page.setViewportSize({width:375,height:812});assert.equal(await a.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await shot(a.page,`inventory-mobile-${phase}`);});
}catch(e){fatal=e;}finally{await finish('inventory-ui-'+phase,fatal);await browser.close();}if(fatal)process.exitCode=1;
