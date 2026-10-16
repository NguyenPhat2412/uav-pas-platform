import {launch,pageFor,fs,path,work} from './browser-common.mjs';
const browser=await launch();const diagnostics=[];const create=browser.newContext.bind(browser);
browser.newContext=async(...args)=>{const ctx=await create(...args);ctx.on('page',page=>{
 page.on('console',m=>{if(m.type()==='error'){let pathname;try{pathname=new URL(m.location().url).pathname}catch{}diagnostics.push({type:'console',path:pathname,message:m.text().replace(/https?:\/\/[^\s]+/g,'[URL]')});}});
 page.on('response',r=>{if(r.status()>=400)diagnostics.push({type:'response',path:new URL(r.url()).pathname,status:r.status()});});});return ctx;};
try{const admin=await pageFor(browser,'Console check',3103,'admin','/audit-logs');await admin.page.locator('tbody tr').first().waitFor();await admin.page.waitForLoadState('networkidle');const r=await fetch('http://localhost:3103/favicon.ico');diagnostics.push({type:'explicit check',path:'/favicon.ico',status:r.status});console.log(JSON.stringify(diagnostics));await fs.writeFile(path.join(work,'browser-admin-console.json'),JSON.stringify({diagnostics},null,2));}finally{await browser.close();}
