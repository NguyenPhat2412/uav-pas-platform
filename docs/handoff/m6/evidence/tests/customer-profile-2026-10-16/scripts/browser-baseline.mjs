import {launch,pageFor,check,finish,shot,assert} from './browser-common.mjs';
const browser=await launch();let error;
try { const {page}=await pageFor(browser,'baseline',3101,'customer','/profile');
 await check('Baseline profile is read-only',async()=>{await page.getByText('Chức năng chỉnh sửa hồ sơ chưa được hỗ trợ.',{exact:false}).waitFor();assert.equal(await page.getByRole('button',{name:'Chỉnh sửa hồ sơ'}).count(),0);await shot(page,'profile-before');});
} catch(e) {error=e;} finally {await finish('browser-baseline',error);await browser.close();}if(error)process.exitCode=1;
