// Original, locally synthesized scores. No streaming, tracking or remote inference.
export const themes = {
  hunter: { name: '灰燼聖歌', subtitle: '低音鼓 · 銅鐘 · 暗潮', bpm: 76, root: 38, scale: [0, 3, 7, 10, 12, 7, 3, 2], chords: [0, -2, 3, -5] },
  shade: { name: '紫夜疾行', subtitle: '碎拍 · 撥弦 · 迷霧', bpm: 108, root: 45, scale: [0, 7, 10, 12, 3, 7, 14, 10], chords: [0, 3, -2, -5] },
  oracle: { name: '月蝕祈禱', subtitle: '空靈合音 · 水晶鐘', bpm: 64, root: 43, scale: [0, 7, 12, 14, 15, 14, 7, 3], chords: [0, -5, 3, -2] },
};
const hz = midi => 440 * 2 ** ((midi - 69) / 12);
export class ThemeMusic {
  constructor(sound, onChange = () => {}) {
    this.sound = sound; this.onChange = onChange; this.role = 'hunter'; this.volume = .45;
    this.playing = false; this.nodes = new Set(); this.step = 0;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.halt(); else if (this.playing) this.begin();
    });
  }
  async toggle() {
    if (this.playing) { this.playing = false; this.halt(); this.onChange(); return; }
    this.sound.unlock(); const ctx = this.sound.ctx;
    if (!ctx) return false;
    try { await ctx.resume(); } catch { return false; }
    if (ctx.state !== 'running') return false;
    if (!this.master) {
      this.master = ctx.createGain(); this.master.gain.value = this.volume * .3;
      this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 64;
      this.bins = new Uint8Array(this.analyser.frequencyBinCount);
      const limiter = ctx.createDynamicsCompressor(); limiter.threshold.value = -12;
      this.master.connect(limiter).connect(this.analyser).connect(ctx.destination);
    }
    this.playing = true; this.begin(); this.onChange(); return true;
  }
  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, Number(value) || 0));
    this.master?.gain.setTargetAtTime(this.volume * .3, this.sound.ctx.currentTime, .08);
  }
  select(role) {
    if (!themes[role] || this.role === role) return;
    this.role = role; this.halt(); if (this.playing && !document.hidden) this.begin(); this.onChange();
  }
  halt() {
    clearInterval(this.timer); this.timer = null;
    for (const item of this.nodes) {
      const now = this.sound.ctx.currentTime;
      item.gain.gain.cancelScheduledValues(now); item.gain.gain.setTargetAtTime(0, now, .035);
      try { item.osc.stop(now + .2); } catch { /* already ended */ }
    }
  }
  begin() {
    if (!this.master || this.timer || document.hidden) return;
    this.step = 0; this.next = this.sound.ctx.currentTime + .06;
    this.schedule(); this.timer = setInterval(() => this.schedule(), 100);
  }
  note(midi, start, duration, volume, kind = 'sine', detune = 0) {
    const ctx = this.sound.ctx, osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = kind; osc.frequency.value = hz(midi); osc.detune.value = detune;
    gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(volume, start + Math.min(.15, duration * .2));
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    osc.connect(gain).connect(this.master); const item = { osc, gain }; this.nodes.add(item);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); this.nodes.delete(item); };
    osc.start(start); osc.stop(start + duration + .04);
  }
  drum(start, accent) {
    const ctx = this.sound.ctx, osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.frequency.setValueAtTime(accent ? 108 : 180, start); osc.frequency.exponentialRampToValueAtTime(35, start + .24);
    gain.gain.setValueAtTime(accent ? .48 : .15, start); gain.gain.exponentialRampToValueAtTime(.0001, start + .4);
    osc.connect(gain).connect(this.master); const item = { osc, gain }; this.nodes.add(item);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); this.nodes.delete(item); };
    osc.start(start); osc.stop(start + .42);
  }
  schedule() {
    const ctx = this.sound.ctx, t = themes[this.role], beat = 60 / t.bpm, interval = beat / 2;
    if (ctx.state !== 'running') return;
    if (this.next < ctx.currentTime) this.next = ctx.currentTime + .03;
    while (this.next < ctx.currentTime + .22) {
      const n = this.step, at = this.next, root = t.root + t.chords[Math.floor(n / 32) % 4];
      if (n % 16 === 0) for (const offset of [0, 7, 15]) {
        this.note(root + offset + 12, at, beat * 7.8, .11, 'sine', -4);
        this.note(root + offset + 12, at, beat * 7.8, .055, 'triangle', 4);
      }
      if (n % 4 === 0) this.note(root - 12, at, beat * 1.8, .25, 'triangle');
      if (this.role === 'shade' || n % 2 === 0) {
        const pitch = root + 24 + t.scale[Math.floor(n / (this.role === 'shade' ? 1 : 2)) % 8];
        this.note(pitch, at, beat * 1.5, .15, 'sine');
        this.note(pitch, at + beat * .75, beat, .045, 'sine');
      }
      if (this.role !== 'oracle' && (n % 8 === 0 || (this.role === 'shade' && n % 8 === 5))) this.drum(at, n % 8 === 0);
      this.next += interval; this.step++;
    }
  }
  levels() {
    if (!this.playing || !this.analyser || document.hidden) return null;
    this.analyser.getByteFrequencyData(this.bins); return this.bins;
  }
}
