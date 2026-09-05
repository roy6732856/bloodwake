import assert from 'node:assert/strict';
import { CloudSave, BACKUP_KEY } from '../src/cloud-save.js';
import { blankSave } from '../src/progression.js';

// Real Workers runtime + real local D1 (start npm run dev:cloud first).
// Intentionally local: this suite never writes to production player records.
const origin = 'http://127.0.0.1:8787';
let count = 0;
const test = async (name, fn) => { await fn(); console.log(`PASS ${++count}: ${name}`); };
const code = () => 'BW-' + [...crypto.getRandomValues(new Uint8Array(32))].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
const token = code();
const call = (method, body, auth = token, extra = {}) => fetch(origin + '/api/save', {
  method, headers: { Authorization: `Bearer ${auth}`, Origin: origin, 'Content-Type': 'application/json', ...extra },
  ...(body !== undefined ? { body: JSON.stringify(body) } : {})
});
const body = (version, save = blankSave()) => ({ version, save, requestId: crypto.randomUUID() });
function device() {
  let save = blankSave(), online = true, dropResponse = false, canApply = true;
  const values = new Map(), storage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const cloud = new CloudSave({ getSave: () => save, applySave: s => { save = structuredClone(s); }, canApply: () => canApply, storage,
    fetcher: async (path, options = {}) => {
      if (!online) throw new Error('offline');
      const result = await fetch(origin + path, { ...options, headers: { ...options.headers, Origin: origin } });
      if (dropResponse && options.method === 'PUT') { dropResponse = false; throw new Error('response lost'); }
      return result;
    }
  });
  return { cloud, storage, get save() { return save; }, offline: value => { online = !value; }, loseResponse: () => { dropResponse = true; }, canApply: value => { canApply = value; } };
}
await test('Production assets load; private project files stay outside asset bundle', async () => {
  const response = await fetch(origin); assert.equal(response.status, 200); assert.match(await response.text(), /BLOODWAKE/);
  assert.match(response.headers.get('content-security-policy'), /script-src 'self'/);
  for (const p of ['/wrangler.jsonc', '/package.json', '/tests/browser.html', '/.git/config']) assert.equal((await fetch(origin + p)).status, 404, p);
});
await test('API rejects missing auth, foreign origin, malformed and oversized saves', async () => {
  assert.equal((await call('GET', undefined, '')).status, 401);
  assert.equal((await call('PUT', body(0), token, { Origin: 'https://foreign.invalid' })).status, 403);
  assert.equal((await call('PUT', body(0, { ...blankSave(), souls: -1 }))).status, 400);
  assert.equal((await call('PUT', { ...body(0), extra: 'a'.repeat(5000) })).status, 400);
  assert.equal((await call('GET')).status, 404);
});
await test('D1 creates, reads, isolates players and idempotently retries writes', async () => {
  const first = body(0, { ...blankSave(), souls: 30 });
  assert.equal((await (await call('PUT', first)).json()).version, 1);
  assert.equal((await (await call('PUT', first)).json()).version, 1);
  assert.equal((await (await call('GET')).json()).save.souls, 30);
  assert.equal((await call('GET', undefined, code())).status, 404);
});
await test('Competing D1 writes use compare-and-swap and preserve the winner', async () => {
  const results = await Promise.all([call('PUT', body(1, { ...blankSave(), souls: 50 })), call('PUT', body(1, { ...blankSave(), souls: 90 }))]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  const current = await (await call('GET')).json(); assert.equal(current.version, 2); assert.ok([50, 90].includes(current.save.souls));
});
const a = device(), b = device();
await test('Client uploads old local progress and another device recovers it', async () => {
  a.save.souls = 80; a.save.runs = 2; a.save.ranks.power = 1;
  await a.cloud.init(); await a.cloud.create(); assert.equal(a.cloud.status, 'ready');
  await b.cloud.init(); const preview = await b.cloud.previewRestore(a.cloud.state.code.toLowerCase()); b.cloud.restore(preview);
  assert.deepEqual(b.save, a.save); assert.ok(b.storage.getItem(BACKUP_KEY));
});
await test('Unchanged local progress pulls updates, but waits while playing', async () => {
  a.save.souls += 10; await a.cloud.sync(); b.canApply(false); await b.cloud.sync();
  assert.equal(b.cloud.status, 'deferred'); assert.equal(b.save.souls, 80);
  b.canApply(true); await b.cloud.sync(); assert.equal(b.save.souls, 90);
});
await test('Offline earnings survive and two divergent devices require a choice', async () => {
  a.offline(true); a.save.souls += 20; await a.cloud.sync(); assert.equal(a.cloud.status, 'pending'); assert.equal(a.save.souls, 110);
  b.save.souls += 5; await b.cloud.sync(); a.offline(false); await a.cloud.sync();
  assert.equal(a.cloud.status, 'conflict'); assert.equal(a.save.souls, 110); assert.equal(a.cloud.conflict.save.souls, 95);
  await a.cloud.resolve('local'); assert.equal(a.cloud.status, 'ready'); await b.cloud.sync(); assert.equal(b.save.souls, 110);
});
await test('Lost response followed by newer earnings retries without dropping or doubling rewards', async () => {
  const version = a.cloud.state.version;
  a.save.souls += 10; a.loseResponse(); await a.cloud.sync(); assert.equal(a.cloud.status, 'pending');
  a.save.souls += 7; await a.cloud.sync(); assert.equal(a.cloud.status, 'ready'); assert.equal(a.save.souls, 127);
  assert.equal(a.cloud.state.version, version + 2); await b.cloud.sync(); assert.equal(b.save.souls, 127);
});
await test('Cloud choice keeps a recoverable backup of local progress', async () => {
  a.save.souls += 3; b.save.souls += 8; await a.cloud.sync(); await b.cloud.sync(); assert.equal(b.cloud.status, 'conflict');
  await b.cloud.resolve('remote'); assert.equal(b.save.souls, 130); assert.equal(JSON.parse(b.storage.getItem(BACKUP_KEY)).save.souls, 135);
});
clearTimeout(a.cloud.timer); clearTimeout(b.cloud.timer);
console.log(`${count} cloud integration checks passed against local Workers + D1.`);
