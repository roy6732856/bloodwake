import test from 'node:test';
import assert from 'node:assert/strict';
import {buildChoices,buildUpgrades,readyEvolutions,recipeFor,ownedIn,slotLimits} from '../src/builds.js';
import {weapons} from '../src/content.js';
test('full slots reject new skills but still offer owned upgrades',()=>{
 const ranks={armament:2,orbit:1,storm:2,ember:1,health:1,rate:1,magnet:1,crit:1,burn:1,frost:1};
 for(let i=0;i<100;i++){const options=buildChoices(ranks);assert.equal(options.length,3);assert.equal(new Set(options.map(x=>x.id)).size,3);assert.ok(options.every(u=>ranks[u.id]>0));assert.ok(options.some(u=>u.category==='main'));}
});
test('every recipe needs a maxed main and the correct support, either acquisition order works',()=>{
 for(const weapon of weapons)for(const u of buildUpgrades.filter(u=>u.category==='main')){const r=recipeFor(u,weapon);assert.ok(r);assert.ok(!readyEvolutions({[u.id]:4,[r.support]:1},weapon).includes(u));assert.ok(!readyEvolutions({[u.id]:5},weapon).includes(u));assert.ok(readyEvolutions({[u.id]:5,[r.support]:1},weapon).includes(u));assert.ok(!readyEvolutions({[u.id]:5,[r.support]:1},weapon,{[u.id]:true}).includes(u));}
});
test('random runs preserve slot caps, max ranks and eventually exhaust eligible cards',()=>{
 for(let run=0;run<30;run++){const ranks={armament:1};for(let i=0;i<120;i++){const choices=buildChoices(ranks);if(!choices.length)break;const u=choices[Math.floor(Math.random()*choices.length)];ranks[u.id]=(ranks[u.id]||0)+1;assert.ok(ranks[u.id]<=u.max);for(const [c,n]of Object.entries(slotLimits))assert.ok(ownedIn(ranks,c).length<=n);}assert.equal(buildChoices(ranks).length,0);}
});
