import {launch,fixture,assert,fs,path,work,safe} from './browser-common.mjs';
const browser=await launch();const network=[],consoleErrors=[];
for(const port of [3100,3101,3102,3103]){
 const p=await browser.newPage();p.on('response',r=>{if(r.status()>=400){const u=new URL(r.url());network.push({port,path:u.pathname,status:r.status()});}});p.on('console',m=>{if(m.type()==='error')consoleErrors.push({port,path:m.location().url?new URL(m.location().url).pathname:undefined,message:safe(m.text())});});
 await p.goto(`http://localhost:${port}${port===3100?'':'/login'}`);await p.waitForLoadState('networkidle');await p.close();
}
await browser.close();await fs.writeFile(path.join(work,'static-smoke.json'),JSON.stringify({network,consoleErrors},null,2));console.log(JSON.stringify({network,consoleErrors}));
