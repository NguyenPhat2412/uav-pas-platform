import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const work=process.env.UAV_BROWSER_WORK;const f=JSON.parse(await fs.readFile(`${work}/fixture.json`));assert.equal(f.base,'http://127.0.0.1:18080');
const attempts=[];
for(let round=0;round<6;round++){
 const results=await Promise.all([0,1].map(async()=>{const r=await fetch(f.base+'/api/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({usernameOrEmail:f.users.admin.username,password:f.password})});await r.arrayBuffer();return r.status;}));attempts.push({round:round+1,statuses:results});
}
await fs.writeFile(`${work}/auth-concurrency-observation.json`,JSON.stringify({status:attempts.some(x=>x.statuses.includes(500))?'FAIL':'NOT_REPRODUCED',scope:'Pre-existing authentication concurrency gap, outside maintenance change; auth implementation/contract untouched.',trigger:'Two simultaneous logins for the same synthetic account',attempts,observedConstraint:'refresh_tokens_user_id_key',followUp:'Separate authentication concurrency fix/review required. No tokens, credentials or response bodies retained. Maintenance functional suites log in sequentially.'},null,2));console.log(JSON.stringify(attempts));
