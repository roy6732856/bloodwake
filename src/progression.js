export const RUN_SECONDS = 300;
export const blankSave = () => ({ souls: 0, best: 0, runs: 0, wins: 0, ranks: { power: 0, vitality: 0, reach: 0 } });
export function sanitizeSave(raw) {
  const save = blankSave();
  if (!raw || typeof raw !== 'object') return save;
  for (const k of ['souls', 'best', 'runs', 'wins']) save[k] = Math.max(0, Math.min(k === 'best' ? 300 : 1e7, Math.floor(Number(raw[k]) || 0)));
  for (const k of Object.keys(save.ranks)) save.ranks[k] = Math.max(0, Math.min(5, Math.floor(Number(raw.ranks?.[k]) || 0)));
  return save;
}
export const legacy = [
  { id: 'power', name: '銀匠的誓言', description: '每階永久增加 8% 銀彈傷害', symbol: 'Ⅰ' },
  { id: 'vitality', name: '不滅之血', description: '每階永久增加 10 點生命上限', symbol: 'Ⅱ' },
  { id: 'reach', name: '引魂燈', description: '每階永久增加 0.5 公尺拾取範圍', symbol: 'Ⅲ' },
];
export const legacyCost = rank => 8 * (rank + 1);
export function purchase(save, id) {
  if (!Object.hasOwn(save.ranks, id)) return false;
  const rank = save.ranks[id], cost = legacyCost(rank);
  if (rank >= 5 || save.souls < cost) return false;
  save.souls -= cost; save.ranks[id]++; return true;
}
export function statsFor(save) {
  return { maxHp: 100 + save.ranks.vitality * 10, damage: 22 * (1 + save.ranks.power * .08), fireRate: .23, speed: 6.4, pickup: 3.4 + save.ranks.reach * .5, projectiles: 1, pierce: 0, regen: 0, crit: .08, dashCooldown: 2.4, novaDamage: 60, novaCooldown: 10 };
}
export function rewardFor(kills, time, win) { return Math.floor(kills / 8) + Math.floor(time / 20) + (win ? 20 : 0); }
export function settleRun(save, result) {
  const reward = rewardFor(result.kills, result.time, result.win);
  save.souls += reward; save.runs++; if (result.win) save.wins++;
  save.best = Math.max(save.best, Math.floor(Math.min(300, result.time))); return reward;
}
export const upgrades = [
  { id: 'damage', name: '祝聖銀彈', type: '火力', symbol: '✧', description: '銀彈傷害 +30%', max: 8, apply: s => s.damage *= 1.3 },
  { id: 'rate', name: '午夜扳機', type: '射速', symbol: 'Ⅲ', description: '射擊間隔縮短 18%', max: 7, apply: s => s.fireRate *= .82 },
  { id: 'spread', name: '雙生獠牙', type: '彈幕', symbol: '⋔', description: '每次射擊額外發射 1 枚銀彈', max: 4, apply: s => s.projectiles++ },
  { id: 'pierce', name: '穿心誓約', type: '穿透', symbol: '↟', description: '銀彈多穿透 1 個敵人', max: 4, apply: s => s.pierce++ },
  { id: 'speed', name: '夜行者', type: '移動', symbol: '»', description: '移動速度 +12%，衝刺冷卻 -10%', max: 4, apply: s => { s.speed *= 1.12; s.dashCooldown *= .9; } },
  { id: 'health', name: '猩紅契約', type: '生存', symbol: '♢', description: '生命上限 +25，立即恢復 40 點生命', max: 6, heal: 40, apply: s => s.maxHp += 25 },
  { id: 'magnet', name: '靈魂呼喚', type: '拾取', symbol: '◎', description: '拾取範圍 +45%，吸引更遠的經驗', max: 4, apply: s => s.pickup *= 1.45 },
  { id: 'regen', name: '餘燼復甦', type: '恢復', symbol: '✚', description: '每秒恢復 1.5 點生命', max: 4, apply: s => s.regen += 1.5 },
  { id: 'nova', name: '破曉新星', type: '技能', symbol: '☼', description: '新星傷害 +50%，冷卻時間 -15%', max: 5, apply: s => { s.novaDamage *= 1.5; s.novaCooldown *= .85; } },
];
export function choices(ranks, random = Math.random) {
  const pool = upgrades.filter(u => (ranks[u.id] || 0) < u.max);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, 3);
}
export const xpNeeded = level => 7 + level * 4;
export const formatTime = t => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
