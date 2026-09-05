export const maps=[
  {id:'graveyard',name:'血月墓園',image:'bloodmoon.png',description:'墓碑與拱門之間的開放獵場，適合熟悉兵器。',color:0x0b131d},
  {id:'foundry',name:'熔爐工坊',image:'foundry-v06.png',description:'熔流切割戰場；噴發前有兩秒預警，從三處橋面穿越。',color:0x1c1412},
  {id:'glacier',name:'冰晶迴廊',image:'glacier-v06.png',description:'晶柱改變路線；寒霜區週期甦醒，在區域內移速降低。',color:0x112433},
];
export const missions=[
  {id:'survival',name:'自由生存',description:'存活五分鐘即可勝利，適合探索新搭配。',reward:1},
  {id:'hunt',name:'首領追獵',description:'擊倒三名標記首領並存活五分鐘。殘魂 +25%。',reward:1.25},
  {id:'ritual',name:'封印儀式',description:'依序淨化三座祭壇並存活五分鐘。清空附近敵人，再站入圈內八秒。殘魂 +30%。',reward:1.3},
];
export const mapId=id=>maps.some(m=>m.id===id)?id:'graveyard';
export const missionId=id=>missions.some(m=>m.id===id)?id:'survival';
export function terrainPhase(map,time){
  if(time<12||map==='graveyard')return 'safe';
  const phase=(time-12)%(map==='foundry'?12:14);
  return phase<2?'warning':phase<6?'active':'safe';
}
export function inTerrain(map,x,z){
  if(map==='foundry')return Math.abs(Math.abs(x)-8)<1.3&&Math.abs(z)>2.5&&Math.abs(z-16)>2.5&&Math.abs(z+16)>2.5&&Math.abs(z)<26;
  if(map==='glacier')return [[-11,-10],[11,10],[-11,12],[12,-12]].some(([a,b])=>Math.hypot(x-a,z-b)<4);
  return false;
}
export function objectiveComplete(id,progress){return id==='survival'||progress>=3;}
