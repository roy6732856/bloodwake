import { sanitizeSave } from './progression.js';

export const CLOUD_KEY = 'bloodwake.cloud.v1';
export const BACKUP_KEY = 'bloodwake.backup.v1';
const equal = (a, b) => JSON.stringify(sanitizeSave(a)) === JSON.stringify(sanitizeSave(b));
export const normalizeCode = code => String(code).trim().toUpperCase().replace(/\s/g, '');
export const validCode = code => /^BW-[A-F0-9]{64}$/.test(code);
export class CloudSave {
  constructor({ getSave, applySave, canApply = () => true, onStatus = () => {}, storage = localStorage, fetcher = (...args) => fetch(...args) }) {
    Object.assign(this, { getSave, applySave, canApply, onStatus, storage, fetcher });
    this.state = {}; this.status = 'local'; this.available = false; this.busy = false; this.conflict = null; this.message = '';
    try { const data = JSON.parse(storage.getItem(CLOUD_KEY)); if (validCode(data?.code) && Number.isSafeInteger(data.version)) this.state = data; } catch {}
  }
  setStatus(status, message = '') { this.status = status; this.message = message; this.onStatus(this); }
  store() { this.storage.setItem(CLOUD_KEY, JSON.stringify(this.state)); }
  backup() { this.storage.setItem(BACKUP_KEY, JSON.stringify({ savedAt: Date.now(), save: sanitizeSave(this.getSave()) })); }
  async request(method, code = this.state.code, body) {
    const response = await this.fetcher('/api/save', {
      method, headers: { Authorization: `Bearer ${code}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000), cache: 'no-store'
    });
    let result; try { result = await response.json(); } catch { throw new Error('雲端暫時無法連線，本機進度已保留。'); }
    if (response.status === 404) return null;
    if (response.status === 409) return { ...result, conflict: true };
    if (!response.ok) throw new Error('雲端暫時無法同步，本機進度已保留，稍後可重試。');
    return result;
  }
  async init() {
    try { const response = await this.fetcher('/api/health', { signal: AbortSignal.timeout(5000), cache: 'no-store' }); this.available = response.ok && (await response.json()).cloud === true; } catch {}
    if (!this.available) { this.setStatus('unavailable'); return; }
    if (this.state.code) await this.sync(); else this.setStatus('local');
  }
  changed() {
    if (!this.state.code) return;
    if (this.conflict) { this.setStatus('conflict'); return; }
    this.setStatus('pending'); clearTimeout(this.timer);
    this.timer = setTimeout(() => this.sync(), 700);
  }
  accept(record) {
    this.state.version = record.version; this.state.lastSynced = record.save; this.state.updatedAt = record.updatedAt;
    this.state.pending = null; this.store();
  }
  async write() {
    const save = sanitizeSave(this.getSave());
    let pending = this.state.pending;
    if (!pending || pending.version !== this.state.version || !equal(pending.save, save)) {
      pending = { version: this.state.version, save, requestId: crypto.randomUUID() };
      this.state.pending = pending; this.store();
    }
    const result = await this.request('PUT', this.state.code, pending);
    if (!result) throw new Error('找不到這份雲端存檔。本機紀錄仍保留，請檢查復原碼。');
    if (result.conflict) { this.conflict = result; this.setStatus('conflict'); return; }
    this.accept(result); this.setStatus(equal(this.getSave(), result.save) ? 'ready' : 'pending');
  }
  async create() {
    if (this.busy || this.state.code || !this.available) return;
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    this.state = { code: 'BW-' + [...bytes].map(n => n.toString(16).padStart(2, '0')).join('').toUpperCase(), version: 0, lastSynced: null };
    try { this.store(); } catch { this.state = {}; throw new Error('瀏覽器儲存被停用，請先允許儲存，才能安全保留復原碼。'); }
    await this.sync();
  }
  async sync() {
    if (this.busy || !this.available || !this.state.code || this.conflict) return;
    this.busy = true; this.setStatus('syncing');
    try {
      const remote = await this.request('GET');
      if (!remote && this.state.version !== 0) throw new Error('找不到雲端存檔，本機進度仍保留。');
      if (!remote) await this.write();
      else if (equal(this.getSave(), remote.save)) { this.accept(remote); this.setStatus('ready'); }
      else if (this.state.lastSynced && equal(this.getSave(), this.state.lastSynced)) {
        if (this.canApply()) { this.backup(); this.applySave(remote.save); this.accept(remote); this.setStatus('ready'); }
        else this.setStatus('deferred');
      } else if (this.state.lastSynced && equal(remote.save, this.state.lastSynced)) {
        this.state.version = remote.version; await this.write();
      } else if (this.state.pending && equal(remote.save, this.state.pending.save)) {
        // A previous upload succeeded, but its response was lost. Keep any newer
        // local earnings and continue from that acknowledged revision.
        this.accept(remote); await this.write();
      } else { this.conflict = remote; this.setStatus('conflict'); }
    } catch (e) { this.setStatus('pending', e.message); }
    finally { this.busy = false; this.onStatus(this); }
    // Coalesce changes made while the request was in flight; no background polling.
    if (this.status === 'pending' && !this.message) this.changed();
  }
  async previewRestore(code) {
    code = normalizeCode(code);
    if (!validCode(code)) throw new Error('請輸入完整復原碼（BW- 開頭）。');
    const record = await this.request('GET', code);
    if (!record) throw new Error('找不到這組復原碼，請檢查是否完整。');
    return { ...record, code };
  }
  restore(record) {
    if (this.busy || !this.canApply()) throw new Error('請回到主選單，等待同步完成後再取回存檔。');
    this.backup(); this.state = { code: record.code }; this.accept(record);
    this.applySave(record.save); this.conflict = null; this.setStatus('ready');
  }
  async resolve(which) {
    if (this.busy || !this.conflict || !this.canApply()) return;
    const remote = this.conflict;
    this.busy = true;
    try {
      this.backup();
      if (which === 'remote') { this.applySave(remote.save); this.accept(remote); this.conflict = null; this.setStatus('ready'); }
      else { this.state.version = remote.version; this.conflict = null; this.setStatus('syncing'); await this.write(); }
    } catch (e) { this.setStatus('pending', e.message); }
    finally { this.busy = false; this.onStatus(this); }
  }
}
