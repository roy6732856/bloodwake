import {mapId,missionId} from './world-content.js';
// Local, explainable recommendations. No language-model calls or paid inference.
export const trials = [
  {id:'none',name:'自由狩獵',description:'維持所選契約，專注完成自己的流派。',reward:1},
  {id:'pursuit',name:'獵殺印記',description:'每 55 秒出現預警包抄；額外殘魂 +20%。',reward:1.2},
  {id:'eclipse',name:'星蝕試煉',description:'每 45 秒追加三輪星雨預警；額外殘魂 +25%。',reward:1.25},
];
const int=(v,max)=>Math.max(0,Math.min(max,Math.floor(Number(v)||0)));
export function sanitizeHistory(raw){
  if(!Array.isArray(raw))return [];
  const seen=new Set();
  return raw.slice(-6).filter(r=>r&&typeof r.id==='string'&&/^[a-f0-9-]{36}$/.test(r.id)&&!seen.has(r.id)&&seen.add(r.id)).map(r=>({
    id:r.id,time:int(r.time,300),kills:int(r.kills,100000),win:r.win===true,
    map:mapId(r.map),mission:missionId(r.mission),hunter:['hunter','shade','oracle','pyre','sentinel'].includes(r.hunter)?r.hunter:'hunter',
    weapon:['pistols','shotgun','crossbow'].includes(r.weapon)?r.weapon:'pistols',
    trial:trials.some(t=>t.id===r.trial)?r.trial:'none',mode:r.mode==='classic'?'classic':'adaptive',
    damage:int(r.damage,100000),distance:int(r.distance,10000),dashes:int(r.dashes,1000),
    peaks:int(r.peaks,100),breaths:int(r.breaths,100),abandoned:r.abandoned===true,
    rating:['easy','fair','hard'].includes(r.rating)?r.rating:null
  }));
}
export function recordRun(save,result){
  save.history=sanitizeHistory(save.history);
  if(save.history.some(r=>r.id===result.runId))return;
  save.history=sanitizeHistory([...save.history,{id:result.runId,time:result.time,kills:result.kills,win:result.win,
    weapon:result.weaponId,map:result.map,mission:result.mission,hunter:result.hunter,trial:result.trial,mode:result.mode,damage:result.damageTaken,distance:result.distance,
    dashes:result.dashes,peaks:result.director?.peaks,breaths:result.director?.breaths,abandoned:result.abandoned,rating:null}]);
}
export function rateRun(save,id,rating){
  const run=save.history?.find(r=>r.id===id);
  if(!run||!['easy','fair','hard'].includes(rating))return false;
  run.rating=rating;return true;
}
export function recommend(history){
  const runs=sanitizeHistory(history).filter(r=>!r.abandoned&&(r.time>=15||r.rating));
  const recent=runs.slice(-3),last=recent.at(-1);
  if(!last)return {trial:'none',weapon:'pistols',confidence:'初次相遇',reason:'先完成一局自由狩獵，血月會記住你的存活、走位與感受。',opening:'steady'};
  const struggling=last.rating==='hard'||recent.filter(r=>!r.win&&r.time<90).length>=2;
  if(struggling)return {trial:'none',weapon:'pistols',confidence:`參考 ${runs.length} 局`,reason:'最近的戰鬥壓力較高。建議自由狩獵；血月模式會給你較舒緩的開場。',opening:'gentle'};
  const ready=last.rating==='easy'||recent.filter(r=>r.win).length>=2;
  const mobile=recent.reduce((n,r)=>n+r.distance,0)/Math.max(1,recent.reduce((n,r)=>n+r.time,0))>2.5;
  if(ready)return {trial:mobile?'pursuit':'eclipse',weapon:mobile?'crossbow':'shotgun',confidence:`參考 ${runs.length} 局`,reason:mobile?'你已能穩定走位。試試有預警的包抄與貫穿箭，挑戰更高收益。':'你已熟悉獵場。試試星雨走位與近距散射，增加戰鬥變化。',opening:'steady'};
  return {trial:'none',weapon:last.weapon==='pistols'?'crossbow':'pistols',confidence:`參考 ${runs.length} 局`,reason:'先維持目前壓力，換一把兵器探索新的進化路線。試煉由你自行選擇。',opening:'steady'};
}
export function nextPhase({hp,nearby,recentDamage,seconds,kills,previous,phaseAge,gentle}){
  const pressure=Math.min(1,(1-hp)*.5+Math.min(1,nearby/8)*.25+Math.min(1,recentDamage/.35)*.25);
  if(hp<.25&&seconds>5)return {phase:'recover',pressure};
  if(seconds<25)return {phase:gentle?'recover':'observe',pressure};
  if(phaseAge<12)return {phase:previous,pressure};
  if(hp<.35||pressure>.62)return {phase:'recover',pressure};
  if(previous==='surge')return {phase:'recover',pressure};
  if(previous==='recover'&&phaseAge<20)return {phase:'recover',pressure};
  return {phase:hp>.65&&nearby<6&&kills>=3?'surge':'observe',pressure};
}
export const phases={observe:{name:'窺視',hint:'血月正在觀察你的步伐',spawn:1},surge:{name:'獵潮',hint:'敵潮加速，讓你的流派盡情發揮',spawn:1.18},recover:{name:'餘息',hint:'新敵湧入放緩，整理戰場與拾取靈魂',spawn:.65}};
