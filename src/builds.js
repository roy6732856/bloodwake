import {upgrades} from './progression.js';
export const slotLimits={main:4,support:3,effect:3};
export const categoryNames={main:'主技能',support:'輔助',effect:'附加效果'};
const main=[
 {id:'armament',name:'手持武器',symbol:'Ⅱ',description:'手持武器傷害 +12%；滿階後可搭配輔助進化。',apply:s=>s.damage*=1.12},
 {id:'orbit',name:'環月飛刃',symbol:'◈',description:'增加 1 枚環繞飛刃，切割近身敵人。',support:'magnet',evolution:'月輪聖域',change:'雙環飛刃、更寬的守護範圍。',apply:s=>s.orbit++},
 {id:'storm',name:'落雷印記',symbol:'ϟ',description:'自動向最近敵人降下雷擊；每階增加傷害與連鎖數。',support:'wisdom',evolution:'雷霆審判',change:'雷擊跳躍更多目標，末端炸出雷域。',apply:()=>{}},
 {id:'ember',name:'餘燼火瓶',symbol:'♨',description:'自動在敵人腳下留下焰池；每階增加範圍、傷害與持續時間。',support:'regen',evolution:'不熄獄火',change:'同時生成三處持續更久的焰池。',apply:()=>{}},
 {id:'scythe',name:'血弧鐮刃',symbol:'☽',description:'定期沿瞄準方向斬出扇形血弧；每階提高範圍與傷害。',support:'health',evolution:'赤月收割',change:'血弧擴展成全周斬擊，命中時少量回血。',apply:()=>{}},
 {id:'comet',name:'星隕追獵',symbol:'✦',description:'自動發射追蹤星彈；每階提高傷害，三階後增加彈數。',support:'damage',evolution:'群星墜落',change:'三枚追蹤星彈，命中爆炸波及周圍敵人。',apply:()=>{}},
].map(u=>({...u,category:'main',type:'主技能',max:5}));
const supports=new Set(['damage','rate','health','magnet','wisdom','regen','pierce']);
export const buildUpgrades=[...main,...upgrades.filter(u=>u.id!=='orbit').map(u=>({...u,max:Math.min(3,u.max),category:supports.has(u.id)?'support':'effect'}))];
export function skillName(u,weapon){return u.id==='armament'?weapon.name:u.name;}
export function recipeFor(u,weapon){return u.id==='armament'?{support:{pistols:'rate',shotgun:'health',crossbow:'pierce'}[weapon.id],evolution:weapon.evolution.name,change:weapon.evolution.description}:u.support?u:null;}
export function ownedIn(ranks,category){return buildUpgrades.filter(u=>u.category===category&&(ranks[u.id]||0)>0);}
export function buildChoices(ranks,random=Math.random){
 const counts=Object.fromEntries(Object.keys(slotLimits).map(c=>[c,ownedIn(ranks,c).length]));
 const pool=buildUpgrades.filter(u=>(ranks[u.id]||0)<u.max&&((ranks[u.id]||0)>0||counts[u.category]<slotLimits[u.category]));
 for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
 // Keep one owned main skill upgrade available, so dilution cannot stall the core build.
 const anchor=pool.find(u=>u.category==='main'&&ranks[u.id]>0);return anchor?[anchor,...pool.filter(u=>u!==anchor).slice(0,2)]:pool.slice(0,3);
}
export function readyEvolutions(ranks,weapon,evolved={}){return main.filter(u=>{const r=recipeFor(u,weapon);return r&&!evolved[u.id]&&(ranks[u.id]||0)>=u.max&&(ranks[r.support]||0)>=1;});}
