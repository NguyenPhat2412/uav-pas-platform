import {fixture,api,assert,check,finish,secretValues} from './browser-common.mjs';
let error;
try{
 const response=await fetch(fixture.base+'/api/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({usernameOrEmail:fixture.users.admin.username,password:fixture.password})});assert.equal(response.status,200);const auth=await response.json();secretValues.add(auth.accessToken);secretValues.add(auth.refreshToken);
 const bytes=Buffer.from('Synthetic natural-expiry verification '+Date.now());const asset=await api(auth.accessToken,'POST','/api/v1/media',{originalName:'natural-expiry.txt',contentType:'text/plain',size:bytes.length,type:'DOCUMENT'},201);
 const upload=await api(auth.accessToken,'GET',`/api/v1/media/${asset.id}/upload-url`);secretValues.add(upload.url);
 assert.equal((await fetch(upload.url,{method:'PUT',headers:{'Content-Type':'text/plain'},body:bytes})).status,200);await api(auth.accessToken,'POST',`/api/v1/media/${asset.id}/confirm`);
 const signed=await api(auth.accessToken,'GET',`/api/v1/media/${asset.id}/download-url`);secretValues.add(signed.url);const u=new URL(signed.url);const date=u.searchParams.get('X-Amz-Date');const duration=Number(u.searchParams.get('X-Amz-Expires'));assert.equal(duration,900);
 const issued=Date.UTC(+date.slice(0,4),+date.slice(4,6)-1,+date.slice(6,8),+date.slice(9,11),+date.slice(11,13),+date.slice(13,15));const expires=issued+duration*1000;
 await check('Private URL downloads matching bytes before natural expiry',async()=>{const r=await fetch(signed.url);assert.equal(r.status,200);assert.deepEqual(Buffer.from(await r.arrayBuffer()),bytes);return {expiresInSeconds:duration};});
 console.log('Waiting for real 15-minute storage URL expiry; other verification continues.');
 while(Date.now()<expires+2500)await new Promise(r=>setTimeout(r,Math.min(30000,expires+2500-Date.now())));
 await check('The same private URL is rejected after natural expiry',async()=>{assert.equal((await fetch(signed.url)).status,403);return {mode:'real clock and MinIO; no altered signature, clock or storage response'};});
 await check('Authorized user can obtain a fresh working URL',async()=>{const fresh=await api(auth.accessToken,'GET',`/api/v1/media/${asset.id}/download-url`);secretValues.add(fresh.url);const r=await fetch(fresh.url);assert.equal(r.status,200);assert.deepEqual(Buffer.from(await r.arrayBuffer()),bytes);});
}catch(e){error=e;}finally{await finish('media-natural-expiry',error);}if(error)process.exitCode=1;
