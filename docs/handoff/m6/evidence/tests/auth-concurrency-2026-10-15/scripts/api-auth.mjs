import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { randomBytes, randomInt } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const work = process.env.UAV_BROWSER_WORK;
const fixture = JSON.parse(await fs.readFile(`${work}/fixture.json`, 'utf8'));
assert.equal(fixture.base, 'http://127.0.0.1:18080');
const phase = process.env.UAV_AUTH_PHASE || 'after';
assert.ok(['before', 'after'].includes(phase));
const base = fixture.base, requests = [], results = [], secrets = [fixture.password];
const container = 'uav-auth-concurrency-20261015-postgres-1';
assert.equal(execFileSync('docker', ['inspect', '--format', '{{index .Config.Labels "com.docker.compose.project"}}', container], { encoding: 'utf8' }).trim(), 'uav-auth-concurrency-20261015');
const redact = text => secrets.reduce((value, secret) => secret ? value.split(secret).join('[REDACTED]') : value, String(text)).replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[JWT]');
async function call(path, method = 'GET', body, accessToken, headers = {}) {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...headers, ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000) });
  const raw = await response.text(); let data;
  try { const parsed = JSON.parse(raw); data = parsed.data ?? parsed; } catch { data = undefined; }
  if (data?.accessToken) secrets.push(data.accessToken);
  if (data?.refreshToken) secrets.push(data.refreshToken);
  requests.push({ method, path, status: response.status });
  return { status: response.status, data, headers: response.headers };
}
function status(result, expected, label) { assert.equal(result.status, expected, label); return result.data; }
function shape(result) {
  assert.deepEqual(Object.keys(result.data).sort(), ['accessToken', 'refreshToken', 'tokenType', 'user']);
  assert.equal(result.data.tokenType, 'Bearer');
  assert.ok(typeof result.data.accessToken === 'string' && typeof result.data.refreshToken === 'string');
  assert.ok(result.data.user?.id > 0);
  assert.equal(result.headers.get('set-cookie'), null, 'JSON bearer contract must not acquire a cookie');
  return result.data;
}
const login = account => call('/api/v1/auth/login', 'POST', { usernameOrEmail: account.username, password: fixture.password });
const refresh = token => call('/api/v1/auth/refresh', 'POST', { refreshToken: token });
const me = token => call('/api/v1/auth/me', 'GET', undefined, token);
const logout = (access, token) => call('/api/v1/auth/logout', 'POST', token ? { refreshToken: token } : undefined, access);
function sql(statement) { return execFileSync('docker', ['exec', container, 'psql', '-U', 'uav_test', '-d', 'uav_stabilization', '-v', 'ON_ERROR_STOP=1', '-tAc', statement], { encoding: 'utf8' }).trim(); }
function userId(value) { assert.ok(Number.isSafeInteger(value) && value > 0); return value; }
function rows(id) { return Number(sql(`SELECT count(*) FROM refresh_tokens WHERE user_id=${userId(id)}`)); }
async function createAccount() {
  const tag = randomBytes(5).toString('hex');
  const account = { username: `auth_${tag}`, email: `auth_${tag}@example.invalid`, phoneNumber: '0' + randomInt(100000000, 999999999) };
  const response = await call('/api/v1/auth/register', 'POST', { ...account, password: fixture.password });
  account.id = status(response, 201, 'synthetic registration').id;
  return account;
}
async function check(name, run, mode = 'HTTP with disposable PostgreSQL') {
  try { const detail = await run(); results.push({ name, status: 'PASS', mode, ...(detail ? { detail } : {}) }); console.log('PASS', name); }
  catch (error) { results.push({ name, status: 'FAIL', mode, failure: redact(error.message) }); console.log('FAIL', name, redact(error.message)); }
}
const account = await createAccount(), other = await createAccount();

await check('health, anonymous and invalid bearer responses preserve existing behavior', async () => {
  status(await call('/actuator/health/readiness'), 200, 'readiness');
  status(await me(undefined), 401, 'anonymous'); status(await me('invalid-synthetic-token'), 401, 'invalid bearer');
  const allowed = await call('/api/v1/auth/login', 'OPTIONS', undefined, undefined, { Origin: 'http://localhost:3102', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' });
  status(allowed, 200, 'allowed CORS'); assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:3102');
  status(await call('/api/v1/auth/login', 'OPTIONS', undefined, undefined, { Origin: 'https://synthetic-denied.invalid', 'Access-Control-Request-Method': 'POST' }), 403, 'rejected CORS');
});
await check('invalid credentials and malformed auth input preserve 401 and 400', async () => {
  status(await call('/api/v1/auth/login', 'POST', { usernameOrEmail: account.username, password: 'wrong-synthetic-password' }), 401, 'wrong password');
  status(await call('/api/v1/auth/login', 'POST', { usernameOrEmail: 'missing_synthetic_user', password: fixture.password }), 401, 'unknown user');
  status(await call('/api/v1/auth/login', 'POST', {}), 400, 'missing fields');
  status(await refresh(''), 400, 'blank refresh'); status(await refresh('unknown-synthetic-refresh'), 401, 'unknown refresh');
});
await check('username and email login retain JSON response fields and bearer identity', async () => {
  const first = await login(account); status(first, 200, 'username login'); shape(first);
  assert.equal(status(await me(first.data.accessToken), 200, 'username me').id, account.id);
  const second = await login({ username: account.email }); status(second, 200, 'email login'); shape(second);
  assert.equal(second.data.user.id, account.id);
  return { responseFields: Object.keys(second.data).sort(), tokenType: second.data.tokenType, cookiesIssued: false };
});
await check('sequential refresh rotates once and logout invalidates exactly supplied tokens', async () => {
  const initial = shape(await login(account));
  const rotatedResponse = await refresh(initial.refreshToken); status(rotatedResponse, 200, 'refresh'); const rotated = shape(rotatedResponse);
  assert.ok(rotated.refreshToken !== initial.refreshToken && rotated.accessToken !== initial.accessToken);
  status(await refresh(initial.refreshToken), 401, 'old refresh replay');
  status(await me(initial.accessToken), 200, 'old access retains independent lifetime');
  status(await me(rotated.accessToken), 200, 'new access');
  const response = await logout(rotated.accessToken, rotated.refreshToken); status(response, 200, 'logout'); assert.deepEqual(Object.keys(response.data), ['message']);
  status(await me(rotated.accessToken), 401, 'logged out access'); status(await refresh(rotated.refreshToken), 401, 'logged out refresh');
  status(await me(initial.accessToken), 200, 'logout is exact-token scope');
  status(await logout(rotated.accessToken, rotated.refreshToken), 200, 'repeat logout');
});
await check('old-session logout does not revoke a newly logged-in session', async () => {
  const old = shape(await login(account)), current = shape(await login(account));
  status(await refresh(old.refreshToken), 401, 'new login replaces old refresh');
  status(await logout(old.accessToken, old.refreshToken), 200, 'old logout');
  status(await me(old.accessToken), 401, 'old access revoked'); status(await me(current.accessToken), 200, 'new access retained');
  status(await refresh(current.refreshToken), 200, 'new refresh retained');
});
await check('first-login burst and repeated username/email concurrent logins all succeed with one surviving refresh', async () => {
  const rounds = [];
  for (let round = 0; round < 8; round++) {
    const fresh = await createAccount();
    for (const burst of [0, 1]) {
      const responses = await Promise.all(Array.from({ length: 6 }, (_, i) => login({ username: i % 2 ? fresh.email : fresh.username })));
      assert.ok(responses.every(r => r.status === 200), `concurrent login statuses: ${responses.map(r => r.status).join(',')}`);
      responses.forEach(shape); assert.equal(rows(fresh.id), 1, 'one refresh row');
      const accessResults = await Promise.all(responses.map(r => me(r.data.accessToken))); assert.ok(accessResults.every(r => r.status === 200), 'all issued access tokens usable');
      const rotations = await Promise.all(responses.map(r => refresh(r.data.refreshToken)));
      assert.deepEqual(rotations.map(r => r.status).sort(), [200, 401, 401, 401, 401, 401]);
      assert.equal(rows(fresh.id), 1);
      rounds.push({ round: round + 1, burst: burst === 0 ? 'first' : 'existing', loginStatuses: responses.map(r => r.status), refreshStatuses: rotations.map(r => r.status) });
    }
  }
  return { rounds };
});
await check('the same refresh submitted concurrently is consumed exactly once', async () => {
  const rounds = [];
  for (let round = 0; round < 12; round++) {
    const initial = shape(await login(account));
    const responses = await Promise.all(Array.from({ length: 6 }, () => refresh(initial.refreshToken)));
    assert.deepEqual(responses.map(r => r.status).sort(), [200, 401, 401, 401, 401, 401]);
    const winner = responses.find(r => r.status === 200); shape(winner); status(await me(winner.data.accessToken), 200, 'winner access');
    assert.equal(rows(account.id), 1); rounds.push(responses.map(r => r.status));
  }
  return { rounds };
});
await check('login racing an old refresh leaves the new login refresh valid', async () => {
  const rounds = [];
  for (let round = 0; round < 10; round++) {
    const old = shape(await login(account));
    const [loggedIn, refreshed] = await Promise.all([login(account), refresh(old.refreshToken)]);
    status(loggedIn, 200, 'racing login'); assert.ok([200, 401].includes(refreshed.status), 'racing refresh must serialize');
    status(await refresh(loggedIn.data.refreshToken), 200, 'new login refresh survives');
    rounds.push({ login: loggedIn.status, refresh: refreshed.status });
  }
  return { rounds };
});
await check('logout racing new login invalidates the old access while preserving the new session', async () => {
  const rounds = [];
  for (let round = 0; round < 10; round++) {
    const old = shape(await login(account));
    const [loggedOut, loggedIn] = await Promise.all([logout(old.accessToken, old.refreshToken), login(account)]);
    status(loggedOut, 200, 'racing logout'); status(loggedIn, 200, 'racing login');
    status(await me(old.accessToken), 401, 'old access revoked'); status(await me(loggedIn.data.accessToken), 200, 'new access remains');
    status(await refresh(loggedIn.data.refreshToken), 200, 'new refresh remains'); rounds.push({ logout: loggedOut.status, login: loggedIn.status });
  }
  return { rounds };
});
await check('logout racing refresh preserves existing exact-token revocation semantics', async () => {
  const rounds = [];
  for (let round = 0; round < 10; round++) {
    const old = shape(await login(account));
    const [loggedOut, refreshed] = await Promise.all([logout(old.accessToken, old.refreshToken), refresh(old.refreshToken)]);
    status(loggedOut, 200, 'racing logout'); assert.ok([200, 401].includes(refreshed.status), 'refresh outcome must match serial order');
    status(await me(old.accessToken), 401, 'old access revoked'); status(await refresh(old.refreshToken), 401, 'old refresh unusable');
    if (refreshed.status === 200) { status(await me(refreshed.data.accessToken), 200, 'rotation-first access retained'); status(await refresh(refreshed.data.refreshToken), 200, 'rotation-first refresh retained'); }
    rounds.push({ logout: loggedOut.status, refresh: refreshed.status });
  }
  return { rounds };
});
await check('duplicate parallel logout with and without refresh is idempotent', async () => {
  const rounds = [];
  for (const withRefresh of [true, false]) {
    for (let round = 0; round < 8; round++) {
      const old = shape(await login(account));
      const responses = await Promise.all(Array.from({ length: 6 }, () => logout(old.accessToken, withRefresh ? old.refreshToken : undefined)));
      assert.ok(responses.every(r => r.status === 200), `parallel logout statuses: ${responses.map(r => r.status).join(',')}`);
      status(await me(old.accessToken), 401, 'access revoked'); status(await refresh(old.refreshToken), withRefresh ? 401 : 200, 'only supplied refresh revoked');
      rounds.push({ withRefresh, statuses: responses.map(r => r.status) });
    }
  }
  return { rounds };
});
await check('crossed-user token logout payloads terminate without deadlock or broader revocation', async () => {
  for (let round = 0; round < 8; round++) {
    const a = shape(await login(account)), b = shape(await login(other));
    const responses = await Promise.all([logout(a.accessToken, b.refreshToken), logout(b.accessToken, a.refreshToken)]);
    assert.ok(responses.every(r => r.status === 200), 'crossed logout outcomes');
    status(await me(a.accessToken), 401, 'A access revoked'); status(await me(b.accessToken), 401, 'B access revoked');
    status(await refresh(a.refreshToken), 401, 'A refresh revoked'); status(await refresh(b.refreshToken), 401, 'B refresh revoked');
  }
  return { rounds: 8 };
});
await check('expired and revoked refresh tokens return 401 on actual database state', async () => {
  const expired = shape(await login(account));
  sql(`UPDATE refresh_tokens SET expiry_date=now()-interval '1 minute' WHERE user_id=${userId(account.id)}`);
  status(await refresh(expired.refreshToken), 401, 'expired refresh');
  const revoked = shape(await login(account));
  sql(`UPDATE refresh_tokens SET revoked=true WHERE user_id=${userId(account.id)}`);
  status(await refresh(revoked.refreshToken), 401, 'revoked refresh');
}, 'HTTP assertions with explicit SQL expiry/revocation fixture');
await check('account lockout retains failed-attempt policy under concurrent wrong passwords', async () => {
  const locked = await createAccount();
  const responses = await Promise.all(Array.from({ length: 5 }, () => call('/api/v1/auth/login', 'POST', { usernameOrEmail: locked.username, password: 'wrong-synthetic-password' })));
  assert.ok(responses.every(r => r.status === 401), 'wrong password status');
  status(await login(locked), 401, 'valid password remains blocked during lockout');
  return { wrongPasswordStatuses: responses.map(r => r.status) };
});
const final = { status: results.every(r => r.status === 'PASS') ? 'PASS' : 'FAIL', phase,
  scope: 'Actual HTTP/PostgreSQL authentication and concurrency; not browser coverage. Synthetic users only; no auth response bodies/tokens/credentials stored.',
  results, requests, secretValuesRecorded: false };
await fs.writeFile(`${work}/api-auth-${phase}-result.json`, JSON.stringify(final, null, 2));
console.log('RESULT', final.status, results.filter(r => r.status === 'PASS').length, '/', results.length);
if (final.status !== 'PASS') process.exitCode = 1;
