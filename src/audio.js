export class Sound {
  enabled = true;
  ctx = null;
  unlock() { try { this.ctx ||= new (window.AudioContext || window.webkitAudioContext)(); if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); } catch { this.enabled = false; } }
  tone(frequency, duration, volume = .04, kind = 'sine', end = frequency) {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(), t = this.ctx.currentTime;
    o.type = kind; o.frequency.setValueAtTime(frequency, t); o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);
    g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(this.ctx.destination);o.start(t);o.stop(t+duration);
  }
  shoot(weapon='pistols'){if(weapon==='shotgun'){this.tone(110,.18,.06,'sawtooth',24);this.tone(1700,.065,.018,'square',150);}else if(weapon==='crossbow'){this.tone(430,.13,.035,'triangle',85);this.tone(1600,.09,.016,'sine',350);}else this.tone(210,.075,.025,'triangle',45)}
  crit(){this.tone(840,.055,.03,'triangle',430)}
  evolve(){[220,330,440,660,880].forEach((f,i)=>setTimeout(()=>this.tone(f,.4,.045,'triangle'),i*80))}
  hit(){this.tone(95,.09,.025,'square',35)}
  pickup(){this.tone(720,.075,.013,'sine',1100)}
  dash(){this.tone(190,.2,.035,'sawtooth',40)}
  nova(){this.tone(160,.55,.08,'triangle',30)}
  hurt(){this.tone(65,.22,.065,'sawtooth',25)}
  level(){[440,554,659,880].forEach((f,i)=>setTimeout(()=>this.tone(f,.22,.04),i*85))}
}
