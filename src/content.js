export const hunters = [
  { id: 'hunter', name: '灰燼獵人', title: '穩定火力', description: '均衡的生命與火力。每次升級恢復 8 點生命。', color: '#bd626b', apply: s => s.levelHeal = 8 },
  { id: 'shade', name: '緋影遊俠', title: '高速暴擊', description: '移速 +18%、暴擊率 +15%，生命上限 -20。', color: '#b899df', apply: s => {s.speed*=1.18;s.crit+=.15;s.maxHp-=20;} },
  { id: 'oracle', name: '月蝕使徒', title: '新星法術', description: '新星冷卻 -35%、傷害 +35%，經驗 +15%。', color: '#74d4cb', apply: s => {s.novaCooldown*=.65;s.novaDamage*=1.35;s.xpBonus+=.15;} },
];
export const weapons = [
  { id: 'pistols', name: '銀誓雙槍', description: '穩定連射，適合走位與精準點殺。', symbol: 'Ⅱ', damage: 1, interval: 1, count: 1, spread: .12, speed: 38, life: .9, pierce: 0,
    evolution: {name:'熾天使',requires:{damage:2,rate:2},description:'祝聖銀彈 II + 午夜扳機 II → 銀彈追蹤敵人，射速再提升 20%。'} },
  { id: 'shotgun', name: '喪鐘霰彈', description: '近距離五發散射，將包圍網轟開。', symbol: '⋔', damage: .64, interval: 2.8, count: 5, spread: .14, speed: 32, life: .43, pierce: 0,
    evolution: {name:'末日喪鐘',requires:{spread:2,health:1},description:'雙生獠牙 II + 猩紅契約 I → 命中產生小型爆炸，擴散 45% 傷害。'} },
  { id: 'crossbow', name: '黑棘弩', description: '高傷貫穿箭，一箭清除整列敵人。', symbol: '↟', damage: 2.7, interval: 2.65, count: 1, spread: .08, speed: 48, life: .95, pierce: 2,
    evolution: {name:'雷鳴黑棘',requires:{pierce:2,crit:1},description:'穿心誓約 II + 致命獵殺 I → 命中觸發連鎖雷擊，跳躍至附近 3 個敵人。'} },
];
export const contracts = [
  {id:'standard',name:'長夜狩獵',description:'標準敵潮，存活 5 分鐘。',reward:1,spawn:1,apply:()=>{}},
  {id:'swarm',name:'血潮圍城',description:'敵潮數量 +50%，殘魂收益 +35%。',reward:1.35,spawn:1.5,apply:()=>{}},
  {id:'glass',name:'孤注一擲',description:'生命 -35%、武器傷害 +45%，殘魂 +50%。',reward:1.5,spawn:1.1,apply:s=>{s.maxHp=Math.round(s.maxHp*.65);s.damage*=1.45;}},
];
export const events = [
  {id:'harvest',name:'靈魂豐收',description:'青色靈魂的經驗翻倍',duration:18,color:0x55d8b7},
  {id:'swarm',name:'血蝠遷徙',description:'血蝠持續湧入，敵人掉落額外經驗',duration:18,color:0xa17cce},
  {id:'storm',name:'猩紅星雨',description:'離開地上的紅色預警圈',duration:18,color:0xe7526c},
];
export function normalizeLoadout(raw={}) {return {hunter:hunters.find(h=>h.id===raw.hunter)?.id||'hunter',weapon:weapons.find(w=>w.id===raw.weapon)?.id||'pistols',contract:contracts.find(c=>c.id===raw.contract)?.id||'standard',director:raw.director==='classic'?'classic':'adaptive',trial:['none','pursuit','eclipse'].includes(raw.trial)?raw.trial:'none'};}
export function configureLoadout(stats,raw){const loadout=normalizeLoadout(raw);hunters.find(h=>h.id===loadout.hunter).apply(stats);contracts.find(c=>c.id===loadout.contract).apply(stats);return loadout;}
export function canEvolve(weaponId,ranks){const w=weapons.find(w=>w.id===weaponId);return !!w&&Object.entries(w.evolution.requires).every(([id,n])=>(ranks[id]||0)>=n);}
export const achievements = [
  {id:'firstblood',name:'第一滴血',description:'單局擊殺 25 名敵人',reward:8,test:r=>r.kills>=25},
  {id:'warden',name:'破除枷鎖',description:'擊倒一名典獄長',reward:12,test:r=>(r.bossKills||0)>=1},
  {id:'evolution',name:'禁忌兵器',description:'完成一次武器進化',reward:15,test:r=>!!r.evolved},
  {id:'combo',name:'無間狩獵',description:'達成 20 連殺',reward:10,test:r=>(r.bestCombo||0)>=20},
  {id:'dawn',name:'迎向黎明',description:'首次存活至黎明',reward:20,test:r=>r.win},
];
export function unlockAchievements(save,result){save.achievements||=[];const unlocked=achievements.filter(a=>!save.achievements.includes(a.id)&&a.test(result));for(const a of unlocked){save.achievements.push(a.id);save.souls+=a.reward;}return unlocked;}
