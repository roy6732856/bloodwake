import * as T from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {clone} from '../vendor/SkeletonUtils.js';
export const roleColors={hunter:0xba2546,shade:0x7950bd,oracle:0x258f92,pyre:0xdd6b29,sentinel:0x429bbf};
let assets,loading;
export function loadHunterAssets(){
 if(loading)return loading;
 const loader=new GLTFLoader(),names=['Male_Ranger','Female_Ranger','Male_Peasant','Superhero_Male_FullBody','Superhero_Female_FullBody','Hair_SimpleParted','Hair_Long'];
 loading=Promise.all([Promise.all(names.map(n=>loader.loadAsync(`/assets/characters/${n}.gltf`))),fetch('/assets/characters/motions.json').then(r=>{if(!r.ok)throw Error('動作載入失敗');return r.json();})]).then(([models,motions])=>{assets=Object.fromEntries(names.map((n,i)=>[n,models[i].scene]));assets.clips=motions.map(c=>T.AnimationClip.parse(c));});return loading;
}
function addHead(root,female,hair){
 const base=assets[female?'Superhero_Female_FullBody':'Superhero_Male_FullBody'];base.updateMatrixWorld(true);
 const inverse=base.getObjectByName('Head').matrixWorld.clone().invert(),head=root.getObjectByName('Head');
 const attach=o=>{if(!o.isMesh)return;const g=o.geometry.clone();
  if(/superhero/i.test(o.name)){const p=g.attributes.position,indices=[];for(let i=0;i<g.index.count;i+=3){const a=g.index.getX(i),b=g.index.getX(i+1),c=g.index.getX(i+2);if(Math.min(p.getY(a),p.getY(b),p.getY(c))>(female?1.49:1.545))indices.push(a,b,c);}g.setIndex(indices);}
  g.applyMatrix4(inverse);g.computeBoundingSphere();const material=o.material.clone();material.metalness=0;material.roughness=.8;const mesh=new T.Mesh(g,material);mesh.name='Portrait_'+o.name;mesh.castShadow=true;head.add(mesh);
 };base.traverse(attach);if(hair)assets[hair].traverse(attach);
}
function weapon(kind){
 const root=new T.Group(),steel=new T.MeshStandardMaterial({color:0x8c9ca5,metalness:.8,roughness:.32}),dark=new T.MeshStandardMaterial({color:0x1d2529,metalness:.6,roughness:.4}),wood=new T.MeshStandardMaterial({color:0x40291e,roughness:.75});
 const box=(mat,x,y,z,a,b,c)=>{const m=new T.Mesh(new T.BoxGeometry(a,b,c),mat);m.position.set(x,y,z);m.castShadow=true;root.add(m);};
 box(wood,0,-.025,0,.045,.12,.055);box(dark,0,.04,.08,.065,.07,.21);const length=kind==='pistols'?.24:.48;
 for(const x of kind==='shotgun'?[-.025,.025]:[0]){const m=new T.Mesh(new T.CylinderGeometry(.019,.019,length,12),steel);m.rotation.x=Math.PI/2;m.position.set(x,.04,.1+length/2);root.add(m);}
 if(kind==='crossbow'){box(wood,0,.03,.16,.055,.065,.35);const curve=new T.CatmullRomCurve3([new T.Vector3(-.27,.04,.24),new T.Vector3(0,.04,.35),new T.Vector3(.27,.04,.24)]);root.add(new T.Mesh(new T.TubeGeometry(curve,16,.013,6,false),steel));}return root;
}
function actor(role){
 const female=role==='shade'||role==='oracle',source=role==='pyre'?'Male_Peasant':female?'Female_Ranger':'Male_Ranger',root=clone(assets[source]),materials=[];
 root.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;o.material=o.material.clone();
  if(/Ranger|Peasant/.test(o.material.name)){const dye={value:new T.Color(roleColors[role])};o.material.onBeforeCompile=shader=>{shader.uniforms.garmentDye=dye;shader.fragmentShader='uniform vec3 garmentDye;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   float garment = smoothstep(1.02, 1.24, diffuseColor.g / max(0.0001, max(diffuseColor.r, diffuseColor.b)));
   float luminance = dot(diffuseColor.rgb, vec3(.2126,.7152,.0722));
   ${source==='Male_Peasant'&&/Body|Arms/.test(o.name)?'garment = .85;':''}
   diffuseColor.rgb = mix(diffuseColor.rgb, garmentDye * luminance * 2.0, garment);`);};o.material.customProgramCacheKey=()=> 'bloodwake-garment-v3-'+source+'-'+o.name;materials.push(dye);}
 });
 addHead(root,female,role==='pyre'?'Hair_SimpleParted':role==='oracle'?'Hair_Long':null);
 if(role==='oracle'||role==='shade')root.traverse(o=>{if(/Pauldron/.test(o.name)||(role==='oracle'&&/Head_Hood/.test(o.name)))o.visible=false;});
 const mixer=new T.AnimationMixer(root),idle=assets.clips.find(c=>c.name==='Pistol_Idle_Loop'),walk=assets.clips.find(c=>c.name==='Jog_Fwd_Loop'),lower=name=>/^(root|pelvis|thigh_|calf_|foot_|ball_)/.test(name);
 mixer.clipAction(new T.AnimationClip('aim',idle.duration,idle.tracks.filter(t=>!lower(t.name)))).play();
 const idleAction=mixer.clipAction(new T.AnimationClip('still',idle.duration,idle.tracks.filter(t=>lower(t.name)))).play(),runAction=mixer.clipAction(new T.AnimationClip('run',walk.duration,walk.tracks.filter(t=>lower(t.name)))).play();runAction.setEffectiveWeight(0);mixer.update(0);root.updateMatrixWorld(true);
 const hand=root.getObjectByName('hand_r'),pistolParts=[],shotgunParts=[],crossbowParts=[];
 for(const [kind,parts]of [['pistols',pistolParts],['shotgun',shotgunParts],['crossbow',crossbowParts]]){const mesh=weapon(kind);mesh.quaternion.copy(hand.getWorldQuaternion(new T.Quaternion()).invert());mesh.position.set(0,.035,0);hand.add(mesh);parts.push(mesh);}
 root.userData={mixer,idleAction,runAction,materials,pistolParts,shotgunParts,crossbowParts};return root;
}
export function createHunter(){
 if(!assets)throw Error('角色資產尚未載入');const root=new T.Group(),variants={};
 for(const role of Object.keys(roleColors)){const model=actor(role);model.rotation.y=Math.PI;model.scale.setScalar(1.16);root.add(model);variants[role]=model;}
 const ring=new T.Mesh(new T.RingGeometry(.48,.5,64),new T.MeshBasicMaterial({color:roleColors.hunter,transparent:true,opacity:.3,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.018;root.add(ring);
 root.userData={variants,ring,legs:[],scarf:new T.Group(),scarfTail:new T.Group(),moving:false,lastTime:null};dressHunter(root,{hunter:'hunter',weapon:'pistols'});return root;
}
export function dressHunter(root,loadout,dye){
 const d=root.userData,role=Object.hasOwn(roleColors,loadout.hunter)?loadout.hunter:'hunter';d.role=role;d.dye=dye??roleColors[role];
 for(const [id,model]of Object.entries(d.variants))model.visible=id===role;const a=d.variants[role].userData;for(const u of a.materials)u.value.setHex(d.dye);
 for(const key of ['pistolParts','shotgunParts','crossbowParts'])d[key]=a[key];
 d.pistolParts.forEach(m=>m.visible=loadout.weapon==='pistols');d.shotgunParts.forEach(m=>m.visible=loadout.weapon==='shotgun');d.crossbowParts.forEach(m=>m.visible=loadout.weapon==='crossbow');d.ring.material.color.setHex(d.dye);d.lastTime=null;
}
export function animateHunter(root,time,amount=1){
 const d=root.userData,dt=d.lastTime===null?0:Math.max(0,Math.min(.05,time-d.lastTime));d.lastTime=time;const a=d.variants[d.role].userData,weight=d.moving?1:0;a.runAction.setEffectiveWeight(weight);a.idleAction.setEffectiveWeight(1-weight);a.mixer.update(dt*(amount?1:0));
}
