import * as THREE from '../vendor/three.module.js';

// Shared geometry, per-character dye materials. The same rig renders in lobby and combat.
const cache = new Map();
const geometry = (key, create) => { if (!cache.has(key)) cache.set(key, create()); return cache.get(key); };
let metalMap;
function metalTexture() {
  if (!metalMap) {
    metalMap = new THREE.TextureLoader().load('/assets/forged-metal-v05.png');
    metalMap.colorSpace = THREE.SRGBColorSpace; metalMap.wrapS = metalMap.wrapT = THREE.RepeatWrapping;
    metalMap.repeat.set(2, 2); metalMap.anisotropy = 4;
  }
  return metalMap;
}
function surface(color, metalness, roughness) {
  return new THREE.MeshPhysicalMaterial({ color, metalness, roughness, clearcoat:.25,clearcoatRoughness:.35, map: metalTexture(), bumpMap: metalTexture(), bumpScale: .012 });
}
function mesh(parent, geom, material, x=0, y=0, z=0, scale) {
  const m = new THREE.Mesh(geom, material); m.position.set(x,y,z); if (scale) m.scale.set(...scale);
  m.castShadow = m.receiveShadow = true; parent.add(m); return m;
}
function sphere(parent, material, x,y,z, sx,sy,sz) {
  return mesh(parent, geometry('sphere',()=>new THREE.SphereGeometry(1,24,16)),material,x,y,z,[sx,sy,sz]);
}
function cylinder(parent, material, x,y,z, top,bottom,height) {
  return mesh(parent, geometry(`c${top},${bottom},${height}`,()=>new THREE.CylinderGeometry(top,bottom,height,24)),material,x,y,z);
}
function jewel(parent, material, x,y,z, sx,sy,sz) {
  return mesh(parent,geometry('jewel',()=>new THREE.OctahedronGeometry(1)),material,x,y,z,[sx,sy,sz]);
}
function line(parent, material, points, radius=.012) {
  return mesh(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),16,radius,5,false),material);
}
function plate(parent, material, points, depth=.06) {
  const shape = new THREE.Shape(); points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
  return mesh(parent,new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.025,bevelThickness:.018}),material);
}
function cape(parent, material, width, length, offset=0) {
  const geom = new THREE.PlaneGeometry(width,length,24,24), pos=geom.attributes.position;
  for(let i=0;i<pos.count;i++) {
    const u=(pos.getX(i)/width+.5), v=.5-pos.getY(i)/length;
    pos.setXYZ(i,(u-.5)*width*(.5+v*.6),1.63-v*length,.19+v*.43+Math.cos(u*Math.PI*10)*(.025+v*.055)+offset);
  }
  geom.computeVertexNormals();const m=mesh(parent,geom,material);m.userData.rest=new Float32Array(pos.array);return m;
}
export function createHunter() {
  const root=new THREE.Group();
  const steel=surface(0x87939e,.72,.42), dark=surface(0x394454,.55,.49), trim=surface(0xbfa579,.73,.38), ivory=surface(0xc5d6d7,.6,.32);
  const leather=new THREE.MeshStandardMaterial({color:0x10151e,roughness:.87,metalness:.06});
  const cloth=new THREE.MeshStandardMaterial({color:0x8f1833,roughness:.91,metalness:.05,side:THREE.DoubleSide,bumpMap:metalTexture(),bumpScale:.009});
  const glow=new THREE.MeshStandardMaterial({color:0xffb8b0,emissive:0xff2749,emissiveIntensity:1.5,roughness:.18,metalness:.3});
  const cloths=[],legs=[];
  for(const s of [-1,1]) {
    const leg=new THREE.Group();leg.position.set(s*.155,.69,0);root.add(leg);legs.push(leg);
    sphere(leg,leather,0,-.18,0,.11,.24,.115);
    sphere(leg,dark,0,-.08,-.06,.115,.17,.08);
    jewel(leg,trim,0,-.28,-.10,.12,.11,.055);
    sphere(leg,steel,0,-.45,0,.102,.19,.11);
    sphere(leg,dark,0,-.60,-.095,.118,.09,.21);
    line(leg,trim,[[0,-.34,-.106],[0,-.47,-.12],[0,-.56,-.15]],.008);
  }
  // Sculpted cuirass, overlapping breastplates and inset filigree.
  sphere(root,leather,0,1.13,0,.27,.42,.17);
  const torso=mesh(root,new THREE.LatheGeometry([new THREE.Vector2(.20,.78),new THREE.Vector2(.22,.92),new THREE.Vector2(.25,1.09),new THREE.Vector2(.32,1.34),new THREE.Vector2(.25,1.48),new THREE.Vector2(.14,1.51)],32),dark);
  torso.scale.z=.66;
  for(const s of [-1,1]) {
    const chest=plate(root,steel,[[s*.015,1.42],[s*.26,1.4],[s*.27,1.19],[s*.05,1.11]],.035);chest.position.z=-.17;
    line(root,trim,[[s*.03,1.43,-.23],[s*.245,1.39,-.22],[s*.25,1.20,-.22],[s*.05,1.13,-.23]],.008);
    for(let j=0;j<3;j++) line(root,trim,[[s*.08,1.35-j*.052,-.24],[s*.19,1.39-j*.052,-.235]],.005);
    sphere(root,dark,s*.34,1.30,.025,.12,.22,.12);
    sphere(root,leather,s*.41,1.06,-.025,.085,.17,.09);
    sphere(root,steel,s*.43,.99,-.085,.093,.16,.095);
    jewel(root,trim,s*.43,1.00,-.185,.045,.10,.025);
    sphere(root,leather,s*.45,.82,-.12,.085,.095,.08);
  }
  cylinder(root,leather,0,.91,0,.225,.22,.095);
  jewel(root,trim,0,.91,-.175,.09,.075,.045);jewel(root,glow,0,.91,-.212,.045,.044,.03);
  for(let i=0;i<3;i++) {
    const p=plate(root,dark,[[-.19,.87-i*.065],[.19,.87-i*.065],[.16,.80-i*.065],[-.16,.80-i*.065]],.025);p.position.z=-.17;
  }
  cylinder(root,cloth,0,1.51,0,.15,.20,.11);
  const scarf=cloths[cloths.push(cape(root,cloth,.94,1.46))-1];
  const scarfTail=cloths[cloths.push(cape(root,cloth,.36,1.34,.025))-1];scarfTail.position.x=.34;scarfTail.rotation.z=.15;
  // Faceplate reads clearly from the game camera; no painted facial texture.
  sphere(root,dark,0,1.75,0,.18,.24,.17);
  const mask=plate(root,steel,[[-.16,1.83],[-.13,1.63],[0,1.53],[.13,1.63],[.16,1.83],[0,1.9]],.035);mask.position.z=-.15;
  for(const s of [-1,1]) {
    const shape=new THREE.Shape();shape.moveTo(s*.028,1.774);shape.lineTo(s*.136,1.803);shape.lineTo(s*.12,1.785);shape.lineTo(s*.03,1.762);shape.closePath();
    const eye=mesh(root,new THREE.ShapeGeometry(shape),glow);eye.position.z=-.213;eye.material.side=THREE.DoubleSide;
    line(root,trim,[[s*.145,1.84,-.21],[s*.11,1.66,-.205],[s*.018,1.565,-.205]],.008);
  }
  jewel(root,trim,0,1.77,-.20,.025,.19,.05);
  const variants={hunter:new THREE.Group(),shade:new THREE.Group(),oracle:new THREE.Group()};
  Object.values(variants).forEach(g=>root.add(g));
  // Hunter: broad layered pauldrons and a tall central helmet crest.
  for(const s of [-1,1])for(let j=0;j<3;j++) {
    const p=sphere(variants.hunter,j===0?steel:dark,s*(.32+j*.026),1.45-j*.075,0,.22-j*.015,.105,.205);p.rotation.z=-s*.25;
    line(variants.hunter,trim,[[s*.21,1.5-j*.075,-.12],[s*.38,1.5-j*.075,-.18],[s*.53,1.42-j*.075,-.03]],.009);
    if(j===0)jewel(variants.hunter,steel,s*.45,1.58,.025,.055,.135,.07);
  }
  jewel(variants.hunter,steel,0,1.965,.01,.07,.12,.12);
  jewel(variants.hunter,trim,0,2.00,-.04,.018,.115,.035);
  // Articulated skirt plates and long greaves give the silhouette a human stance.
  for(const s of [-1,1]) {
    sphere(root,leather,s*.405,1.10,-.015,.088,.265,.088);
    for(let j=0;j<3;j++) {
      const flap=plate(root,dark,[[s*.22,.91-j*.11],[s*.35,.88-j*.11],[s*.39,.74-j*.11],[s*.24,.73-j*.11]],.025);flap.position.z=-.105;
      line(root,trim,[[s*.24,.895-j*.11,-.13],[s*.34,.87-j*.11,-.13],[s*.365,.765-j*.11,-.13]],.006);
    }
  }
  // Shade: open pointed hood with a dark inner face and asymmetrical blade mantle.
  const hoodGeo=new THREE.SphereGeometry(.26,32,24,.27,Math.PI*1.82,0,Math.PI*.76);
  const hood=mesh(variants.shade,hoodGeo,cloth,0,1.79,.055,[1,1.18,1]);hood.rotation.y=Math.PI;
  jewel(variants.shade,cloth,0,2.00,.07,.20,.19,.18);
  for(const s of [-1,1]) {
    sphere(variants.shade,dark,s*.34,1.44,0,.19,.11,.18);
    for(let j=0;j<(s===-1?3:1);j++)jewel(variants.shade,steel,s*(.35+j*.075),1.51+j*.06,.04,.045,.17,.09);
  }
  // Oracle: ivory armor, ceremonial crown and a suspended crescent behind the shoulders.
  for(const s of [-1,1]) {
    sphere(variants.oracle,ivory,s*.32,1.43,0,.20,.10,.18);
    const panel=plate(variants.oracle,ivory,[[s*.10,.88],[s*.27,.84],[s*.40,.18],[s*.20,.27]],.035);panel.position.z=-.11;
    line(variants.oracle,trim,[[s*.12,.83,-.16],[s*.23,.29,-.16]],.009);
  }
  for(let i=0;i<5;i++) {
    const a=(i/4-.5)*Math.PI*1.25,x=Math.sin(a)*.18,z=Math.cos(a)*.15;
    jewel(variants.oracle,trim,x,2.00+(.16-Math.abs(i-2)*.035),z,.035,.23,.045);
    jewel(variants.oracle,glow,x,2.15+(.16-Math.abs(i-2)*.035),z,.025,.05,.03);
  }
  const crescent=mesh(variants.oracle,new THREE.TorusGeometry(.49,.035,8,64,Math.PI*1.6),trim,0,1.64,.24);crescent.rotation.z=-Math.PI*.3;
  jewel(variants.oracle,glow,0,1.22,-.26,.07,.13,.05);
  const pistolParts=[],shotgunParts=[],crossbowParts=[];
  function weaponGroup(parts,x,y,z) { const g=new THREE.Group();g.position.set(x,y,z);root.add(g);parts.push(g);return g; }
  for(const s of [-1,1]) {
    const gun=weaponGroup(pistolParts,s*.45,.81,-.16);gun.rotation.x=.24;
    const barrel=cylinder(gun,steel,0,-.02,-.18,.037,.041,.39);barrel.rotation.x=Math.PI/2;
    const muzzle=cylinder(gun,trim,0,-.065,-.39,.047,.047,.045);muzzle.rotation.x=Math.PI/2;
    sphere(gun,dark,0,0,-.05,.064,.065,.17);cylinder(gun,trim,0,.06,-.01,.035,.04,.19);
    jewel(gun,glow,0,.015,-.14,.025,.018,.055);
  }
  const shotgun=weaponGroup(shotgunParts,.43,.86,-.25);
  for(const x of [-.035,.035]){const b=cylinder(shotgun,steel,x,-.035,-.26,.038,.038,.65);b.rotation.x=Math.PI/2;}
  sphere(shotgun,trim,0,-.03,-.06,.10,.08,.17);
  const crossbow=weaponGroup(crossbowParts,.41,.87,-.25);
  const rail=cylinder(crossbow,dark,0,0,-.22,.04,.04,.72);rail.rotation.x=Math.PI/2;
  line(crossbow,trim,[[-.36,0,-.26],[-.24,0,-.42],[0,0,-.5],[.24,0,-.42],[.36,0,-.26]],.026);
  line(crossbow,ivory,[[-.36,0,-.26],[0,0,-.02],[.36,0,-.26]],.005);
  const ring=mesh(root,new THREE.RingGeometry(.61,.64,64),new THREE.MeshBasicMaterial({color:0xff5570,transparent:true,opacity:.4,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.025;
  // Lengthen the legs while preserving the existing walk animation pivots.
  for(const part of root.children){if(part===ring)continue;if(legs.includes(part)){part.position.y+=.16;part.scale.y=1.24;}else part.position.y+=.16;}
  root.userData={legs,scarf,scarfTail,cloths,pistolParts,shotgunParts,crossbowParts,ring,variants,cloth,glow,trim};
  dressHunter(root,{hunter:'hunter',weapon:'pistols'});return root;
}
export const roleColors={hunter:0xba2546,shade:0x7950bd,oracle:0x258f92};
export function dressHunter(hunter,loadout,dye) {
  const d=hunter.userData,role=Object.hasOwn(roleColors,loadout.hunter)?loadout.hunter:'hunter',color=dye??roleColors[role];
  d.pistolParts.forEach(m=>m.visible=loadout.weapon==='pistols');d.shotgunParts.forEach(m=>m.visible=loadout.weapon==='shotgun');d.crossbowParts.forEach(m=>m.visible=loadout.weapon==='crossbow');
  Object.entries(d.variants).forEach(([id,g])=>g.visible=id===role);
  d.cloth.color.setHex(color);d.glow.emissive.setHex(color);d.ring.material.color.setHex(color);d.role=role;d.dye=color;
}
export function animateHunter(hunter,time,amount=1) {
  for(const m of hunter.userData.cloths) {
    const p=m.geometry.attributes.position,rest=m.userData.rest;
    for(let i=0;i<p.count;i++) {const y=rest[i*3+1],v=Math.max(0,1.63-y);p.setZ(i,rest[i*3+2]+Math.sin(time*2.4+rest[i*3]*4+v*2)*.065*v*amount);}
    p.needsUpdate=true;
  }
}
