import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from '/Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
export { assert, fs, path };
export const work='/Volumes/D/Codex/projects/uav-pas-platform/work/uav-resource-redispatch-20261016';
export const out='/Volumes/D/Codex/outputs/uav-resource-redispatch-20261016';
export const fixture=JSON.parse(await fs.readFile(path.join(work,'fixture.json'),'utf8'));
export const secretValues=new Set([fixture.password]);
export const network=[],errors=[],failed=[],checks=[],consoleMessages=[];
export function safe(s){let t=String(s).replace(/https?:\/\/[^\s]+/g,'[URL]').replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g,'[TOKEN]');for(const v of secretValues)if(v)t=t.split(v).join('[REDACTED]');return t;}
export async function launch(){return chromium.launch({headless:true,executablePath:'/Users/admin/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'});}
export async function pageFor(browser,label,port,role,route){
 const context=await browser.newContext({viewport:{width:1440,height:1000}});context.setDefaultTimeout(12000);
 const page=await context.newPage();let access;
 page.on('pageerror',e=>errors.push({label,message:safe(e.message)}));
 page.on('console',m=>{if(['warning','error'].includes(m.type()))consoleMessages.push({label,type:m.type(),message:safe(m.text())});});
 page.on('response',r=>{const u=new URL(r.url());if(u.origin===fixture.base)network.push({label,method:r.request().method(),path:u.pathname,status:r.status()});});
 page.on('requestfailed',r=>{if(new URL(r.url()).origin===fixture.base)failed.push({label,path:new URL(r.url()).pathname,error:r.failure()?.errorText?.includes('ABORTED')?'ABORTED':'NETWORK_ERROR'});});
 page.on('dialog',d=>d.accept());
 await page.goto(`http://localhost:${port}/login`);await page.locator('input[type=password]').waitFor();
 await page.locator('input').first().fill(fixture.users[role].username);await page.locator('input[type=password]').fill(fixture.password);
 const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/v1/auth/login'&&r.request().method()==='POST');
 await page.locator('button[type=submit]').click();const login=await response;assert.equal(login.status(),200);
 const session=await login.json();secretValues.add(session.accessToken);secretValues.add(session.refreshToken);access=session.accessToken;
 await page.waitForURL(u=>!u.pathname.includes('/login'));await page.goto(`http://localhost:${port}${route}`);
 await page.getByRole('button',{name:/Đăng xuất/}).waitFor();
 assert.ok((await page.title()).length>0);assert.equal(await page.getByText(/Application error:|Unhandled Runtime Error|Build Error/).count(),0);
 return {page,context,token:access,user:session.user,port};
}
export async function api(token,method,endpoint,body,expected=200){
 const r=await fetch(fixture.base+endpoint,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 network.push({label:'API fixture/read-back',method,path:endpoint.split('?')[0],status:r.status});
 const text=await r.text();let data;try{data=JSON.parse(text)}catch{data=text}
 assert.equal(r.status,expected,`${method} ${endpoint.split('?')[0]} status=${r.status}`);return data;
}
export async function check(name,fn){console.log('START',name);try{const detail=await fn();checks.push({name,status:'PASS',detail});console.log('PASS',name)}catch(e){checks.push({name,status:'FAIL',error:safe(e.message)});throw e;}}
export async function shot(page,name){await page.screenshot({path:path.join(out,name+'.png'),fullPage:false});}
export async function finish(name,error){const result={status:error?'FAIL':'PASS',checks,network,pageErrors:errors,consoleMessages,requestFailures:failed,...(error?{failure:safe(error.message)}:{})};await fs.writeFile(path.join(work,name+'.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({status:result.status,checks:checks.length,pageErrors:errors.length,failure:result.failure}));}
