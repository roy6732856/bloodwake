import { blankSave } from '../src/progression.js';
const frame=document.getElementById('game'),out=document.getElementById('output'),button=document.getElementById('run');
frame.onload=()=>out.textContent='Ready';
button.onclick=async()=>{
  const g=frame.contentWindow.__bloodwake,doc=frame.contentDocument,lines=[];if(!g){out.textContent='FAIL: game did not boot';return;}
  const original=JSON.stringify(g.save),persisted=localStorage.getItem('bloodwake.save.v1'),appearance=localStorage.getItem('bloodwake.appearance.v1'),originalDyes={...g.lobby.dyes};g.sound.enabled=false;button.disabled=true;
  await new Promise(resolve=>setTimeout(resolve,100));
  function assert(ok,message){if(!ok)throw Error(message);}
  function test(name,fn){try{Object.assign(g.save,blankSave());g.start({hunter:'hunter',weapon:'pistols',contract:'standard'});fn();lines.push('PASS '+name);}catch(e){lines.push('FAIL '+name+': '+e.message);}out.textContent=lines.join('\n');}
  function step(seconds){for(let i=0;i<Math.ceil(seconds*60);i++)g.update(1/60);}
  function clearEnemies(){for(const e of g.enemies)g.entities.remove(e.mesh);g.enemies=[];g.boss=null;g.spawnClock=999;}
  test('Lobby selects a distinct 3D role and carries its dye into quick-start combat',()=>{
    g.toMenu();doc.querySelector('[data-lobby-hunter="oracle"]').click();doc.querySelector('[data-dye="2"]').click();
    assert(doc.querySelector('#hero-name').textContent==='月蝕使徒','role name did not change');
    assert(g.lobby.model.userData.variants.oracle.visible&&!g.lobby.model.userData.variants.hunter.visible,'wrong 3D silhouette');
    const dye=g.lobby.color;doc.querySelector('#quick-start').click();
    assert(g.loadout.hunter==='oracle'&&g.hunter.userData.dye===dye,'lobby appearance not applied in combat');
    assert(g.stats.novaCooldown===6.5,'selected role ability not applied');
  });
  test('Lobby rotation, skill preview and loadout changes affect actual scene objects',()=>{
    g.toMenu();doc.querySelector('[data-lobby-hunter="shade"]').click();const angle=g.lobby.angle;doc.querySelector('#rotate-right').click();assert(g.lobby.angle>angle,'rotation did not change');
    doc.querySelector('#preview-effect').click();g.lobby.render(.2);assert(g.lobby.fxParticles.some(p=>p.visible)&&g.lobby.model.position.x!==0,'dash preview did not animate');
    doc.querySelector('#preview-nova').click();g.lobby.render(.2);assert(g.lobby.wave.visible,'nova wave absent');
    doc.querySelector('#start').click();doc.querySelector('[data-select-hunter="hunter"]').click();doc.querySelector('[data-select-weapon="crossbow"]').click();doc.querySelector('#loadout-back').click();
    assert(g.lobby.role==='hunter'&&g.lobby.model.userData.crossbowParts.every(p=>p.visible),'advanced loadout and lobby diverged');
  });
  test('All five 3D characters select with matching actual abilities and reset cleanly',()=>{
    for(const role of ['hunter','shade','oracle','pyre','sentinel']){g.toMenu();doc.querySelector('[data-lobby-hunter="'+role+'"]').click();doc.querySelector('#quick-start').click();assert(g.loadout.hunter===role,'wrong role');assert(g.hunter.userData.variants[role].visible,'missing role model');assert(Object.values(g.hunter.userData.variants).filter(v=>v.visible).length===1,'overlapping variants');}
    assert(g.expedition.shield===35&&g.stats.maxHp===120,'sentinel ability missing');g.start({hunter:'hunter'});assert(g.expedition.shield===0,'shield leaked to hunter');
  });
  test('Expedition choices deploy the selected arena and objective through the real menu',()=>{
    g.toMenu();doc.querySelector('#open-expedition').click();doc.querySelector('[data-select-map="foundry"]').click();doc.querySelector('[data-select-mission="ritual"]').click();doc.querySelector('#deploy').click();
    assert(g.loadout.map==='foundry'&&g.expedition.id==='ritual','selection not deployed');assert(g.arena.hazards.length===8&&g.expedition.sites.length===3,'map or objectives absent');
    g.emit('frame',g.snapshot());assert(doc.querySelector('#expedition-hud').textContent.includes('封印儀式'),'objective HUD missing');
    g.start({map:'glacier'});assert(g.arena.hazards.length===4,'glacier terrain missing');assert([...g.arenas.values()].filter(a=>a.group.visible).length===1,'multiple maps visible');
  });
  test('Frost shield absorbs overflow correctly, waits five seconds and pauses its recovery',()=>{
    g.start({hunter:'sentinel',director:'classic'});clearEnemies();const hp=g.hp;g.hurt(45);assert(g.hp===hp-10&&g.expedition.shield===0,'damage overflow wrong');step(4);assert(g.expedition.shield===0,'regenerated too early');g.pause();step(8);assert(g.expedition.shield===0,'pause regenerated');g.resume();step(2);assert(g.expedition.shield>7&&g.expedition.shield<9,'recovery rate wrong');g.nova();assert(g.expedition.shield>27&&g.expedition.shield<29,'nova did not restore 20 shield');
  });
  test('Alchemist nova leaves a damaging timed area that cannot survive a restart',()=>{
    g.start({hunter:'pyre',director:'classic'});clearEnemies();g.nova();assert(g.expedition.pyres.length===1,'no fire pool');const e=g.spawnEnemy('brute',3,0);e.speed=0;const hp=e.hp;step(.6);assert(e.hp<hp,'pool did not damage later arrivals');step(3.5);assert(g.expedition.pyres.length===0,'expired pool leaked');g.novaLeft=0;g.nova();g.start({hunter:'hunter'});assert(g.expedition.pyres.length===0,'pool survived restart');
  });
  test('Foundry telegraph gives safe bridge crossings; glacier slows only while in active frost',()=>{
    g.start({map:'foundry',director:'classic'});clearEnemies();g.hunter.position.set(8,0,8);g.time=12;const hp=g.hp;step(1);assert(g.hp===hp,'warning damaged player');g.time=14;step(.1);assert(g.hp<hp,'active lava harmless');g.hunter.position.set(8,0,0);g.invuln=0;const bridgeHp=g.hp;step(.5);assert(g.hp===bridgeHp,'bridge damaged player');
    g.start({map:'glacier',director:'classic'});clearEnemies();g.time=14;g.hunter.position.set(-11,0,-10);step(.02);assert(g.expedition.slow===.65,'frost did not slow');g.hunter.position.set(0,0,0);step(.02);assert(g.expedition.slow===1,'slow persisted outside frost');
  });
  test('Ritual requires uncontested presence at all three distinct reachable shrines',()=>{
    g.start({mission:'ritual',map:'glacier',director:'classic'});clearEnemies();g.expedition.nextPressure=999;
    const sites=g.expedition.sites;assert(new Set(sites.map(p=>p.join(','))).size===3,'duplicate sites');assert(sites.every(([x,z])=>g.obstacles.every(o=>Math.hypot(x-o.x,z-o.z)>o.r+3)),'altar blocked');
    const [x,z]=sites[0];g.hunter.position.set(x,0,z);const e=g.spawnEnemy('brute',x+3.5,z);e.speed=0;step(1);assert(g.expedition.charge===0&&g.expedition.blocked,'contested altar charged');clearEnemies();step(2);const charge=g.expedition.charge;g.pause();step(4);assert(g.expedition.charge===charge,'pause charged altar');g.resume();g.hunter.position.set(0,0,0);step(1);assert(g.expedition.charge<charge,'leaving did not decay progress');
    for(let i=0;i<3;i++){clearEnemies();const [a,b]=sites[i];g.hunter.position.set(a,0,b);for(let k=0;k<600&&g.expedition.progress<=i;k++){if(g.state==='upgrade')g.chooseUpgrade(0);g.update(1/60);}assert(g.expedition.progress===i+1,'altar '+i+' never captured');}
    while(g.state==='upgrade')g.chooseUpgrade(0);g.time=299.99;step(.1);assert(g.state==='victory','completed ritual lost');
  });
  test('Hunt bosses arrive despite a full weak-enemy crowd; avoiding them cannot win',()=>{
    g.start({mission:'hunt',director:'classic'});clearEnemies();for(let i=0;i<90;i++)g.spawnEnemy('ghoul',26,26);g.time=40;step(.1);assert(g.expedition.pending,'boss warning missing');g.pause();const left=g.expedition.pending.left;step(4);assert(g.expedition.pending.left===left,'pause consumed boss warning');g.resume();step(3);assert(g.enemies.some(e=>e.huntTarget),'full crowd prevented boss');assert(g.enemies.length<=90,'boss broke cap');g.time=299.99;step(.1);assert(g.state==='defeat','no-objective pacifist victory');
    g.start({mission:'hunt',director:'classic'});clearEnemies();g.expedition.nextPressure=999;
    for(const time of [40,120,200]){g.time=time;step(3.2);const e=g.enemies.find(e=>e.huntTarget&&e.hp>0);assert(e,'missing target at '+time);g.damageEnemy(e,1e6);while(g.state==='upgrade')g.chooseUpgrade(0);clearEnemies();}
    assert(g.expedition.progress===3,'target kills not counted');g.time=299.99;step(.1);assert(g.state==='victory','completed hunt lost');
  });
  test('WASD movement and arena bounds',()=>{clearEnemies();g.keys.add('KeyD');step(1);g.keys.clear();assert(g.hunter.position.x>6&&g.hunter.position.x<7,'D should move ~6.4m');g.hunter.position.set(27.4,0,12);g.keys.add('KeyD');step(1);assert(g.hunter.position.x<=27.5,'escaped arena');});
  test('Gravestone collision stops traversal',()=>{clearEnemies();const o=g.obstacles.find(o=>o.x===-10);g.hunter.position.set(o.x-3,0,o.z);g.keys.add('KeyD');step(.6);assert(g.hunter.position.x<=o.x-o.r-.44,'walked through gravestone');});
  test('Aimed silver bullets kill a real enemy',()=>{clearEnemies();g.camera.position.set(0,26,19);g.camera.lookAt(0,0,0);g.camera.updateMatrixWorld();g.pointer.set(0,.4);const e=g.spawnEnemy('ghoul',0,-5);e.speed=0;g.mouseDown=true;step(1);assert(g.fired>=4,'shoot input failed');assert(g.kills===1,'projectiles did not kill');assert(g.gems.length>0,'kill did not drop XP');});
  test('XP pickup pauses for 3 unique upgrades; selection resumes',()=>{clearEnemies();g.dropGem(0,0,12);step(.1);assert(g.state==='upgrade','XP did not trigger level');assert(doc.querySelectorAll('[data-choice]').length===3,'missing 3 UI choices');assert(new Set(g.pendingChoices.map(u=>u.id)).size===3,'duplicate choices');doc.querySelector('[data-choice="0"]').click();assert(g.state==='playing'&&g.upgradesChosen===1,'upgrade did not resume');});
  test('Dash has cooldown and invulnerability',()=>{clearEnemies();g.keys.add('KeyD');g.dash();const hp=g.hp;g.hurt(20);assert(g.hp===hp,'dash invulnerability failed');g.dash();assert(g.dashesUsed===1,'cooldown bypass');step(.2);assert(g.hunter.position.x>5,'dash did not move');});
  test('Nova damages multiple enemies and obeys cooldown',()=>{clearEnemies();g.spawnEnemy('ghoul',2,0);g.spawnEnemy('ghoul',-2,0);g.nova();assert(g.kills===2,'AoE did not kill both enemies');g.nova();assert(g.novasUsed===1,'nova cooldown bypass');});
  test('Pause freezes timer, damage, movement and spawns',()=>{g.pause();const s=g.snapshot();g.keys.add('KeyD');step(3);g.hurt(20);assert(g.time===s.time&&g.hp===s.hp&&g.hunter.position.x===s.position.x,'simulation changed while paused');g.resume();assert(g.state==='playing','resume failed');});
  test('Death, rewards, retry and persistent purchase',()=>{clearEnemies();g.kills=80;g.time=120;g.invuln=0;g.hurt(999);assert(g.state==='defeat','death missing');assert(doc.querySelector('#retry'),'result UI missing');assert(g.save.souls>=16,'earned currency missing');doc.querySelector('#back-menu').click();doc.querySelector('#open-legacy').click();const buy=doc.querySelector('[data-buy="power"]'),old=g.save.ranks.power;buy.click();assert(g.save.ranks.power===old+1,'purchase failed');assert(JSON.parse(localStorage.getItem('bloodwake.save.v1')).ranks.power===old+1,'purchase not saved');doc.querySelector('#legacy-back').click();doc.querySelector('#start').click();doc.querySelector('#deploy').click();assert(g.hp===g.stats.maxHp&&g.time===0&&g.kills===0,'retry not reset');assert(g.stats.damage>22,'permanent power not applied');});
  test('60-second boss spawns and telegraphed shockwave damages',()=>{clearEnemies();g.time=59.99;g.nextBoss=60;step(.1);assert(g.boss?.type==='boss','boss absent');const b=g.boss;b.mesh.position.set(2,0,0);b.speed=0;b.attack=0;g.invuln=0;const hp=g.hp;step(.7);assert(g.rings.some(r=>r.hostile),'shockwave absent');assert(g.hp<hp,'shockwave did not damage');});
  test('300 seconds produces victory and only one settlement',()=>{clearEnemies();const runs=g.save.runs;g.time=299.99;step(.1);assert(g.state==='victory','no victory');assert(doc.querySelector('h2').textContent==='血 月 獵 場','menu DOM missing');assert(doc.querySelector('#dialog-content h2').textContent==='血月落幕','victory UI absent');assert(g.save.runs===runs+1,'settlement missing');g.finish(true);assert(g.save.runs===runs+1,'settled twice');});
  test('Crowd simulation remains finite and bounded',()=>{clearEnemies();g.hp=10000;g.stats.maxHp=10000;for(let i=0;i<90;i++){const a=i*2.399;g.spawnEnemy(i%3===0?'bat':i%5===0?'brute':'ghoul',Math.cos(a)*18,Math.sin(a)*18);}step(5);assert(g.enemies.length<=90,'enemy cap exceeded');assert(g.enemies.every(e=>Number.isFinite(e.mesh.position.x)&&Number.isFinite(e.mesh.position.z)),'nonfinite crowd position');g.renderer.render(g.scene,g.camera);assert(g.renderer.info.render.calls<2600,'excessive draw calls');lines.push(`INFO crowd draw calls: ${g.renderer.info.render.calls}`);});
  test('Loadout UI deploys the selected hunter, gun and contract',()=>{g.toMenu();doc.querySelector('#start').click();doc.querySelector('[data-select-hunter="oracle"]').click();doc.querySelector('[data-select-weapon="shotgun"]').click();doc.querySelector('[data-select-contract="glass"]').click();doc.querySelector('#deploy').click();assert(g.loadout.hunter==='oracle'&&g.weapon.id==='shotgun'&&g.contract.id==='glass','selection ignored');assert(g.hp===65&&g.stats.novaCooldown===6.5,'role/contract bonuses missing');clearEnemies();g.shoot();assert(g.bullets.length===5,'shotgun did not fire five pellets');});
  test('Crossbow pierces two enemies in one physical shot',()=>{g.start({weapon:'crossbow'});clearEnemies();g.camera.position.set(0,26,19);g.camera.lookAt(0,0,0);g.camera.updateMatrixWorld();g.pointer.set(0,.4);g.aimDirection.set(0,0,-1);const a=g.spawnEnemy('ghoul',0,-3),b=g.spawnEnemy('ghoul',0,-6);a.speed=b.speed=0;g.shoot();step(.3);assert(g.kills===2,'crossbow failed to pierce');});
  test('Chest requires proximity, opens once and offers an extra upgrade',()=>{clearEnemies();g.encounters.spawnChest(0,2);step(.02);const level=g.level;assert(g.encounters.openChest(),'near chest did not open');assert(g.state==='upgrade'&&g.upgradeSource==='chest','no chest upgrade');assert(g.level===level,'chest incorrectly raised level');assert(!g.encounters.openChest(),'opened same chest twice');doc.querySelector('[data-choice="0"]').click();assert(g.encounters.chestsOpened===1&&g.state==='playing','chest count/resume failed');});
  test('Upgrade reroll is usable exactly once per run',()=>{clearEnemies();g.gainXp(12);assert(g.reroll(),'first reroll failed');assert(!g.reroll(),'unlimited rerolls');assert(doc.querySelector('#reroll').disabled,'UI did not disable reroll');});
  test('Evolved crossbow chains damage to nearby secondary enemies',()=>{g.start({weapon:'crossbow'});clearEnemies();g.ranks={pierce:2,crit:1};assert(g.checkEvolution(),'evolution missing');assert(!g.checkEvolution(),'evolution retriggered');g.camera.position.set(0,26,19);g.camera.lookAt(0,0,0);g.camera.updateMatrixWorld();g.pointer.set(0,.4);g.aimDirection.set(0,0,-1);const a=g.spawnEnemy('brute',0,-4),b=g.spawnEnemy('brute',3,-4),c=g.spawnEnemy('brute',5,-4);a.speed=b.speed=c.speed=0;g.shoot();step(.2);assert(b.hp<b.maxHp&&c.hp<c.maxHp,'chain lightning missed secondary enemies');assert(doc.querySelector('#evolution-banner').textContent.includes('雷鳴黑棘'),'evolution banner absent');});
  test('Burn and orbit blades keep damaging after firing stops',()=>{clearEnemies();g.stats.burn=16;g.stats.orbit=1;const a=g.spawnEnemy('brute',0,-3);a.speed=0;a.burn=3;const hp=a.hp;step(1.1);assert(a.hp<hp-15,'burn ticks missing');const b=g.spawnEnemy('brute',2,0);b.speed=0;step(2);assert(b.hp<b.maxHp,'orbit blade never hit');});
  test('Caster launches an orb and meteor gives a warning before damage',()=>{clearEnemies();const e=g.spawnEnemy('caster',0,-7);e.speed=0;e.attack=0;step(.1);assert(g.encounters.shots.length>0,'caster never fired');g.encounters.warning(0,0,2.8);const hp=g.hp;step(.5);assert(g.hp===hp,'meteor hit before warning ended');step(1.1);assert(g.hp<hp,'meteor damage missing');});
  test('Combo rewards speed, resets on damage and harvest doubles XP',()=>{clearEnemies();for(let i=0;i<20;i++){const e=g.spawnEnemy('ghoul',10,10);g.damageEnemy(e,999,false);}assert(g.bestCombo===20&&g.combo===20,'combo not counted');g.invuln=0;g.hurt(1);assert(g.combo===0,'damage did not break combo');g.level=50;g.xp=0;g.encounters.startEvent('harvest');g.gainXp(5);assert(g.xp===10,'harvest XP multiplier incorrect');});
  test('New effects use loaded generated textures and create real hit feedback',()=>{clearEnemies();const e=g.spawnEnemy('brute',2,0);g.damageEnemy(e,44,true,true);assert(g.feedback.impact.image?.width>0&&g.feedback.sigil.image?.width>0,'VFX image not loaded');assert(doc.querySelector('.damage-number.critical'),'critical damage number missing');assert(g.feedback.sprites.length>0&&g.feedback.shake>0,'impact spark/shake absent');});
  test('Bloodmoon crisis recovery, run memory and feedback update the next recommendation',()=>{
    clearEnemies();g.time=10;g.hp=10;step(.1);assert(g.director.phase==='recover','critical health did not trigger recovery');
    assert(g.director.spawn===.65,'recovery spawn rate wrong');g.time=30;g.finish(false);
    const id=g.runId;assert(g.save.history.some(r=>r.id===id),'battle summary not stored');
    doc.querySelector('[data-rating="hard"]').click();assert(g.save.history.find(r=>r.id===id).rating==='hard','feedback not saved');
    doc.querySelector('#prepare-next').click();assert(doc.querySelector('.moon-preparation').textContent.includes('舒緩'),'recommendation ignored hard feedback');
  });
  test('Selected trial and classic mode deploy through the real loadout controls',()=>{
    g.toMenu();doc.querySelector('#start').click();doc.querySelector('[data-select-director="classic"]').click();doc.querySelector('[data-select-trial="pursuit"]').click();doc.querySelector('#deploy').click();
    assert(!g.director.enabled&&g.director.trial==='pursuit','loadout did not reach director');clearEnemies();g.time=35;step(.1);assert(g.director.pending.length>0,'trial warning absent');
    const time=g.time,pending=g.director.pending[0].left;g.pause();step(3);assert(g.time===time&&g.director.pending[0].left===pending,'pause consumed warnings');g.resume();step(2.6);assert(g.enemies.length>0,'announced trial did not spawn enemies');
  });
  test('All three weapons complete accelerated five-minute content loops without runtime failure',()=>{
    for(const weapon of ['pistols','shotgun','crossbow']){
      g.start({weapon});g.stats.maxHp=g.hp=1e7;g.sound.enabled=false;g.auto=true;
      for(let tick=0;tick<19000&&g.state!=='victory';tick++){
        if(g.state==='upgrade')g.chooseUpgrade(0);
        if(tick%20===0){const target=g.enemies.find(e=>e.hp>0);if(target){const v=target.mesh.position.clone();v.y=0;v.project(g.camera);g.pointer.set(v.x,v.y);}g.keys.clear();g.keys.add(['KeyD','KeyW','KeyA','KeyS'][Math.floor(tick/140)%4]);}
        g.update(1/60);if(tick%4===0)g.feedback.update(4/60);
        assert(Number.isFinite(g.hp)&&Number.isFinite(g.hunter.position.x),'non-finite simulation');
      }
      assert(g.state==='victory',weapon+' never reached five-minute result');assert(g.encounters.eventsSeen>=5,weapon+' did not run world events');assert(g.kills>0&&g.upgradesChosen>0,weapon+' did not exercise combat progression');lines.push(`INFO ${weapon}: ${g.kills} kills, LV ${g.level}, ${g.encounters.eventsSeen} events`);
    }
  });
  try {
    g.toMenu();const music=g.lobby.music;
    if(!music.playing)await music.toggle();await new Promise(r=>setTimeout(r,300));
    assert(music.playing&&g.sound.ctx.state==='running'&&music.nodes.size>0,'music produced no active audio');
    for(let i=0;i<15;i++)g.lobby.select(['hunter','shade','oracle','pyre','sentinel'][i%5],false);
    await new Promise(r=>setTimeout(r,400));assert(music.role==='sentinel'&&music.nodes.size<30,'theme switch leaked voices');
    await music.toggle();await new Promise(r=>setTimeout(r,300));assert(!music.playing&&music.nodes.size===0&&!music.timer,'pause left audio running');
    lines.push('PASS Music produces audio, switches themes without voice leaks and fully stops');
  }catch(error){lines.push('FAIL Music lifecycle: '+error.message);if(g.lobby.music.playing)await g.lobby.music.toggle();}
  Object.assign(g.save,JSON.parse(original));if(persisted===null)localStorage.removeItem('bloodwake.save.v1');else localStorage.setItem('bloodwake.save.v1',persisted);if(appearance===null)localStorage.removeItem('bloodwake.appearance.v1');else localStorage.setItem('bloodwake.appearance.v1',appearance);g.lobby.dyes=originalDyes;g.toMenu();button.disabled=false;out.textContent=lines.join('\n')+`\n${lines.filter(x=>x.startsWith('PASS')).length} passed, ${lines.filter(x=>x.startsWith('FAIL')).length} failed`;
};
