import {assert,fs,path,work,fixture,launch,pageFor,api,check,shot,finish,network,errors} from './browser-common.mjs';
const browser=await launch();let error,p;
try{
 await check('Media library blocks deletion of a completed mission result and explains the rule',async()=>{
  const admin=await pageFor(browser,'Terminal media library',3102,'admin','/media');p=admin.page;
  const media=await api(admin.token,'GET','/api/v1/missions/1/media');const result=media.find(x=>x.mediaRole==='DOCUMENT');assert.ok(result);
  const row=p.getByRole('row').filter({hasText:result.media.originalName});await row.getByRole('button',{name:'Xóa',exact:true}).click();
  const pending=p.waitForResponse(r=>new URL(r.url()).pathname===`/api/v1/media/${result.media.id}`&&r.request().method()==='DELETE');await p.getByRole('button',{name:'Xác nhận xóa',exact:true}).click();assert.equal((await pending).status(),409);
  if(process.argv.includes('--before')){await p.getByText('MISSION_MEDIA_LOCKED',{exact:true}).waitFor();await shot(p,'media-locked-before');throw new Error('Confirmed UI defect: raw MISSION_MEDIA_LOCKED instead of a Vietnamese explanation');}
  await p.getByText('Nhiệm vụ đã kết thúc. Tệp chỉ được xem hoặc tải xuống; không thể thêm, sửa hoặc xóa.',{exact:true}).waitFor();assert.equal(await p.getByText('MISSION_MEDIA_LOCKED',{exact:true}).count(),0);await shot(p,'media-locked-after');
  assert.equal((await api(admin.token,'GET','/api/v1/missions/1/media')).length,media.length);assert.equal(errors.length,0);assert.equal(network.filter(x=>x.status>=500).length,0);
 });
}catch(e){error=e;process.exitCode=1;}
finally{await finish(process.argv.includes('--before')?'browser-media-lock-before':'browser-media-lock',error);await browser.close();}
