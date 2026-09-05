import * as T from '../vendor/three.module.js';
export class Arsenal{
 constructor(game){this.game=game;this.orbGeo=new T.IcosahedronGeometry(.15,1);this.orbMat=new T.MeshBasicMaterial({color:0xb3b8ff});this.zoneGeo=new T.CircleGeometry(1,40);this.zoneGeo.rotateX(-Math.PI/2);this.reset();}
 reset(){for(const z of this.zones||[]){this.game.entities.remove(z.mesh);z.mesh.material.dispose();}for(const m of this.missiles||[])this.game.entities.remove(m.mesh);this.zones=[];this.missiles=[];this.clocks={storm:1,ember:1.6,scythe:1,comet:1.3};}
 nearest(pos,max=18,excluded=new Set()){let target=null,range=max;for(const e of this.game.enemies){const d=e.mesh.position.distanceTo(pos);if(e.hp>0&&!excluded.has(e)&&d<range){target=e;range=d;}}return target;}
 beam(a,b,color){const g=this.game,points=[new T.Vector3(a.x,1.1,a.z),new T.Vector3((a.x+b.x)/2+.18,1.3,(a.z+b.z)/2-.16),new T.Vector3(b.x,.8,b.z)],geo=new T.BufferGeometry().setFromPoints(points),mat=new T.LineBasicMaterial({color,transparent:true});const mesh=new T.Line(geo,mat);g.entities.add(mesh);g.feedback.sprites.push({mesh,life:.18,max:.18,size:1,ownGeo:true,fixedRotation:true});}
 zone(x,z,r,damage,life){if(this.zones.length>=8)return;const mat=new T.MeshBasicMaterial({color:0xf17a35,transparent:true,opacity:.16,depthWrite:false,side:T.DoubleSide}),mesh=new T.Mesh(this.zoneGeo,mat);mesh.position.set(x,.07,z);mesh.scale.setScalar(r);this.game.entities.add(mesh);this.zones.push({mesh,r,damage,life,tick:0});this.game.feedback.rune(x,z,r,0xfca25b,.7);}
 cast(id){
  const g=this.game,p=g.hunter.position,n=g.ranks[id]||0,evolved=g.skillEvolutions[id],power=g.stats.damage/22;
  if(id==='storm'){let e=this.nearest(p);if(!e)return false;let last=p;const struck=new Set();for(let i=0;e&&i<(evolved?7:Math.min(4,n));i++){this.beam(last,e.mesh.position,0x84ccff);g.feedback.spark(e.mesh.position.x,1,e.mesh.position.z,1.7,0x84ccff,.25);g.damageEnemy(e,(16+n*7)*power,false);struck.add(e);last=e.mesh.position;e=this.nearest(last,evolved?8:5,struck);}if(evolved){g.ring(last.x,last.z,0x9acdff,3,.35);for(const x of g.enemies)if(x.hp>0&&x.mesh.position.distanceTo(last)<3)g.damageEnemy(x,30*power,false);}}
  if(id==='ember'){const e=this.nearest(p);if(!e)return false;const targets=[e];if(evolved)for(const x of [...g.enemies].filter(x=>x.hp>0&&x!==e&&x.mesh.position.distanceTo(p)<18).sort((a,b)=>a.mesh.position.distanceTo(p)-b.mesh.position.distanceTo(p)).slice(0,2))targets.push(x);for(const t of targets)this.zone(t.mesh.position.x,t.mesh.position.z,1.25+n*.18,(9+n*4)*power,evolved?5.5:2.5+n*.3);}
  if(id==='scythe'){const radius=3+n*.35,arc=evolved?Math.PI:Math.PI*.38,angle=Math.atan2(-g.aimDirection.z,g.aimDirection.x);
   const geometry=new T.RingGeometry(radius*.7,radius,40,1,angle-arc,arc*2);geometry.rotateX(-Math.PI/2);const mesh=new T.Mesh(geometry,new T.MeshBasicMaterial({color:0xe75b83,transparent:true,opacity:.7,side:T.DoubleSide,depthWrite:false}));mesh.position.copy(p).setY(.13);g.entities.add(mesh);g.feedback.sprites.push({mesh,life:.3,max:.3,size:1,ownGeo:true,fixedRotation:true});
   for(const e of g.enemies){const d=e.mesh.position.clone().sub(p);if(e.hp<=0||d.length()>radius+e.r)continue;const dot=d.normalize().dot(g.aimDirection);if(evolved||dot>=Math.cos(arc)){g.damageEnemy(e,(20+n*8)*power,false);if(evolved)g.hp=Math.min(g.stats.maxHp,g.hp+.6);}}}
  if(id==='comet'){const target=this.nearest(p);if(!target)return false;const count=evolved?3:n>=3?2:1;for(let i=0;i<count&&this.missiles.length<16;i++){const mesh=new T.Mesh(this.orbGeo,this.orbMat);mesh.position.copy(p).setY(1.2);mesh.position.x+=(i-(count-1)/2)*.5;g.entities.add(mesh);this.missiles.push({mesh,target,damage:(24+n*9)*power,life:3,evolved});}}
  return true;
 }
 update(dt){const g=this.game;if(g.state!=='playing')return;
  for(const id of Object.keys(this.clocks)){if(!g.ranks[id])continue;this.clocks[id]-=dt;if(this.clocks[id]<=0)this.clocks[id]=this.cast(id)?({storm:3.2,ember:4.6,scythe:2.4,comet:3}[id]-.12*g.ranks[id])*Math.max(.55,g.stats.fireRate/.23):.25;}
  for(let i=this.zones.length-1;i>=0;i--){const z=this.zones[i];z.life-=dt;z.tick-=dt;z.mesh.material.opacity=.12+Math.sin(g.time*8)*.035;if(z.tick<=0){z.tick=.5;for(const e of g.enemies)if(e.hp>0&&e.mesh.position.distanceTo(z.mesh.position)<z.r+e.r)g.damageEnemy(e,z.damage*.5,false);}if(z.life<=0){g.entities.remove(z.mesh);z.mesh.material.dispose();this.zones.splice(i,1);}}
  for(let i=this.missiles.length-1;i>=0;i--){const m=this.missiles[i];m.life-=dt;if(m.target.hp<=0)m.target=this.nearest(m.mesh.position)||m.target;const v=m.target.mesh.position.clone().setY(1).sub(m.mesh.position),d=v.length();m.mesh.position.addScaledVector(v.normalize(),Math.min(d,dt*13));m.mesh.rotation.y+=dt*5;
   if(d<.5&&m.target.hp>0){g.damageEnemy(m.target,m.damage,false);g.feedback.spark(m.mesh.position.x,1,m.mesh.position.z,m.evolved?2.5:1.2,0xb3b8ff,.25);if(m.evolved)for(const e of g.enemies)if(e!==m.target&&e.hp>0&&e.mesh.position.distanceTo(m.mesh.position)<2.8)g.damageEnemy(e,m.damage*.55,false);m.life=0;}
   if(m.life<=0){g.entities.remove(m.mesh);this.missiles.splice(i,1);}
  }
 }
}
