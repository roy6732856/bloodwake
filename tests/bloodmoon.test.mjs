import test from 'node:test';
import assert from 'node:assert/strict';
import { recommend, sanitizeHistory, recordRun, rateRun, nextPhase, phases } from '../src/bloodmoon.js';
import { blankSave, sanitizeSave, settleRun } from '../src/progression.js';
import { BloodmoonDirector } from '../src/director.js';
const run=overrides=>({id:crypto.randomUUID(),time:300,kills:350,win:true,weapon:'pistols',distance:1300,...overrides});
test('History is bounded, deduplicated, sanitized and survives old-save migration',()=>{
  const r=run({damage:Infinity,rating:'invented'}),history=sanitizeHistory([r,r,...Array.from({length:9},()=>run())]);
  assert.equal(history.length,6);assert.equal(new Set(history.map(r=>r.id)).size,6);
  assert.deepEqual(sanitizeSave({souls:42}).history,[]);assert.equal(sanitizeSave({souls:42}).souls,42);
  assert.equal(sanitizeHistory([r])[0].rating,null);
  assert.ok(JSON.stringify({save:{...blankSave(),history},requestId:crypto.randomUUID(),version:100}).length<4096);
});
test('Recommendations respond to feedback and completed history without treating abandoned runs as failure',()=>{
  assert.equal(recommend([]).trial,'none');
  assert.equal(recommend([run({rating:'hard'})]).opening,'gentle');
  assert.equal(recommend([run({time:8,rating:'hard',win:false})]).opening,'gentle');
  assert.equal(recommend([run(),run()]).trial,'pursuit');
  assert.equal(recommend([run({rating:'easy',distance:20})]).trial,'eclipse');
  assert.equal(recommend([run({rating:'hard',abandoned:true})]).opening,'steady');
  assert.equal(recommend([run({time:30,win:false}),run({time:45,win:false})]).opening,'gentle');
});
test('Run feedback is editable without repeating history or granting currency',()=>{
  const save=blankSave(),result={runId:crypto.randomUUID(),time:100,kills:100,weaponId:'shotgun',mode:'adaptive',trial:'pursuit'};
  recordRun(save,result);recordRun(save,result);assert.equal(save.history.length,1);
  assert.ok(rateRun(save,result.runId,'hard'));assert.ok(rateRun(save,result.runId,'fair'));
  assert.equal(save.history[0].rating,'fair');assert.equal(save.souls,0);assert.equal(rateRun(save,'missing','easy'),false);
});
test('Pacing has bounded pressure, a recovery interval and an immediate critical-health escape',()=>{
  const input={hp:1,nearby:0,recentDamage:0,seconds:40,kills:10,previous:'observe',phaseAge:20,gentle:false};
  assert.equal(nextPhase(input).phase,'surge');
  assert.equal(nextPhase({...input,previous:'surge'}).phase,'recover');
  assert.equal(nextPhase({...input,previous:'recover',phaseAge:15}).phase,'recover');
  assert.equal(nextPhase({...input,hp:.1,seconds:8,phaseAge:2}).phase,'recover');
  for(const p of Object.values(phases))assert.ok(p.spawn>=.65&&p.spawn<=1.18);
});
test('Trial rewards multiply the contract and invalid trials cannot mint a bonus',()=>{
  const result={kills:80,time:100,win:false,contract:'swarm'};
  assert.equal(settleRun(blankSave(),{...result,trial:'pursuit'}),24);
  assert.equal(settleRun(blankSave(),{...result,trial:'invalid'}),20);
});
function stub(mode='adaptive',trial='pursuit'){
  const game={save:blankSave(),loadout:{director:mode,trial},time:35,hp:100,stats:{maxHp:100},kills:0,enemies:[],boss:null,obstacles:[],hunter:{position:{x:0,z:0}},emit(){},feedback:{rune(){}},ring(){},spawnEnemy(type,x,z){this.enemies.push({type,hp:100,mesh:{position:{x,z}}});},dropGem(){this.heals=(this.heals||0)+1;},encounters:{warning(){game.warnings=(game.warnings||0)+1;}}};
  game.director=new BloodmoonDirector(game);game.director.start();return game;
}
test('Flanks announce for 2.5 seconds, preserve space, obey enemy caps and reset',()=>{
  const g=stub();g.director.update(.1);assert.equal(g.enemies.length,0);assert.ok(g.director.pending.length>0);
  for(const p of g.director.pending)assert.ok(Math.hypot(p.x,p.z)>=9);
  g.director.update(2.5);assert.ok(g.enemies.length>0&&g.enemies.length<=3);
  g.enemies=Array.from({length:90},()=>({hp:1,mesh:{position:{x:20,z:20}}}));g.director.queueTrial();g.director.update(3);assert.equal(g.enemies.length,90);
  g.director.reset();assert.equal(g.director.pending.length,0);assert.equal(g.director.damageTaken,0);
});
test('Classic mode preserves spawn pace and gives no adaptive health assistance',()=>{
  const g=stub('classic','none');g.hp=10;g.director.hurt(90);g.director.update(20);
  assert.equal(g.director.spawn,1);assert.equal(g.heals,undefined);assert.equal(g.director.event(),undefined);
});
test('Recovery supplies are limited and eclipse hazards retain their warning sequence',()=>{
  const g=stub('adaptive','none');g.hp=10;g.director.update(2);assert.equal(g.heals,1);
  g.director.update(2);assert.equal(g.heals,1);
  const e=stub('classic','eclipse');e.time=40;e.director.update(.1);assert.equal(e.warnings,undefined);
  e.director.update(2);assert.equal(e.warnings,1);e.director.update(4);assert.equal(e.warnings,3);
});
