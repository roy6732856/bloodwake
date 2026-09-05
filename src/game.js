import * as THREE from '../vendor/three.module.js';
import { buildArena, createHunter, createEnemy, dressHunter, mat } from './models.js';
import { Sound } from './audio.js';
import { statsFor, xpNeeded, choices, RUN_SECONDS } from './progression.js';
import { normalizeLoadout, configureLoadout, weapons, contracts, canEvolve } from './content.js';
import { Encounters } from './encounters.js';
import { CombatFeedback } from './feedback.js';

const UP = new THREE.Vector3(0,1,0), FLOOR = new THREE.Plane(UP,0);
const clamp = THREE.MathUtils.clamp;
const enemyData = { ghoul: {hp:34,speed:1.65,r:.5,xp:2,damage:9}, bat: {hp:22,speed:3.2,r:.42,xp:2,damage:7}, brute: {hp:125,speed:1.25,r:.8,xp:6,damage:18}, caster:{hp:58,speed:1.8,r:.5,xp:4,damage:8}, charger:{hp:80,speed:2.1,r:.6,xp:5,damage:15}, boss: {hp:520,speed:1.45,r:1.1,xp:30,damage:24} };

export class Game {
  constructor(container, save, emit) {
    this.container=container;this.save=save;this.emit=emit;this.state='menu';this.sound=new Sound();
    this.keys=new Set();this.pointer=new THREE.Vector2(.25,.05);this.aim=new THREE.Vector3(6,0,-4);this.aimDirection=new THREE.Vector3(0,0,-1);this.touchMove=new THREE.Vector2();this.touchAim=new THREE.Vector2();this.mouseDown=false;this.auto=false;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x0b131d);this.scene.fog=new THREE.FogExp2(0x0b131c,.018);
    this.camera=new THREE.OrthographicCamera(-20,20,13,-13,.1,130);
    this.camera.position.set(0,26,19);this.camera.lookAt(0,0,0);
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.32;
    container.appendChild(this.renderer.domElement);
    this.scene.add(new THREE.HemisphereLight(0xc7d2dc,0x34404b,2.5));
    const moon=new THREE.DirectionalLight(0xbbcbdc,3.1);moon.position.set(-12,24,8);moon.castShadow=true;moon.shadow.mapSize.set(2048,2048);Object.assign(moon.shadow.camera,{left:-35,right:35,top:35,bottom:-35,near:1,far:90});moon.shadow.normalBias=.06;moon.shadow.bias=-.0002;this.scene.add(moon);
    const blood=new THREE.DirectionalLight(0xb52944,1.7);blood.position.set(4,8,-25);this.scene.add(blood);
    const {obstacles,flames}=buildArena(this.scene);this.obstacles=obstacles;this.flames=flames;
    this.hunter=createHunter();this.scene.add(this.hunter);
    this.playerLight=new THREE.PointLight(0xc5e9ee,7,9,2);this.scene.add(this.playerLight);
    this.entities=new THREE.Group();this.scene.add(this.entities);
    this.ray=new THREE.Raycaster();this.enemies=[];this.bullets=[];this.gems=[];this.particles=[];this.rings=[];
    this.gemGeo=new THREE.OctahedronGeometry(.19);this.gemMat=mat(0x4edde0,0x26caca,1.6);this.heartMat=mat(0xff5370,0xd5264d,1);
    this.bulletGeo=new THREE.CylinderGeometry(.035,.035,.9,5);this.bulletGeo.rotateX(Math.PI/2);this.bulletMat=new THREE.MeshBasicMaterial({color:0xffe8b5});
    this.particleGeo=new THREE.IcosahedronGeometry(.075,0);this.particleMats=[new THREE.MeshBasicMaterial({color:0xe9b87b}),new THREE.MeshBasicMaterial({color:0x9e4660}),new THREE.MeshBasicMaterial({color:0x67e5d7})];
    this.ringGeo=new THREE.RingGeometry(.94,1,64);this.ringGeo.rotateX(-Math.PI/2);
    this.loadout=normalizeLoadout();this.encounters=new Encounters(this);this.feedback=new CombatFeedback(this);
    this.reset();this.state='menu';this.demo();this.resize();
    this.attachInput();this.last=performance.now();this.accumulator=0;this.frame=this.frame.bind(this);requestAnimationFrame(this.frame);
  }
  reset() {
    this.encounters.reset();this.feedback.reset();
    for(const r of this.rings)r.mesh.material.dispose();
    this.entities.clear();this.enemies=[];this.bullets=[];this.gems=[];this.particles=[];this.rings=[];
    this.stats=statsFor(this.save);configureLoadout(this.stats,this.loadout);this.weapon=weapons.find(w=>w.id===this.loadout.weapon);this.contract=contracts.find(c=>c.id===this.loadout.contract);this.hp=this.stats.maxHp;this.time=0;this.kills=0;this.level=1;this.xp=0;this.ranks={};this.pendingChoices=[];this.spawnClock=1.8;this.shotClock=0;this.dashLeft=0;this.dashTimer=0;this.novaLeft=0;this.invuln=0;this.hurtFlash=0;this.nextBoss=60;this.boss=null;this.cameraTarget=new THREE.Vector3();this.hunter.position.set(0,0,0);this.hunter.rotation.y=0;this.hunter.visible=true;this.keys.clear();this.mouseDown=false;this.auto=false;this.dashDirection=new THREE.Vector3(0,0,-1);this.touchMove.set(0,0);this.touchAim.set(0,0);this.fired=0;this.collected=0;this.upgradesChosen=0;this.dashesUsed=0;this.novasUsed=0;this.bossKills=0;this.combo=0;this.comboLeft=0;this.bestCombo=0;this.evolved=false;this.rerolls=1;this.upgradeSource='level';
  }
  demo(){for(let i=0;i<9;i++){const a=i*2.399;this.spawnEnemy(i%4===0?'brute':'ghoul',Math.cos(a)*(8+i*.8),Math.sin(a)*(8+i*.8));}for(let i=0;i<12;i++){const a=i*1.97;this.dropGem(Math.cos(a)*(3+i*.6),Math.sin(a)*(3+i*.6),2);}}
  start(loadout=this.loadout){this.loadout=normalizeLoadout(loadout);this.reset();dressHunter(this.hunter,this.loadout);this.state='playing';this.sound.unlock();for(let i=0;i<5;i++){const a=i*Math.PI*2/5;this.spawnEnemy('ghoul',Math.cos(a)*11,Math.sin(a)*11);}this.emit('state','playing');this.emit('toast',`${this.weapon.name} · ${this.contract.name}`);}
  pause(){if(this.state!=='playing')return;this.state='paused';this.releaseInput();this.emit('state','paused');}
  resume(){if(this.state!=='paused')return;this.state='playing';this.releaseInput();this.emit('state','playing');}
  toMenu(){this.reset();this.state='menu';this.demo();this.emit('state','menu');}
  releaseInput(){this.keys.clear();this.mouseDown=false;this.touchMove.set(0,0);this.touchAim.set(0,0);}
  finish(win){if(this.state!=='playing')return;this.state=win?'victory':'defeat';this.hunter.visible=true;this.releaseInput();this.emit('end',{win,kills:this.kills,time:this.time,level:this.level,contract:this.loadout.contract,weapon:this.weapon.name,bestCombo:this.bestCombo,bossKills:this.bossKills,evolved:this.evolved,chests:this.encounters.chestsOpened});}
  attachInput(){
    window.addEventListener('resize',()=>this.resize());
    window.addEventListener('keydown',e=>{
      if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
      this.keys.add(e.code);if(e.repeat)return;
      if(e.code==='Escape'||e.code==='KeyP'){if(this.state==='playing')this.pause();else if(this.state==='paused')this.resume();}
      if(this.state==='playing'){
        if(e.code==='Space')this.dash();if(e.code==='KeyE')this.nova();if(e.code==='KeyQ')this.encounters.openChest();if(e.code==='KeyF'){this.auto=!this.auto;this.emit('toast',this.auto?'自動射擊開啟 · 滑鼠控制瞄準':'自動射擊關閉');}
      }else if(this.state==='upgrade'&&/^Digit[123]$/.test(e.code))this.chooseUpgrade(Number(e.code.at(-1))-1);
    });
    window.addEventListener('keyup',e=>this.keys.delete(e.code));
    window.addEventListener('pointermove',e=>{
      if(e.pointerType==='touch')return;
      const r=this.container.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);
      this.emit('pointer',{x:e.clientX,y:e.clientY});
    });
    this.renderer.domElement.addEventListener('pointerdown',e=>{if(e.button===0&&e.pointerType!=='touch'&&this.state==='playing'){this.mouseDown=true;this.sound.unlock();}});
    window.addEventListener('pointerup',()=>this.mouseDown=false);
    this.renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
    window.addEventListener('blur',()=>{this.releaseInput();this.pause();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){this.releaseInput();this.pause();}});
  }
  resize(){
    const w=this.container.clientWidth,h=this.container.clientHeight,aspect=w/h,half=aspect<1?19:15;
    this.camera.left=-half*aspect;this.camera.right=half*aspect;this.camera.top=half;this.camera.bottom=-half;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);
  }
  spawnEnemy(type,x,z){
    const data=enemyData[type],mesh=createEnemy(type);mesh.position.set(x,0,z);this.entities.add(mesh);
    const scaling=1+this.time/220;
    const e={mesh,type,hp:data.hp*scaling,maxHp:data.hp*scaling,speed:data.speed*(1+this.time/700),r:data.r,xp:data.xp,damage:data.damage,hit:0,phase:Math.random()*6.28,attack:2.5,burn:0,burnTick:0,frost:0,charge:0,chargeX:0,chargeZ:0,baseScale:mesh.scale.x};
    this.enemies.push(e);if(type==='boss')this.boss=e;return e;
  }
  spawnWave(){
    if(this.enemies.length>=90)return;
    const a=Math.random()*Math.PI*2,r=18+Math.random()*7;
    let x=clamp(this.hunter.position.x+Math.cos(a)*r,-27,27),z=clamp(this.hunter.position.z+Math.sin(a)*r,-27,27);
    if(Math.hypot(x-this.hunter.position.x,z-this.hunter.position.z)<10){x=-this.hunter.position.x*.65;z=-this.hunter.position.z*.65;if(Math.hypot(x-this.hunter.position.x,z-this.hunter.position.z)<10)z=22;}
    const roll=Math.random(),type=this.encounters.event?.id==='swarm'?'bat':this.time>90&&roll<.14?'charger':this.time>55&&roll<.29?'caster':this.time>40&&roll<.45?'brute':this.time>15&&roll<.62?'bat':'ghoul';this.spawnEnemy(type,x,z);
  }
  dropGem(x,z,value,heal=false){
    if(this.gems.length>=180){const old=this.gems.find(g=>!g.heal);if(old&&!heal){old.value+=value;return;}}
    const mesh=new THREE.Mesh(this.gemGeo,heal?this.heartMat:this.gemMat);mesh.position.set(x,.34,z);if(heal)mesh.scale.setScalar(1.7);this.entities.add(mesh);this.gems.push({mesh,value,heal,phase:Math.random()*6.28});
  }
  particle(x,y,z,colorIndex,count=8){
    for(let i=0;i<count&&this.particles.length<180;i++){
      const mesh=new THREE.Mesh(this.particleGeo,this.particleMats[colorIndex]);mesh.position.set(x,y,z);this.entities.add(mesh);
      this.particles.push({mesh,vx:(Math.random()-.5)*6,vy:Math.random()*5,vz:(Math.random()-.5)*6,life:.3+Math.random()*.3,max:.6});
    }
  }
  ring(x,z,color,radius,duration=.5){const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.75,side:THREE.DoubleSide,depthWrite:false});const mesh=new THREE.Mesh(this.ringGeo,material);mesh.position.set(x,.08,z);this.entities.add(mesh);this.rings.push({mesh,radius,life:duration,max:duration});}
  damageEnemy(e,amount,show=true,crit=false){
    if(e.hp<=0)return;e.hp-=amount;e.hit=.12;if(show){this.feedback.hit(e.mesh.position,amount,crit,e.hp<=0);this.particle(e.mesh.position.x,.9,e.mesh.position.z,0,3);if(crit)this.sound.crit();}
    if(e.hp<=0){
      this.kills++;this.combo++;this.comboLeft=4;this.bestCombo=Math.max(this.bestCombo,this.combo);const p=e.mesh.position;this.dropGem(p.x,p.z,e.xp*(this.encounters.event?.id==='swarm'?1.5:1));if(Math.random()<.07)this.dropGem(p.x+.3,p.z,20,true);
      if(this.kills%18===0)this.encounters.dropPowerup(p.x,p.z,this.kills%36===0?'magnet':'fury');
      if([10,20,35,50].includes(this.combo))this.emit('toast',`${this.combo} 連殺 · 經驗加成 ${Math.round(Math.min(.5,this.combo*.01)*100)}%`);
      this.particle(p.x,.7,p.z,1,e.type==='boss'?24:9);this.entities.remove(e.mesh);
      if(e===this.boss){this.boss=null;this.bossKills++;this.dropGem(p.x+.5,p.z,35,true);this.encounters.spawnChest(p.x,p.z);this.feedback.rune(p.x,p.z,4,0xe2bd70);this.feedback.shake=.22;this.emit('toast','典獄長已倒下 · 聖匣等待開啟');}
    }
  }
  hurt(amount){
    if(this.invuln>0||this.state!=='playing')return;
    this.hp=Math.max(0,this.hp-amount);this.invuln=.7;this.hurtFlash=.6;this.combo=0;this.comboLeft=0;this.feedback.shake=.16;this.sound.hurt();this.ring(this.hunter.position.x,this.hunter.position.z,0xd83455,1.4,.25);
    if(this.hp<=0)this.finish(false);
  }
  moveAndCollide(position,dx,dz,radius){
    position.x=clamp(position.x+dx,-27.5,27.5);position.z=clamp(position.z+dz,-27.5,27.5);
    for(const o of this.obstacles){const x=position.x-o.x,z=position.z-o.z,d=Math.hypot(x,z),min=radius+o.r;if(d<min){if(d<.001){position.x=o.x+min;continue;}position.x=o.x+x/d*min;position.z=o.z+z/d*min;}}
  }
  movement(){
    const x=Number(this.keys.has('KeyD')||this.keys.has('ArrowRight'))-Number(this.keys.has('KeyA')||this.keys.has('ArrowLeft'))+this.touchMove.x;
    const z=Number(this.keys.has('KeyS')||this.keys.has('ArrowDown'))-Number(this.keys.has('KeyW')||this.keys.has('ArrowUp'))+this.touchMove.y;
    const n=Math.max(1,Math.hypot(x,z));return {x:x/n,z:z/n};
  }
  dash(){
    if(this.state!=='playing'||this.dashLeft>0)return;
    const m=this.movement();this.dashDirection.set(m.x,0,m.z);if(this.dashDirection.lengthSq()<.01)this.dashDirection.copy(this.aimDirection);
    this.dashDirection.normalize();this.dashTimer=.19;this.dashLeft=this.stats.dashCooldown;this.invuln=.29;this.dashesUsed++;this.sound.dash();
  }
  nova(){
    if(this.state!=='playing'||this.novaLeft>0)return;
    this.novaLeft=this.stats.novaCooldown;this.novasUsed++;const p=this.hunter.position;this.ring(p.x,p.z,0x67e8d9,7,.55);this.feedback.rune(p.x,p.z);this.feedback.shake=.2;this.particle(p.x,.7,p.z,2,30);this.sound.nova();
    for(const e of this.enemies)if(e.hp>0&&e.mesh.position.distanceTo(p)<7+e.r){this.damageEnemy(e,this.stats.novaDamage);const dx=e.mesh.position.x-p.x,dz=e.mesh.position.z-p.z,len=Math.hypot(dx,dz)||1;this.moveAndCollide(e.mesh.position,dx/len*1.5,dz/len*1.5,e.r);}
  }
  shoot(){
    const p=this.hunter.position,base=Math.atan2(this.aimDirection.x,this.aimDirection.z),count=this.weapon.count+this.stats.projectiles-1;this.sound.shoot(this.weapon.id);this.fired++;
    for(let i=0;i<count;i++){
      const angle=base+(i-(count-1)/2)*this.weapon.spread,dx=Math.sin(angle),dz=Math.cos(angle),mesh=new THREE.Mesh(this.bulletGeo,this.bulletMat);
      mesh.position.set(p.x+dx*.9,.85,p.z+dz*.9);mesh.rotation.y=angle;this.entities.add(mesh);
      if(this.weapon.id==='crossbow')mesh.scale.set(1.8,1.8,1.5);
      const crit=Math.random()<this.stats.crit;this.bullets.push({mesh,dx,dz,life:this.weapon.life,speed:this.weapon.speed,crit,damage:this.stats.damage*this.weapon.damage*(crit?1.8:1),pierce:this.stats.pierce+this.weapon.pierce,hit:new Set()});
    }
    this.particle(p.x+this.aimDirection.x*.9,1.35,p.z+this.aimDirection.z*.9,0,2);
    this.feedback.spark(p.x+this.aimDirection.x,1.3,p.z+this.aimDirection.z,this.weapon.id==='shotgun'?1.8:.9,0xffd793,.08);if(this.weapon.id==='shotgun')this.feedback.shake=Math.max(this.feedback.shake,.075);
  }
  gainXp(value){const earned=value*this.stats.xpBonus*(1+Math.min(.5,this.combo*.01))*(this.encounters.event?.id==='harvest'?2:1);this.xp+=earned;this.collected+=earned;this.checkLevel();}
  offerUpgrade(source='level'){this.upgradeSource=source;this.pendingChoices=choices(this.ranks);if(!this.pendingChoices.length){this.hp=Math.min(this.stats.maxHp,this.hp+30);return;}this.state='upgrade';this.releaseInput();this.sound.level();this.emit('upgrade',this.pendingChoices);}
  reroll(){if(this.state!=='upgrade'||this.rerolls<=0)return false;this.rerolls--;this.pendingChoices=choices(this.ranks);this.emit('upgrade',this.pendingChoices);return true;}
  checkLevel(){
    if(this.state!=='playing'||this.xp<xpNeeded(this.level))return;
    this.xp-=xpNeeded(this.level);this.level++;this.hp=Math.min(this.stats.maxHp,this.hp+this.stats.levelHeal);this.offerUpgrade();
  }
  chooseUpgrade(index){
    if(this.state!=='upgrade'||!this.pendingChoices[index])return;
    const u=this.pendingChoices[index];u.apply(this.stats);this.ranks[u.id]=(this.ranks[u.id]||0)+1;if(u.heal)this.hp=Math.min(this.stats.maxHp,this.hp+u.heal);
    if(u.magnet)this.encounters.magnet=2.5;
    this.upgradesChosen++;this.pendingChoices=[];this.state='playing';this.invuln=Math.max(this.invuln,1.1);this.emit('state','playing');this.emit('toast',`${u.name} · 強化生效`);this.checkEvolution();this.checkLevel();
  }
  checkEvolution(){if(!this.evolved&&canEvolve(this.weapon.id,this.ranks)){this.evolved=true;this.feedback.rune(this.hunter.position.x,this.hunter.position.z,8,0xffd48b,1.4);this.feedback.shake=.25;this.sound.evolve();this.emit('evolution',this.weapon.evolution.name);return true;}return false;}
  bulletImpact(b,e){
    e.burn=this.stats.burn?3:0;e.frost=this.stats.frost?1.8:0;this.damageEnemy(e,b.damage,true,b.crit);
    if(!this.evolved)return;
    if(this.weapon.id==='shotgun'){this.feedback.spark(e.mesh.position.x,.7,e.mesh.position.z,1.8,0xffb66a,.19);for(const other of this.enemies)if(other!==e&&other.hp>0&&other.mesh.position.distanceTo(e.mesh.position)<2.1)this.damageEnemy(other,b.damage*.45,false);}
    if(this.weapon.id==='crossbow'){let last=e;const struck=new Set([e]);for(let i=0;i<3;i++){let nearest=null,range=6;for(const other of this.enemies){const d=other.mesh.position.distanceTo(last.mesh.position);if(other.hp>0&&!struck.has(other)&&d<range){nearest=other;range=d;}}if(!nearest)break;struck.add(nearest);this.damageEnemy(nearest,b.damage*.4,false);this.feedback.spark(nearest.mesh.position.x,1,nearest.mesh.position.z,1.5,0x85dcff,.18);last=nearest;}}
  }
  update(dt){
    if(this.state!=='playing')return;
    this.time=Math.min(RUN_SECONDS,this.time+dt);if(this.time>=RUN_SECONDS){this.finish(true);return;}
    this.shotClock=Math.max(0,this.shotClock-dt);this.invuln=Math.max(0,this.invuln-dt);this.dashLeft=Math.max(0,this.dashLeft-dt);this.novaLeft=Math.max(0,this.novaLeft-dt);this.hurtFlash=Math.max(0,this.hurtFlash-dt*2);
    this.hp=Math.min(this.stats.maxHp,this.hp+this.stats.regen*dt);
    this.comboLeft=Math.max(0,this.comboLeft-dt);if(this.comboLeft===0)this.combo=0;this.encounters.update(dt);if(this.state!=='playing')return;
    this.ray.setFromCamera(this.pointer,this.camera);this.ray.ray.intersectPlane(FLOOR,this.aim);
    const p=this.hunter.position;
    if(this.touchAim.lengthSq()>.03){this.aim.set(p.x+this.touchAim.x*10,0,p.z+this.touchAim.y*10);}
    const aimX=this.aim.x-p.x,aimZ=this.aim.z-p.z;
    if(Math.hypot(aimX,aimZ)>.1)this.aimDirection.set(aimX,0,aimZ).normalize();
    this.hunter.rotation.y=Math.atan2(-this.aimDirection.x,-this.aimDirection.z);
    const m=this.movement();let dx=m.x*this.stats.speed*dt,dz=m.z*this.stats.speed*dt;
    if(this.dashTimer>0){this.dashTimer-=dt;dx=this.dashDirection.x*28*dt;dz=this.dashDirection.z*28*dt;this.particle(p.x,.4,p.z,2,2);}
    this.moveAndCollide(p,dx,dz,.46);
    const moving=Math.hypot(dx,dz)>.001;this.hunter.userData.legs.forEach((leg,i)=>leg.rotation.x=moving?Math.sin(this.time*19+i*Math.PI)*.48:0);
    this.hunter.userData.scarf.rotation.z=Math.sin(this.time*9)*.18;this.hunter.userData.scarfTail.rotation.y=Math.sin(this.time*7)*.28;
    this.hunter.visible=this.invuln<=0||Math.floor(this.time*20)%2===0;
    if((this.mouseDown||this.auto||this.touchAim.lengthSq()>.03)&&this.shotClock<=0){this.shoot();this.shotClock=this.stats.fireRate*this.weapon.interval*(this.evolved&&this.weapon.id==='pistols'?.8:1)*(this.encounters.fury>0?.5:1);}
    this.spawnClock-=dt;if(this.spawnClock<=0){this.spawnWave();this.spawnClock=Math.max(.16,(1.05-this.time*.003)/this.contract.spawn/(this.encounters.event?.id==='swarm'?1.6:1));}
    if(this.time>=this.nextBoss){
      if(!this.boss){this.spawnEnemy('boss',clamp(p.x+12,-25,25),clamp(p.z-14,-25,25));this.emit('toast','典獄長甦醒 · 留意猩紅衝擊波');}
      this.nextBoss+=60;
    }
    // Enemies separate and flow around gravestones, instead of occupying the same spot.
    for(let i=0;i<this.enemies.length;i++){
      const e=this.enemies[i];if(e.hp<=0)continue;
      const ep=e.mesh.position,x=p.x-ep.x,z=p.z-ep.z,len=Math.hypot(x,z)||.001;let vx=x/len*e.speed,vz=z/len*e.speed;
      if(e.burn>0){e.burn-=dt;e.burnTick-=dt;if(e.burnTick<=0){e.burnTick=.5;this.damageEnemy(e,this.stats.burn*.5,false);if(e.hp<=0)continue;}}
      if(e.frost>0){e.frost-=dt;vx*=1-this.stats.frost;vz*=1-this.stats.frost;}
      if(e.type==='caster'){if(len<9){vx*=len<6?-1:0;vz*=len<6?-1:0;}e.attack-=dt;if(e.attack<=0){e.attack=2.4;this.encounters.enemyShot(ep.x,ep.z,x/len,z/len);this.feedback.spark(ep.x,1.7,ep.z,.7,0xff537e,.2);}}
      if(e.type==='charger'){e.attack-=dt;if(e.attack<=0&&e.charge===0){e.charge=1.15;e.chargeX=x/len;e.chargeZ=z/len;this.ring(ep.x,ep.z,0xf77863,1.6,.45);e.attack=4;}if(e.charge>0){e.charge-=dt;if(e.charge>.7){vx=0;vz=0;}else{vx=e.chargeX*10;vz=e.chargeZ*10;}if(e.charge<=0)e.charge=0;}}
      for(let j=0;j<i;j++){const other=this.enemies[j];if(other.hp<=0)continue;const sx=ep.x-other.mesh.position.x,sz=ep.z-other.mesh.position.z,d=Math.hypot(sx,sz),min=e.r+other.r;if(d>0&&d<min){vx+=sx/d*(min-d)*4;vz+=sz/d*(min-d)*4;}}
      for(const o of this.obstacles){const ox=ep.x-o.x,oz=ep.z-o.z,d=Math.hypot(ox,oz),min=o.r+e.r+1;if(d<min&&d>.01){vx+=ox/d*(min-d)*3;vz+=oz/d*(min-d)*3;}}
      if(e.hit>0){e.hit-=dt;vx*=.35;vz*=.35;}e.mesh.scale.setScalar(e.baseScale*(1+Math.max(0,e.hit)*.35));this.moveAndCollide(ep,vx*dt,vz*dt,e.r);
      e.mesh.rotation.y=Math.atan2(-x,-z);
      if(e.mesh.userData.legs)e.mesh.userData.legs.forEach((leg,i)=>leg.rotation.x=Math.sin(this.time*8+e.phase+i*Math.PI)*.4);
      if(e.mesh.userData.wings)e.mesh.userData.wings.forEach((wing,i)=>wing.rotation.z=Math.sin(this.time*17+e.phase)*.5*(i===0?1:-1));
      ep.y=e.type==='bat'?Math.sin(this.time*7+e.phase)*.12:Math.sin(this.time*8+e.phase)*.025;
      if(len<e.r+.5){this.hurt(e.damage);if(this.state!=='playing')return;}
      if(e.type==='boss'){
        e.attack-=dt;if(e.attack<0){e.attack=4;this.ring(ep.x,ep.z,0xea435e,5,1.1);this.rings.at(-1).hostile=true;this.rings.at(-1).hitPlayer=false;if(this.time>110)for(let i=0;i<10;i++){const a=i*Math.PI/5;this.encounters.enemyShot(ep.x,ep.z,Math.cos(a),Math.sin(a),4);}}
      }
    }
    for(let i=this.bullets.length-1;i>=0;i--){
      const b=this.bullets[i],bp=b.mesh.position,oldX=bp.x,oldZ=bp.z,travel=b.speed*dt;
      if(this.evolved&&this.weapon.id==='pistols'){let target=null,range=9;for(const e of this.enemies){const d=Math.hypot(e.mesh.position.x-bp.x,e.mesh.position.z-bp.z);if(e.hp>0&&!b.hit.has(e)&&d<range){range=d;target=e;}}if(target){const dx=target.mesh.position.x-bp.x,dz=target.mesh.position.z-bp.z,n=Math.hypot(dx,dz)||1;b.dx=THREE.MathUtils.lerp(b.dx,dx/n,dt*7);b.dz=THREE.MathUtils.lerp(b.dz,dz/n,dt*7);const l=Math.hypot(b.dx,b.dz)||1;b.dx/=l;b.dz/=l;b.mesh.rotation.y=Math.atan2(b.dx,b.dz);}}
      bp.x+=b.dx*travel;bp.z+=b.dz*travel;b.life-=dt;
      for(const o of this.obstacles){const t=clamp(((o.x-oldX)*b.dx+(o.z-oldZ)*b.dz)/travel,0,1);if(Math.hypot(oldX+b.dx*travel*t-o.x,oldZ+b.dz*travel*t-o.z)<o.r*.65){b.life=0;this.particle(bp.x,.8,bp.z,0,2);break;}}
      if(b.life>0)for(const e of this.enemies){
        if(e.hp<=0||b.hit.has(e))continue;const ep=e.mesh.position,t=clamp(((ep.x-oldX)*b.dx+(ep.z-oldZ)*b.dz)/travel,0,1);
        if(Math.hypot(oldX+b.dx*travel*t-ep.x,oldZ+b.dz*travel*t-ep.z)<e.r+.13){this.bulletImpact(b,e);b.hit.add(e);if(b.pierce--<=0){b.life=0;break;}}
      }
      if(b.life<=0){this.entities.remove(b.mesh);this.bullets.splice(i,1);}
    }
    this.enemies=this.enemies.filter(e=>e.hp>0);
    for(let i=this.gems.length-1;i>=0;i--){
      const g=this.gems[i],gp=g.mesh.position,x=p.x-gp.x,z=p.z-gp.z,d=Math.hypot(x,z);gp.y=.4+Math.sin(this.time*3+g.phase)*.12;g.mesh.rotation.y+=dt*1.8;
      const pickup=this.encounters.magnet>0?100:this.stats.pickup;
      if(d<pickup){const speed=Math.min(d,dt*(8+14*(1-d/pickup)));gp.x+=x/(d||1)*speed;gp.z+=z/(d||1)*speed;}
      if(d<.75){this.entities.remove(g.mesh);this.gems.splice(i,1);this.sound.pickup();if(g.heal)this.hp=Math.min(this.stats.maxHp,this.hp+g.value);else this.gainXp(g.value);if(this.state!=='playing')return;}
    }
    for(let i=this.particles.length-1;i>=0;i--){const a=this.particles[i];a.life-=dt;a.vy-=13*dt;a.mesh.position.x+=a.vx*dt;a.mesh.position.y+=a.vy*dt;a.mesh.position.z+=a.vz*dt;a.mesh.scale.setScalar(Math.max(0,a.life/a.max));if(a.life<=0){this.entities.remove(a.mesh);this.particles.splice(i,1);}}
    for(let i=this.rings.length-1;i>=0;i--){const r=this.rings[i];r.life-=dt;const radius=r.radius*(1-r.life/r.max);r.mesh.scale.setScalar(radius);r.mesh.material.opacity=r.life/r.max*.8;if(r.hostile&&!r.hitPlayer&&Math.abs(Math.hypot(p.x-r.mesh.position.x,p.z-r.mesh.position.z)-radius)<.5){this.hurt(18);r.hitPlayer=true;}if(r.life<=0){this.entities.remove(r.mesh);r.mesh.material.dispose();this.rings.splice(i,1);}}
  }
  frame(now){
    const dt=Math.min((now-this.last)/1000,.05);this.last=now;
    if(this.state==='playing'&&this.feedback.stop<=0){
      // Fixed simulation steps keep collision and spawn rates stable across frame rates.
      this.accumulator+=dt;while(this.accumulator>=1/60){this.update(1/60);this.accumulator-=1/60;if(this.state!=='playing'){this.accumulator=0;break;}}
    }else this.accumulator=0;
    const p=this.hunter.position;
    const target=new THREE.Vector3(p.x,0,p.z);this.cameraTarget.lerp(target,1-Math.exp(-dt*6));
    const shake=this.feedback.reduced?0:this.feedback.shake;
    this.camera.position.set(this.cameraTarget.x+(Math.random()-.5)*shake,26,this.cameraTarget.z+19+(Math.random()-.5)*shake);this.camera.lookAt(this.cameraTarget);this.camera.updateMatrixWorld();this.feedback.update(this.state==='playing'?dt:0);
    this.playerLight.position.set(p.x,3,p.z);
    this.flames.forEach((f,i)=>f.scale.setScalar(1+Math.sin(now*.009+i)*.17));
    this.renderer.render(this.scene,this.camera);this.emit('frame',this.snapshot());requestAnimationFrame(this.frame);
  }
  snapshot(){return {state:this.state,time:this.time,hp:this.hp,maxHp:this.stats.maxHp,kills:this.kills,level:this.level,xp:this.xp,xpNeeded:xpNeeded(this.level),dash:this.dashLeft,dashMax:this.stats.dashCooldown,nova:this.novaLeft,novaMax:this.stats.novaCooldown,boss:this.boss?this.boss.hp/this.boss.maxHp:0,auto:this.auto,hurt:this.hurtFlash,enemies:this.enemies.length,bullets:this.bullets.length,gems:this.gems.length,position:{x:this.hunter.position.x,z:this.hunter.position.z},fired:this.fired,collected:this.collected,upgradesChosen:this.upgradesChosen,dashesUsed:this.dashesUsed,novasUsed:this.novasUsed,combo:this.combo,comboLeft:this.comboLeft,bestCombo:this.bestCombo,evolved:this.evolved,weapon:this.evolved?this.weapon.evolution.name:this.weapon.name,loadout:this.loadout,encounter:this.encounters.snapshot()};}
}
