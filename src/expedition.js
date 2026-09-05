import * as THREE from '../vendor/three.module.js';
import {maps,missions,terrainPhase,inTerrain,objectiveComplete} from './world-content.js';

export class Expedition {
  constructor(game){this.game=game;this.group=new THREE.Group();game.scene.add(this.group);this.reset();}
  reset(){this.group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});this.group.clear();this.progress=0;this.charge=0;this.targetsSpawned=0;this.pending=null;this.nextPressure=22;this.terrain='safe';this.slow=1;this.pyres=[];this.shield=0;this.shieldDelay=0;this.shieldMax=0;this.tick=.5;this.blocked=false;}
  start(){
    this.reset();const g=this.game;this.id=g.loadout.mission;this.map=g.loadout.map;
    this.shieldMax=g.loadout.hunter==='sentinel'?35:0;this.shield=this.shieldMax;
    this.sites=[[-16,-16],[16,-14],[0,18]].map(([x,z])=>this.safePoint(x,z));
    if(this.id==='ritual'){
      for(let i=0;i<3;i++){const [x,z]=this.sites[i],site=new THREE.Group();site.position.set(x,0,z);this.group.add(site);
        const ring=new THREE.Mesh(new THREE.RingGeometry(2.7,3,64),new THREE.MeshBasicMaterial({color:0xddb96b,transparent:true,opacity:.55,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.05;site.add(ring);
        const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.45),new THREE.MeshStandardMaterial({color:0xffd890,emissive:0xd89932,emissiveIntensity:1.8}));crystal.position.y=1.3;site.add(crystal);site.userData={ring,crystal,index:i};
      }
    }
  }
  safePoint(x,z){
    for(let radius=0;radius<8;radius++)for(let i=0;i<16;i++){const a=i*Math.PI/8,px=Math.max(-23,Math.min(23,x+Math.cos(a)*radius)),pz=Math.max(-23,Math.min(23,z+Math.sin(a)*radius));if(this.game.obstacles.every(o=>Math.hypot(px-o.x,pz-o.z)>o.r+3.2)&&!inTerrain(this.map,px,pz))return [px,pz];}
    return [0,0];
  }
  absorb(amount){this.shieldDelay=5;const absorbed=Math.min(this.shield,amount);this.shield-=absorbed;return amount-absorbed;}
  nova(){
    const g=this.game,p=g.hunter.position;
    if(g.loadout.hunter==='sentinel'){this.shield=Math.min(this.shieldMax,this.shield+20);g.feedback.rune(p.x,p.z,3,0x8cdcff);}
    if(g.loadout.hunter==='pyre'){
      const mesh=new THREE.Mesh(new THREE.CircleGeometry(4,64),new THREE.MeshBasicMaterial({color:0xff913b,transparent:true,opacity:.35,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.set(p.x,.06,p.z);this.group.add(mesh);this.pyres.push({mesh,left:4});g.feedback.rune(p.x,p.z,4,0xff963e);
    }
  }
  onKill(e){if(e.huntTarget){this.progress++;this.game.emit('toast',`追獵完成 ${this.progress} / 3 · 標記首領已倒下`);}}
  makeRoom(slots){
    const g=this.game,p=g.hunter.position,removable=g.enemies.filter(e=>e.hp>0&&e.type!=='boss'&&Math.hypot(e.mesh.position.x-p.x,e.mesh.position.z-p.z)>20).sort((a,b)=>b.mesh.position.distanceToSquared(p)-a.mesh.position.distanceToSquared(p));
    while(g.enemies.length>90-slots&&removable.length){const e=removable.shift();g.entities.remove(e.mesh);g.enemies.splice(g.enemies.indexOf(e),1);}
    return g.enemies.length<=90-slots;
  }
  update(dt){
    const g=this.game,p=g.hunter.position;this.shieldDelay=Math.max(0,this.shieldDelay-dt);if(this.shieldDelay===0)this.shield=Math.min(this.shieldMax,this.shield+8*dt);
    const phase=terrainPhase(this.map,g.time);if(phase!==this.terrain&&phase==='warning')g.emit('toast',this.map==='foundry'?'熔流將噴發 · 兩秒後離開橙色區域，走橋面':'寒霜將甦醒 · 兩秒後藍色區域降低移速');this.terrain=phase;
    this.slow=phase==='active'&&this.map==='glacier'&&inTerrain(this.map,p.x,p.z)?.65:1;
    if(phase==='active'&&this.map==='foundry'&&inTerrain(this.map,p.x,p.z))g.hurt(10);
    if(g.state!=='playing')return;
    g.arena.hazards.forEach(m=>m.material.opacity=phase==='active'?.65:phase==='warning'?.3+Math.sin(g.time*12)*.12:.1);
    this.tick-=dt;const pulse=this.tick<=0;if(pulse)this.tick=.5;
    for(let i=this.pyres.length-1;i>=0;i--){const a=this.pyres[i];a.left-=dt;a.mesh.material.opacity=Math.min(.35,a.left*.2);if(pulse)for(const e of g.enemies)if(e.hp>0&&Math.hypot(e.mesh.position.x-a.mesh.position.x,e.mesh.position.z-a.mesh.position.z)<4)g.damageEnemy(e,9,false);if(a.left<=0){this.group.remove(a.mesh);a.mesh.geometry.dispose();a.mesh.material.dispose();this.pyres.splice(i,1);}}
    if(this.id==='ritual'&&this.progress<3){
      const [x,z]=this.sites[this.progress];this.blocked=g.enemies.some(e=>e.hp>0&&Math.hypot(e.mesh.position.x-x,e.mesh.position.z-z)<4);
      const inside=Math.hypot(p.x-x,p.z-z)<3;this.charge=inside&&!this.blocked?Math.min(8,this.charge+dt):Math.max(0,this.charge-(inside?0:dt*.4));
      this.group.children.filter(o=>o.userData.index!==undefined).forEach(o=>{const active=o.userData.index===this.progress;o.userData.crystal.rotation.y+=dt;const done=o.userData.index<this.progress;o.userData.ring.material.opacity=active?.5+this.charge/16:done?.35:.12;o.userData.ring.material.color.setHex(done?0x79dba9:active?0xddb96b:0x64717e);o.userData.crystal.material.emissive.setHex(done?0x2c9b69:active?0xd89932:0x263345);});
      if(this.charge>=8){this.progress++;this.charge=0;g.emit('toast',`封印淨化 ${this.progress} / 3`);g.hp=Math.min(g.stats.maxHp,g.hp+12);g.gainXp(18);}
    }
    if(g.state!=='playing')return;
    if(this.id==='hunt'&&this.targetsSpawned<3&&g.time>=[40,120,200][this.targetsSpawned]&&!this.pending){
      const a=g.time*1.7,[x,z]=this.safePoint(p.x+Math.cos(a)*16,p.z+Math.sin(a)*16);this.pending={x,z,left:3};g.feedback.rune(x,z,3,0xffaa56,3);g.emit('toast',`追獵目標 ${this.targetsSpawned+1} / 3 · 三秒後現身`);
    }
    if(this.pending){this.pending.left-=dt;if(this.pending.left<=0&&this.makeRoom(1)){
      const {x,z}=this.pending,e=g.spawnEnemy('boss',x,z);e.huntTarget=true;e.maxHp=e.hp=430*(1+this.targetsSpawned*.5);e.speed*=1.2;this.targetsSpawned++;this.pending=null;g.emit('toast','標記首領現身 · 擊倒它才能完成追獵');
    }}
    // New objective missions reserve space for mixed threats; legacy survival stays available.
    if(this.id!=='survival'&&g.time>=this.nextPressure){
      this.nextPressure=g.time+22;const a=Math.atan2(p.z,p.x)+.45;
      if(this.makeRoom(2))for(const [offset,type]of [[0,'charger'],[1.6,'caster']]){
        const x=Math.max(-24,Math.min(24,p.x+Math.cos(a+offset)*14)),z=Math.max(-24,Math.min(24,p.z+Math.sin(a+offset)*14));
        if(Math.hypot(x-p.x,z-p.z)>=9&&!g.obstacles.some(o=>Math.hypot(o.x-x,o.z-z)<o.r+1)){
          g.feedback.rune(x,z,1.5,0xf1be68,2.5);g.director.pending.push({kind:'enemy',type,x,z,left:2.5});
        }
      }
    }
  }
  complete(){return objectiveComplete(this.id,this.progress);}
  snapshot(){
    const target=this.id==='ritual'&&this.progress<3?this.sites[this.progress]:null,p=this.game.hunter.position;
    return {map:maps.find(m=>m.id===this.map)?.name||'血月墓園',mission:missions.find(m=>m.id===this.id)?.name||'自由生存',progress:this.progress,charge:this.charge,blocked:this.blocked,shield:this.shield,shieldMax:this.shieldMax,terrain:this.terrain,target:target?{distance:Math.hypot(p.x-target[0],p.z-target[1]),dx:target[0]-p.x,dz:target[1]-p.z}:null};
  }
}
