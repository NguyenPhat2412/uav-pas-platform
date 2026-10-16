import {assert,fs,path,work,launch,pageFor,check,shot,finish,errors} from './browser-common.mjs';
const browser=await launch();let error;
try {
 const {missionId}=JSON.parse(await fs.readFile(path.join(work,'browser-mission.json'),'utf8'));
 const {page}=await pageFor(browser,'admin redispatch audit',3103,'admin','/audit-logs');
 await check('Admin reads all six redispatch action types for the verified mission across audit pages',async()=>{
  const wanted=['Thay người vận hành:','Gỡ người vận hành:','Đổi trạm:','Gỡ trạm:','Đổi thiết bị hoặc số lượng:','Hoàn trả thiết bị:'];const found=new Set();
  for(let index=0;index<8&&found.size<wanted.length;index++){
   await page.locator('tbody tr').first().waitFor();await page.getByRole('status',{name:'Đang tải dữ liệu'}).waitFor({state:'hidden'});
   const rows=page.getByRole('row').filter({has:page.getByRole('cell',{name:String(missionId),exact:true})});
   for(const row of await rows.allTextContents())for(const label of wanted)if(row.includes(label))found.add(label);
   if(found.size===wanted.length)break;
   const next=page.getByRole('button',{name:'Sau',exact:true});if(await next.isDisabled())break;
   const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/v1/audit-logs');await next.click();assert.equal((await response).status(),200);
  }
  assert.deepEqual([...found].sort(),[...wanted].sort());await page.getByLabel('Tìm trong trang hiện tại').fill('Thay người vận hành');await page.getByRole('row').filter({hasText:'Thay người vận hành:'}).first().waitFor();await shot(page,'admin-redispatch-audit');return {missionId,actionTypes:found.size};
 });
 await check('Audit browser has no JavaScript errors',async()=>assert.deepEqual(errors,[]));
} catch(e){error=e;process.exitCode=1;}finally{await finish('browser-audit',error);await browser.close();}
