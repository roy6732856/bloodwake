import { nextPhase, phases, recommend, trials } from './bloodmoon.js';

export class BloodmoonDirector {
  constructor(game){this.game=game;this.reset();}
  reset(){this.phase='observe';this.phaseAge=0;this.pressure=0;this.recentDamage=0;this.sample=0;this.lastKills=0;this.peaks=0;this.breaths=0;this.distance=0;this.damageTaken=0;this.pending=[];this.waves=0;this.nextTrial=35;this.lastHelp=-90;this.gentle=false;this.enabled=true;this.trial='none';}
  start(){this.reset();this.enabled=this.game.loadout.director!=='classic';this.trial=this.game.loadout.trial;this.gentle=recommend(this.game.save.history).opening==='gentle';this.nextTrial=this.trial==='eclipse'?40:35;}
  hurt(amount){this.damageTaken+=amount;this.recentDamage+=amount/this.game.stats.maxHp;}
  get spawn(){return this.enabled?phases[this.phase].spawn:1;}
  event(){return this.enabled&&this.phase==='recover'?'harvest':undefined;}
  update(dt){
    const g=this.game,p=g.hunter.position;
    this.phaseAge+=dt;this.recentDamage=Math.max(0,this.recentDamage-dt*.025);this.sample-=dt;
    if(this.enabled&&this.sample<=0){
      this.sample=2;const nearby=g.enemies.filter(e=>e.hp>0&&Math.hypot(e.mesh.position.x-p.x,e.mesh.position.z-p.z)<5).length;
      const decision=nextPhase({hp:g.hp/g.stats.maxHp,nearby,recentDamage:this.recentDamage,seconds:g.time,kills:g.kills-this.lastKills,previous:this.phase,phaseAge:this.phaseAge,gentle:this.gentle});
      this.lastKills=g.kills;this.pressure=decision.pressure;
      if(decision.phase!==this.phase){this.phase=decision.phase;this.phaseAge=0;if(this.phase==='surge')this.peaks++;if(this.phase==='recover')this.breaths++;g.emit('toast',`血月意志 · ${phases[this.phase].name} — ${phases[this.phase].hint}`);}
      if(this.phase==='recover'&&g.hp/g.stats.maxHp<.4&&g.time-this.lastHelp>=60){
        this.lastHelp=g.time;g.dropGem(p.x,p.z,18,true);g.feedback.rune(p.x,p.z,2,0x75cab3,.8);g.emit('toast','血月餘息 · 一枚恢復結晶出現在腳邊');
      }
    }
    // Selected trials keep their identity in both pacing modes. Waves are deferred
    // during recovery and near bosses; already-announced hazards stay predictable.
    if(this.trial!=='none'&&g.time>=this.nextTrial){
      if((this.enabled&&this.phase==='recover')||g.boss)this.nextTrial=g.time+8;
      else {this.queueTrial();this.nextTrial=g.time+(this.trial==='eclipse'?45:55);}
    }
    for(let i=this.pending.length-1;i>=0;i--){const entry=this.pending[i];entry.left-=dt;if(entry.left>0)continue;
      if(entry.kind==='enemy'){if(g.enemies.filter(e=>e.hp>0).length<90&&Math.hypot(p.x-entry.x,p.z-entry.z)>=5)g.spawnEnemy(entry.type,entry.x,entry.z);}
      else g.encounters.warning(p.x,p.z,2.4);
      this.pending.splice(i,1);
    }
  }
  queueTrial(){
    const g=this.game,p=g.hunter.position;this.waves++;
    if(this.trial==='eclipse'){
      g.emit('toast','星蝕試煉 · 三輪星雨將至，保持移動');
      for(let i=0;i<3;i++)this.pending.push({kind:'meteor',left:2+i*1.8});return;
    }
    g.emit('toast','獵殺印記 · 金色裂隙將有敵人現身，留意缺口');
    const base=Math.random()*Math.PI*2;
    for(let i=0;i<3;i++){
      const a=base+i*Math.PI*.45,x=Math.max(-25,Math.min(25,p.x+Math.cos(a)*13)),z=Math.max(-25,Math.min(25,p.z+Math.sin(a)*13));
      if(Math.hypot(x-p.x,z-p.z)<9||g.obstacles.some(o=>Math.hypot(o.x-x,o.z-z)<o.r+1))continue;
      g.feedback.rune(x,z,1.6,0xf2c57c,2.5);g.ring(x,z,0xf2c57c,1.6,2.5);
      this.pending.push({kind:'enemy',type:g.time>90?'charger':'bat',x,z,left:2.5});
    }
  }
  snapshot(){return {enabled:this.enabled,name:this.enabled?phases[this.phase].name:'經典節奏',hint:this.enabled?phases[this.phase].hint:'固定敵潮節奏',phase:this.phase,pressure:this.pressure,peaks:this.peaks,breaths:this.breaths,waves:this.waves,trial:trials.find(t=>t.id===this.trial)?.name||'自由狩獵'};}
}
