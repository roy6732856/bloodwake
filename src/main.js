import { Game } from './game.js';
import { blankSave, sanitizeSave, legacy, legacyCost, purchase, settleRun, formatTime } from './progression.js';
import { normalizeLoadout, weapons, unlockAchievements } from './content.js';
import { loadoutMarkup, codexMarkup } from './loadout-ui.js';
import { connectCloud } from './cloud-ui.js';

const $=id=>document.getElementById(id), storageKey='bloodwake.save.v1';
let save=blankSave(),storageAvailable=true,game,toastTimer,dialogKind='',lastHud=0;
let selection=normalizeLoadout(),hitTimer,evolutionTimer,cloud;
try {save=sanitizeSave(JSON.parse(localStorage.getItem(storageKey)));}catch{storageAvailable=false;}
function persist(sync=true){try{localStorage.setItem(storageKey,JSON.stringify(save));}catch{storageAvailable=false;}if(sync)cloud?.changed();}
function refreshMenu(){$('bank').textContent=save.souls;$('best').textContent=save.runs?`最長存活 ${formatTime(save.best)}　／　黎明生還 ${save.wins} 次`: '每一次倒下，都為下一位獵人留下力量。';}
function toast(text){$('toast').textContent=text;$('toast').style.opacity='1';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.opacity='0',3300);}
function closeDialog(){$('dialog').classList.add('hidden');dialogKind='';}
function showDialog(kind,html,focus=true){dialogKind=kind;$('dialog-content').innerHTML=html;$('dialog').classList.remove('hidden');if(focus)setTimeout(()=>$('dialog-content').querySelector('button:not(:disabled)')?.focus({preventScroll:true}),30);}
function showLoadout(focus=true){showDialog('loadout',loadoutMarkup(selection),focus);for(const kind of ['hunter','weapon','contract'])document.querySelectorAll(`[data-select-${kind}]`).forEach(b=>b.onclick=()=>{const scroll=$('dialog-content').scrollTop;selection[kind]=b.getAttribute(`data-select-${kind}`);showLoadout(false);$('dialog-content').scrollTop=scroll;document.querySelector(`[data-select-${kind}="${selection[kind]}"]`)?.focus({preventScroll:true});});$('deploy').onclick=()=>game.start(selection);$('loadout-back').onclick=closeDialog;}
function showCodex(){showDialog('codex',codexMarkup(save));$('codex-back').onclick=closeDialog;}
function showHelp(){showDialog('help',`<div class="sub">獵人手冊</div><h2>活到黎明</h2><p>在血月獵場存活 5 分鐘。擊倒敵人、拾取青色靈魂，<br>升級時從三項隨機強化中選擇一項。</p><dl class="key-list"><dt>W A S D</dt><dd>移動，也支援方向鍵</dd><dt>滑鼠 + 左鍵</dt><dd>瞄準地面位置；按住左鍵持續射擊</dd><dt>SPACE</dt><dd>朝移動方向衝刺，短暫無敵</dd><dt>E</dt><dd>釋放新星，傷害並擊退周圍敵人</dd><dt>Q</dt><dd>開啟附近聖匣，獲得額外強化</dd><dt>F</dt><dd>切換自動射擊，仍由滑鼠瞄準</dd><dt>ESC / P</dt><dd>暫停與繼續；切換視窗自動暫停</dd><dt>1 / 2 / 3</dt><dd>快速選擇升級項目</dd><dt>觸控裝置</dt><dd>左搖桿移動，右搖桿瞄準並射擊；點技能施放</dd></dl><p class="muted">紅色結晶恢復生命。墓碑會擋住銀彈，衝刺可閃避典獄長的環形衝擊波。<br>結算獲得的殘魂，可在「獵人傳承」換取永久能力。</p><button id="help-back" class="primary">返回</button>`);$('help-back').onclick=closeDialog;}
function showLegacy(){refreshMenu();showDialog('legacy',`<div class="sub">跨局永久成長</div><h2>獵人傳承</h2><p>可用殘魂 <strong>${save.souls}</strong>　·　每項最高 5 階</p>${legacy.map(u=>{const r=save.ranks[u.id],cost=legacyCost(r);return `<div class="legacy-row"><span class="symbol">${u.symbol}</span><div><h3>${u.name} <small>${r} / 5</small></h3><p>${u.description}</p></div><button data-buy="${u.id}" ${r>=5||save.souls<cost?'disabled':''}>${r>=5?'已達上限':`${cost} 殘魂 · 強化`}</button></div>`;}).join('')}<p class="muted" style="margin-top:22px">能力在下一局開始時套用。${storageAvailable?'進度自動儲存在此瀏覽器，可在主選單開啟雲端同步。':'瀏覽器儲存不可用，進度只保留於本次開啟期間。'}</p><div class="dialog-actions"><button id="legacy-back" class="primary">返回獵場</button></div>`);$('legacy-back').onclick=()=>{closeDialog();refreshMenu();};document.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{if(purchase(save,b.dataset.buy)){persist();showLegacy();}});}
function showPause(){showDialog('pause',`<div class="sub">${formatTime(game.time)} · LV ${game.level}</div><h2>夜色暫歇</h2><p>獵場已暫停，準備好再繼續。</p><p class="muted">WASD 移動　·　左鍵射擊　·　SPACE 衝刺　·　E 新星<br>F 自動射擊　·　ESC 返回遊戲</p><div class="dialog-actions"><button id="resume" class="primary">繼續狩獵</button><button id="abandon">結束本局</button></div>`);$('resume').onclick=()=>game.resume();$('abandon').onclick=()=>{game.state='playing';game.finish(false);};}
function showUpgrade(options){$('reticle').classList.add('hidden');showDialog('upgrade',`<div class="sub">${game.upgradeSource==='chest'?'遺落聖匣 · 額外強化':'靈魂覺醒 · LEVEL '+game.level}</div><h2>選擇你的力量</h2><p>時間已暫停。選一項強化，繼續狩獵。</p><div class="choice-grid">${options.map((u,i)=>`<button class="choice ${Object.hasOwn(game.weapon.evolution.requires,u.id)?'synergy':''}" data-choice="${i}"><span class="symbol">${u.symbol}</span><span class="type">${u.type}${Object.hasOwn(game.weapon.evolution.requires,u.id)?' · 進化所需':''}</span><h3>${u.name}</h3><p>${u.description}</p><small>按 ${i+1} 選擇　·　第 ${(game.ranks[u.id]||0)+1} 階</small></button>`).join('')}</div><p class="evolution-preview">${game.evolved?game.weapon.evolution.name+' · 已覺醒':game.weapon.evolution.description}</p><button id="reroll" ${game.rerolls<=0?'disabled':''}>重擲選項 · 剩餘 ${game.rerolls} 次</button>`);document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>game.chooseUpgrade(Number(b.dataset.choice)));$('reroll').onclick=()=>game.reroll();}
function showEnd(result){
  const earned=settleRun(save,result),unlocked=unlockAchievements(save,result);persist();refreshMenu();$('reticle').classList.add('hidden');
  showDialog('end',`<div class="sub">${result.win?'黎明終於到來':'下一位獵人，將繼承你的意志'}</div><h2>${result.win?'血月落幕':'長夜未盡'}</h2><p>${result.win?'你撐過了這個夜晚。獵場會記住你的名字。':'銀彈耗不盡黑夜，但留下的靈魂不會消失。'}</p><div class="result-stats"><div><strong>${formatTime(result.time)}</strong><span>存活時間</span></div><div><strong>${result.kills}</strong><span>擊殺數</span></div><div><strong>+${earned}</strong><span>獲得殘魂</span></div></div><p class="muted">每 8 次擊殺 +1 殘魂 · 每存活 20 秒 +1 · 生還額外 +20<br>目前共有 ${save.souls} 殘魂，可在主選單「獵人傳承」購買永久強化。</p><div class="dialog-actions"><button id="retry" class="primary">再次狩獵</button><button id="back-menu">返回主選單</button></div>`);
  $('retry').onclick=()=>game.start();$('back-menu').onclick=()=>game.toMenu();
  const details=document.createElement('div');details.className='result-details';details.innerHTML=`<p>${result.weapon} ${result.evolved?'· 已進化':''}　／　最高 ${result.bestCombo||0} 連殺　／　開啟 ${result.chests||0} 聖匣</p>${unlocked.map(a=>`<div class="unlock-notice">✦ ${a.name} 解鎖　+${a.reward} 殘魂</div>`).join('')}<small>契約收益倍率 ×${game.contract.reward} · 目前 ${save.souls} 殘魂</small>`;$('dialog-content').querySelector('.dialog-actions').before(details);
}
function onState(state){
  $('world').classList.toggle('playing',state==='playing');
  if(state==='playing'){closeDialog();$('menu').classList.add('hidden');$('hud').classList.remove('hidden');$('reticle').classList.remove('hidden');document.activeElement?.blur();}
  if(state==='paused'){$('reticle').classList.add('hidden');showPause();}
  if(state==='menu'){closeDialog();$('menu').classList.remove('hidden');$('hud').classList.add('hidden');refreshMenu();$('start').focus();cloud?.sync();}
}
function updateHud(s){
  $('damage-flash').style.opacity=Math.max(0,s.hurt)*.7;
  if(performance.now()-lastHud<70)return;lastHud=performance.now();
  $('timer').textContent=formatTime(s.time);$('hp').textContent=Math.ceil(s.hp);$('max-hp').textContent=s.maxHp;
  $('health-bar').style.width=`${s.hp/s.maxHp*100}%`;$('xp-bar').style.width=`${Math.min(100,s.xp/s.xpNeeded*100)}%`;
  $('kills').textContent=s.kills;$('level').textContent=s.level;
  $('dash-label').textContent=s.dash>0?s.dash.toFixed(1)+'s':'衝刺';$('nova-label').textContent=s.nova>0?Math.ceil(s.nova)+'s':'新星';
  $('dash-cooldown').style.height=`${s.dash/s.dashMax*100}%`;$('nova-cooldown').style.height=`${s.nova/s.novaMax*100}%`;
  $('boss-hud').classList.toggle('hidden',!s.boss);$('boss-health').style.width=`${s.boss*100}%`;$('auto-status').textContent=`F 自動射擊：${s.auto?'開':'關'}`;
  $('equipped-weapon').textContent=s.weapon;$('equipped-weapon').classList.toggle('evolved',s.evolved);
  const recipe=game.weapon.evolution.requires,short={damage:'銀彈',rate:'扳機',spread:'獠牙',health:'契約',pierce:'穿透',crit:'暴擊'};
  $('build-hint').textContent=s.evolved?'武器已覺醒':Object.entries(recipe).map(([id,n])=>`${short[id]} ${Math.min(game.ranks[id]||0,n)}/${n}`).join(' · ');
  $('combo-hud').classList.toggle('hidden',s.combo<3);$('combo-count').textContent=s.combo;$('combo-time').style.width=`${s.comboLeft/4*100}%`;
  const event=s.encounter.event;$('world-event').classList.toggle('hidden',!event&&!s.encounter.fury);$('world-event').textContent=event?`${event.name} · ${Math.ceil(event.left)}s${s.encounter.fury?'　/ 狂熱 '+Math.ceil(s.encounter.fury)+'s':''}`:s.encounter.fury?`嗜血狂熱 · ${Math.ceil(s.encounter.fury)}s`:'';
  const chest=s.encounter.chest,near=chest&&chest.distance<2.8;$('interact').classList.toggle('hidden',!near||s.state!=='playing');$('chest-guide').textContent=chest?`聖匣 ${Math.ceil(chest.distance)}m · ${Math.abs(chest.dx)>Math.abs(chest.dz)?chest.dx>0?'東 →':'西 ←':chest.dz>0?'南 ↓':'北 ↑'}${near?' · Q 開啟':''}`:'';
}
function emit(kind,data){if(kind==='state')onState(data);if(kind==='frame')updateHud(data);if(kind==='upgrade')showUpgrade(data);if(kind==='end')showEnd(data);if(kind==='toast')toast(data);if(kind==='pointer'){$('reticle').style.left=`${data.x}px`;$('reticle').style.top=`${data.y}px`;}if(kind==='hit'){$('reticle').classList.add('hit');$('reticle').classList.toggle('critical-hit',data.crit);clearTimeout(hitTimer);hitTimer=setTimeout(()=>$('reticle').classList.remove('hit','critical-hit'),90);}if(kind==='evolution'){$('evolution-banner').querySelector('strong').textContent=data;$('evolution-banner').classList.remove('hidden');clearTimeout(evolutionTimer);evolutionTimer=setTimeout(()=>$('evolution-banner').classList.add('hidden'),2800);}}
function attachPad(id,target){
  const pad=$(id),knob=pad.querySelector('i');let pointerId=null;
  function update(e){const r=pad.getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)/36,y=(e.clientY-r.top-r.height/2)/36,n=Math.max(1,Math.hypot(x,y));target.set(x/n,y/n);knob.style.transform=`translate(${target.x*29}px,${target.y*29}px)`;}
  pad.addEventListener('pointerdown',e=>{if(game.state!=='playing'||pointerId!==null)return;pointerId=e.pointerId;pad.setPointerCapture(pointerId);game.sound.unlock();update(e);});
  pad.addEventListener('pointermove',e=>{if(e.pointerId===pointerId)update(e);});
  const release=e=>{if(e.pointerId!==pointerId)return;pointerId=null;target.set(0,0);knob.style.transform='none';};
  pad.addEventListener('pointerup',release);pad.addEventListener('pointercancel',release);pad.addEventListener('lostpointercapture',release);
}
document.addEventListener('keydown',e=>{
  if(e.code==='Escape'&&['help','legacy','loadout','codex','cloud'].includes(dialogKind))closeDialog();
  if(e.key==='Tab'&&!$('dialog').classList.contains('hidden')){const buttons=[...$('dialog-content').querySelectorAll('button:not(:disabled),input:not(.hidden):not(:disabled),textarea:not(:disabled)')];const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
});
$('reload-game').onclick=()=>location.reload();
try{
  game=new Game($('world'),save,emit);
  $('start').onclick=showLoadout;$('pause').onclick=()=>game.pause();$('dash').onclick=()=>game.dash();$('nova').onclick=()=>game.nova();$('interact').onclick=()=>game.encounters.openChest();
  $('sound').onclick=()=>{game.sound.enabled=!game.sound.enabled;if(game.sound.enabled)game.sound.unlock();$('sound').innerHTML=`♪ <span>音效 ${game.sound.enabled?'開':'關'}</span>`;};
  $('open-help').onclick=showHelp;$('open-legacy').onclick=showLegacy;$('open-codex').onclick=showCodex;attachPad('move-pad',game.touchMove);attachPad('aim-pad',game.touchAim);refreshMenu();
  cloud=connectCloud({getSave:()=>save,applySave:incoming=>{Object.assign(save,sanitizeSave(incoming));persist(false);refreshMenu();},canApply:()=>game.state==='menu'&&['','cloud'].includes(dialogKind),showDialog,closeDialog,isOpen:()=>dialogKind==='cloud'});
  if(!new URLSearchParams(location.search).has('qa'))cloud.init();
  // Explicit QA mode only; the normal game exposes no mutable debug handle.
  if(new URLSearchParams(location.search).has('qa'))window.__bloodwake=game;
}catch(error){console.error(error);$('fatal').classList.remove('hidden');$('fatal-message').textContent='瀏覽器未能建立 WebGL 3D 畫面。請使用開啟硬體加速的 Chrome 或 Edge，並重新載入。';}
