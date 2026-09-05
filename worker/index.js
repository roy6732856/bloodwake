import { sanitizeSave } from '../src/progression.js';

const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });
const snapshot = row => ({ save: JSON.parse(row.save_json), version: row.version, updatedAt: row.updated_at });
export function validSave(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const clean = sanitizeSave(value);
  return ['souls', 'best', 'runs', 'wins'].every(k => Number.isInteger(value[k]) && value[k] === clean[k]) &&
    value.wins <= value.runs && value.ranks && ['power', 'vitality', 'reach'].every(k => value.ranks[k] === clean.ranks[k]) &&
    Array.isArray(value.achievements) && value.achievements.length === clean.achievements.length && value.achievements.every(x => clean.achievements.includes(x));
}
async function readBody(request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new Error('content-type');
  if (Number(request.headers.get('content-length')) > 4096) throw new Error('body-size');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('body');
  const chunks = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > 4096) { await reader.cancel(); throw new Error('body-size'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let at = 0;
  for (const c of chunks) { bytes.set(c, at); at += c.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}
async function api(request, env) {
  const url = new URL(request.url), path = url.pathname;
  if (path === '/api/health' && request.method === 'GET') return json({ cloud: Boolean(env.DB), schema: 1, version: '0.6.0' });
  if (path !== '/api/save') return json({ error: 'not_found' }, 404);
  if (!['GET', 'PUT'].includes(request.method)) return json({ error: 'method_not_allowed' }, 405);
  if (request.method === 'PUT' && request.headers.get('origin') !== url.origin) return json({ error: 'origin' }, 403);
  if (!env.DB) return json({ error: 'unavailable' }, 503);
  const token = request.headers.get('authorization')?.match(/^Bearer (BW-[A-F0-9]{64})$/)?.[1];
  if (!token) return json({ error: 'unauthorized' }, 401);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const hash = [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join('');
  const find = () => env.DB.prepare('SELECT version, save_json, last_request, updated_at FROM cloud_saves WHERE token_hash = ?').bind(hash).first();
  if (request.method === 'GET') {
    const row = await find();
    return row ? json(snapshot(row)) : json({ error: 'not_found' }, 404);
  }
  let body;
  try { body = await readBody(request); } catch { return json({ error: 'invalid_body' }, 400); }
  if (!Number.isSafeInteger(body?.version) || body.version < 0 ||
      !/^[a-f0-9-]{36}$/.test(body.requestId || '') || !validSave(body.save)) return json({ error: 'invalid_save' }, 400);
  const clean = sanitizeSave(body.save);
  const missingHistory = !Object.hasOwn(body.save, 'history');
  const missingExpedition = Array.isArray(body.save.history) && body.save.history.some(r => r && ['map','mission','hunter'].some(k => !Object.hasOwn(r,k)));
  if (body.version > 0 && (missingHistory || missingExpedition)) {
    const previous = await find();
    if (previous) {
      const history = sanitizeSave(JSON.parse(previous.save_json)).history;
      if (missingHistory) clean.history = history;
      else for (const entry of clean.history) {
        const original = body.save.history.find(r => r?.id === entry.id), saved = history.find(r => r.id === entry.id);
        if (original && saved) for (const key of ['map','mission','hunter']) if (!Object.hasOwn(original,key)) entry[key] = saved[key];
      }
    }
  }
  const saveJSON = JSON.stringify(clean), now = Date.now();
  // A compare-and-swap prevents two devices from silently replacing each other.
  let result;
  if (body.version === 0) {
    result = await env.DB.prepare('INSERT OR IGNORE INTO cloud_saves (token_hash, version, save_json, last_request, updated_at) VALUES (?, 1, ?, ?, ?) RETURNING version, save_json, updated_at')
      .bind(hash, saveJSON, body.requestId, now).first();
  } else {
    result = await env.DB.prepare('UPDATE cloud_saves SET save_json = ?, version = version + 1, last_request = ?, updated_at = ? WHERE token_hash = ? AND version = ? RETURNING version, save_json, updated_at')
      .bind(saveJSON, body.requestId, now, hash, body.version).first();
  }
  if (result) return json(snapshot(result));
  const current = await find();
  if (!current) return json({ error: 'not_found' }, 404);
  // Retrying an acknowledged-but-lost response must not create another revision.
  if (current.last_request === body.requestId) return json(snapshot(current));
  return json({ error: 'conflict', ...snapshot(current) }, 409);
}
export default {
  async fetch(request, env) {
    if (!new URL(request.url).pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try { return await api(request, env); }
    catch { return json({ error: 'temporarily_unavailable' }, 503); }
  }
};
