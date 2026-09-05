import * as THREE from '../vendor/three.module.js';
import { box, mat } from './models.js';
import { events } from './content.js';

export class Encounters {
  constructor(game){this.game=game;this.orbGeo=new THREE.IcosahedronGeometry(.18,1);this.bladeGeo=new THREE.ConeGeometry(.14,.8,4);this.bladeGeo.rotateX(Math.PI/2);this.redMat=new THREE.MeshBasicMaterial({color:0xff5a78});this.bladeMat=new THREE.MeshBasicMaterial({color:0xb2eeed});this.warningMat=new THREE.MeshBasicMaterial({color:0xf5526d,transparent:true,opacity:.75,side:THREE.DoubleSide});this.chestGeo=new THREE.RingGeometry(.8,.86,40);this.chestGeo.rotateX(-Math.PI/2);this.hazardGeo=new THREE.RingGeometry(.1,1,48);this.hazardGeo.rotateX(-Math.PI/2);this.reset();}
  reset(){for(const h of this.hazards||[])h.mesh.material.dispose();for(const c of this.chests||[])c.halo.material.dispose();for(const p of this.powerups||[]){p.mesh.geometry.dispose();p.mesh.material.dispose();}this.chests=[];this.shots=[];this.hazards=[];this.powerups=[];this.blades=[];this.event=null;this.nextEvent=30;this.nextChest=35;this.stormClock=0;this.fury=0;this.magnet=0;this.orbitClock=0;this.chestsOpened=0;this.eventsSeen=0;this.lastEvent='';this.nearestChest=null;}
  spawnChest(x,z){
    if(this.chests.length>=3)return;
    const g=this.game,p=g.hunter.position;
    if(x===undefined){for(let i=0;i<20;i++){const a=Math.random()*Math.PI*2;x=THREE.MathUtils.clamp(p.x+Math.cos(a)*11,-24,24);z=THREE.MathUtils.clamp(p.z+Math.sin(a)*11,-24,24);if(g.obstacles.every(o=>Math.hypot(o.x-x,o.z-z)>o.r+1.2))break;}}
    const mesh=new THREE.Group();mesh.position.set(x,0,z);
    box(mesh,0,.35,0,.95,.65,.7,mat(0x384453));box(mesh,0,.7,0,1,.14,.77,mat(0xc1a061,0x66532a,.5));
    for(const s of [-1,1])box(mesh,s*.31,.35,-.36,.08,.63,.025,mat(0xc1a061));
    box(mesh,0,.51,-.39,.16,.2,.08,mat(0xf0cc7b,0xad843e,1));
    const halo=new THREE.Mesh(this.chestGeo,new THREE.MeshBasicMaterial({color:0xd9bb79}));halo.position.y=.04;mesh.add(halo);g.entities.add(mesh);this.chests.push({mesh,halo});g.emit('toast','遺落的聖匣出現 · 靠近後按 Q 取得強化');
  }
  openChest(){
    if(this.game.state!=='playing'||!this.nearestChest)return false;
    const chest=this.nearestChest;if(chest.mesh.position.distanceTo(this.game.hunter.position)>2.8)return false;
    this.game.entities.remove(chest.mesh);chest.halo.material.dispose();this.chests=this.chests.filter(c=>c!==chest);this.nearestChest=null;this.chestsOpened++;
    this.game.hp=Math.min(this.game.stats.maxHp,this.game.hp+12);this.game.offerUpgrade('chest');return true;
  }
  startEvent(id){const candidates=events.filter(e=>e.id!==this.lastEvent);const event=id?events.find(e=>e.id===id):candidates[Math.floor(Math.random()*candidates.length)];if(!event)return;this.event={...event,left:event.duration};this.lastEvent=event.id;this.eventsSeen++;this.stormClock=1;this.game.emit('toast',`${event.name} · ${event.description}`);if(event.id==='harvest')for(let i=0;i<10;i++){const a=Math.random()*Math.PI*2,r=5+Math.random()*10,p=this.game.hunter.position;this.game.dropGem(THREE.MathUtils.clamp(p.x+Math.cos(a)*r,-26,26),THREE.MathUtils.clamp(p.z+Math.sin(a)*r,-26,26),3);}}
  enemyShot(x,z,dx,dz,speed=5){if(this.shots.length>=80)return;const mesh=new THREE.Mesh(this.orbGeo,this.redMat);mesh.position.set(x,.75,z);this.game.entities.add(mesh);this.shots.push({mesh,dx,dz,speed,life:5});}
  warning(x,z,r=2.8){const mesh=new THREE.Mesh(this.hazardGeo,this.warningMat.clone());mesh.position.set(x,.055,z);mesh.scale.setScalar(r);this.game.entities.add(mesh);this.hazards.push({mesh,left:1.5,r});}
  dropPowerup(x,z,kind){if(this.powerups.length>=12)return;const mesh=new THREE.Mesh(new THREE.OctahedronGeometry(.32),new THREE.MeshBasicMaterial({color:kind==='fury'?0xffb75e:0x71f4d4}));mesh.position.set(x,.5,z);this.game.entities.add(mesh);this.powerups.push({mesh,kind,life:22});}
  update(dt){
    const g=this.game,p=g.hunter.position;this.fury=Math.max(0,this.fury-dt);this.magnet=Math.max(0,this.magnet-dt);
    if(g.time>=this.nextEvent){this.startEvent();this.nextEvent+=50;}
    if(g.time>=this.nextChest){this.spawnChest();this.nextChest+=55;}
    if(this.event){this.event.left-=dt;if(this.event.id==='storm'){this.stormClock-=dt;if(this.stormClock<=0){this.warning(p.x,p.z);this.stormClock=2.8;}}if(this.event.left<=0)this.event=null;}
    this.nearestChest=null;let near=Infinity;for(const c of this.chests){const d=c.mesh.position.distanceTo(p);c.halo.scale.setScalar(1+Math.sin(g.time*3)*.07);if(d<near){near=d;this.nearestChest=c;}}this.chestDistance=near;
    for(let i=this.shots.length-1;i>=0;i--){const s=this.shots[i];s.life-=dt;s.mesh.position.x+=s.dx*s.speed*dt;s.mesh.position.z+=s.dz*s.speed*dt;
      if(Math.hypot(s.mesh.position.x-p.x,s.mesh.position.z-p.z)<.6){g.hurt(11);s.life=0;}if(g.obstacles.some(o=>Math.hypot(s.mesh.position.x-o.x,s.mesh.position.z-o.z)<o.r*.65))s.life=0;
      if(s.life<=0){g.entities.remove(s.mesh);this.shots.splice(i,1);}if(g.state!=='playing')return;
    }
    for(let i=this.hazards.length-1;i>=0;i--){const h=this.hazards[i];h.left-=dt;h.mesh.material.opacity=.15+(1-h.left/1.5)*.5;if(h.left<=0){g.ring(h.mesh.position.x,h.mesh.position.z,0xf35a5f,h.r,.35);g.particle(h.mesh.position.x,.3,h.mesh.position.z,1,16);if(Math.hypot(p.x-h.mesh.position.x,p.z-h.mesh.position.z)<h.r+.4)g.hurt(24);g.entities.remove(h.mesh);h.mesh.material.dispose();this.hazards.splice(i,1);}if(g.state!=='playing')return;}
    for(let i=this.powerups.length-1;i>=0;i--){const a=this.powerups[i];a.life-=dt;a.mesh.rotation.y+=dt*2;a.mesh.position.y=.55+Math.sin(g.time*4)*.15;const d=Math.hypot(a.mesh.position.x-p.x,a.mesh.position.z-p.z);if(d<1.15){if(a.kind==='fury'){this.fury=12;g.emit('toast','嗜血狂熱 · 射速加倍 12 秒');}else{this.magnet=2.5;g.emit('toast','引魂漩渦 · 吸引全場經驗');}a.life=0;}if(a.life<=0){g.entities.remove(a.mesh);a.mesh.geometry.dispose();a.mesh.material.dispose();this.powerups.splice(i,1);}}
    while(this.blades.length<g.stats.orbit){const blade=new THREE.Mesh(this.bladeGeo,this.bladeMat);g.entities.add(blade);this.blades.push(blade);}
    this.blades.forEach((b,i)=>{const a=g.time*2.8+i*Math.PI*2/this.blades.length;b.position.set(p.x+Math.cos(a)*2.15,.7,p.z+Math.sin(a)*2.15);b.rotation.y=-a;});
    this.orbitClock-=dt;if(this.orbitClock<=0){this.orbitClock=.25;for(const e of g.enemies)if(e.hp>0&&this.blades.some(b=>Math.hypot(b.position.x-e.mesh.position.x,b.position.z-e.mesh.position.z)<e.r+.65))g.damageEnemy(e,12+g.stats.damage*.2,false);}
  }
  snapshot(){const p=this.game.hunter.position,c=this.nearestChest;return {event:this.event?{name:this.event.name,description:this.event.description,left:this.event.left}:null,chest:c?{distance:this.chestDistance,dx:c.mesh.position.x-p.x,dz:c.mesh.position.z-p.z}:null,fury:this.fury,opened:this.chestsOpened};}
}
