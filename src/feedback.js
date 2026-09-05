import * as THREE from '../vendor/three.module.js';

export class CombatFeedback {
  constructor(game){this.game=game;const loader=new THREE.TextureLoader();this.impact=loader.load('/assets/impact.png');this.sigil=loader.load('/assets/arcane-ring.png');this.sprites=[];this.numbers=[];this.shake=0;this.stop=0;this.lastStop=-1;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.layer=document.getElementById('floating-feedback');}
  reset(){for(const s of this.sprites){this.game.entities.remove(s.mesh);s.mesh.material.dispose();if(s.ownGeo)s.mesh.geometry.dispose();}for(const n of this.numbers)n.el.remove();this.sprites=[];this.numbers=[];this.shake=0;this.stop=0;}
  spark(x,y,z,size=.7,color=0xffdb9f,life=.13){
    if(this.sprites.length>36)return;
    const material=new THREE.SpriteMaterial({map:this.impact,color,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,rotation:Math.random()*Math.PI*2});const mesh=new THREE.Sprite(material);mesh.position.set(x,y,z);mesh.scale.setScalar(size);this.game.entities.add(mesh);this.sprites.push({mesh,life,max:life,size});
  }
  rune(x,z,radius=7,color=0x63e8d8,life=.8){const material=new THREE.MeshBasicMaterial({map:this.sigil,color,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.09,z);mesh.scale.setScalar(radius*2);this.game.entities.add(mesh);this.sprites.push({mesh,life,max:life,size:radius*2,ownGeo:true});}
  hit(position,amount,crit=false,lethal=false){
    this.spark(position.x,.95,position.z,crit?1.25:.55,crit?0xffc168:0xe3faff,crit?.2:.11);
    if(this.layer){if(this.numbers.length>=32)this.numbers.shift().el.remove();const el=document.createElement('span');el.className=crit?'damage-number critical':'damage-number';el.textContent=Math.round(amount)+(crit?'!':'');this.layer.append(el);this.numbers.push({el,point:position.clone().setY(1.7),life:.65,offset:(Math.random()-.5)*30});}
    if(crit||lethal){this.shake=Math.max(this.shake,crit?.075:.04);if(crit&&this.game.time-this.lastStop>.3){this.stop=.025;this.lastStop=this.game.time;}}
    this.game.emit('hit',{crit,lethal});
  }
  update(dt){
    this.shake=Math.max(0,this.shake-dt*.7);this.stop=Math.max(0,this.stop-dt);
    for(let i=this.sprites.length-1;i>=0;i--){const s=this.sprites[i];s.life-=dt;s.mesh.material.opacity=Math.max(0,s.life/s.max);if(s.ownGeo){if(!s.fixedRotation)s.mesh.rotation.z+=dt*.5;}else s.mesh.scale.setScalar(s.size*(1+(1-s.life/s.max)*.45));if(s.life<=0){this.game.entities.remove(s.mesh);s.mesh.material.dispose();if(s.ownGeo)s.mesh.geometry.dispose();this.sprites.splice(i,1);}}
    const w=this.game.container.clientWidth,h=this.game.container.clientHeight;
    for(let i=this.numbers.length-1;i>=0;i--){const n=this.numbers[i];n.life-=dt;n.point.y+=dt*1.2;const v=n.point.clone().project(this.game.camera);n.el.style.transform=`translate(${(v.x*.5+.5)*w+n.offset}px,${(-v.y*.5+.5)*h}px)`;n.el.style.opacity=Math.min(1,n.life*3);if(n.life<=0){n.el.remove();this.numbers.splice(i,1);}}
  }
}
