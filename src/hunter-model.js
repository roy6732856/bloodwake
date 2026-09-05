import * as THREE from '../vendor/three.module.js';

// One articulated model is shared by the wardrobe and the actual playable character.
const cache=new Map();
const geo=(key,fn)=>{if(!cache.has(key))cache.set(key,fn());return cache.get(key);};
let grain;
function texture(){if(!grain){grain=new THREE.TextureLoader().load('/assets/forged-metal-v05.png');grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.repeat.set(1.5,1.5);}return grain;}
const metal=(color,roughness=.46)=>new THREE.MeshStandardMaterial({color,metalness:.68,roughness,map:texture(),roughnessMap:texture(),bumpMap:texture(),bumpScale:.006});
function mesh(parent,g,m,x=0,y=0,z=0,scale){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);if(scale)o.scale.set(...scale);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
function ball(p,m,x,y,z,sx,sy,sz){return mesh(p,geo('sphere',()=>new THREE.SphereGeometry(1,20,14)),m,x,y,z,[sx,sy,sz]);}
function box(p,m,x,y,z,w,h,d){return mesh(p,geo('box',()=>new THREE.BoxGeometry(1,1,1)),m,x,y,z,[w,h,d]);}
function gem(p,m,x,y,z,sx,sy,sz){return mesh(p,geo('gem',()=>new THREE.OctahedronGeometry(1)),m,x,y,z,[sx,sy,sz]);}
function bone(p,m,a,b,r1,r2=r1){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),v=bv.clone().sub(av);const o=mesh(p,geo(`bone${r1},${r2},${v.length().toFixed(4)}`,()=>new THREE.CylinderGeometry(r2,r1,v.length(),12)),m);o.position.copy(av.add(bv).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;}
function line(p,m,pts,r=.006){return mesh(p,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(a=>new THREE.Vector3(...a))),20,r,5,false),m);}
function panel(p,m,points,z,depth=.025,bevel=.009){const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();return mesh(p,new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:bevel,bevelThickness:bevel}),m,0,0,z);}
function lathe(p,m,profile,zscale=1){const o=mesh(p,new THREE.LatheGeometry(profile.map(a=>new THREE.Vector2(...a)),32),m);o.scale.z=zscale;return o;}
function curvePlate(o,curvature=1.1){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)+p.getX(i)**2*curvature);o.geometry.computeVertexNormals();return o;}
function clothPanel(parent,material,cloths,{x=0,y=1.87,z=.15,width=.7,length=1.55,spread=1,back=.28}={}){
  const pivot=new THREE.Group();pivot.position.set(x,y,z);parent.add(pivot);
  const geometry=new THREE.PlaneGeometry(width,length,18,22),pos=geometry.attributes.position;
  for(let i=0;i<pos.count;i++){const u=pos.getX(i)/width+.5,v=.5-pos.getY(i)/length;pos.setXYZ(i,(u-.5)*width*(.64+v*spread),-v*length+Math.sin(u*Math.PI*3)*.025*v,v*back+Math.cos(u*Math.PI*8)*(.012+v*.035));}
  geometry.computeVertexNormals();const c=mesh(pivot,geometry,material);c.userData.rest=new Float32Array(pos.array);cloths.push(c);
  // A separate inner surface gives the silhouette a visible hem instead of a paper edge.
  const lining=mesh(pivot,geometry,material);lining.position.z=.009;return pivot;
}
export function createHunter(){
  const root=new THREE.Group();root.name='Bloodwake articulated hunter';
  const steel=metal(0x778e9c),dark=metal(0x283c46,.58),trim=metal(0xb29764,.4),ivory=metal(0xc7d5d2,.4);
  const leather=new THREE.MeshStandardMaterial({color:0x172126,roughness:.84,metalness:.03,bumpMap:texture(),bumpScale:.003});
  const rubber=new THREE.MeshStandardMaterial({color:0x0c1015,roughness:.95});
  const cloth=new THREE.MeshStandardMaterial({color:0x982740,roughness:.94,side:THREE.DoubleSide,bumpMap:texture(),bumpScale:.004});
  const glow=new THREE.MeshStandardMaterial({color:0xffd9b9,emissive:0xba2546,emissiveIntensity:1.1,roughness:.32});
  const amber=new THREE.MeshStandardMaterial({color:0xdf8126,emissive:0xd86016,emissiveIntensity:.7,metalness:.25,roughness:.2});
  const ice=new THREE.MeshStandardMaterial({color:0x9ee0ed,emissive:0x3e97bc,emissiveIntensity:.55,metalness:.35,roughness:.22});
  const legs=[],cloths=[];
  // Hip-height pivots, tapered trousers and shaped boots, rather than stacked spheres.
  for(const s of [-1,1]){
    const leg=new THREE.Group();leg.position.set(s*.145,1.08,0);root.add(leg);legs.push(leg);
    bone(leg,leather,[0,-.02,0],[s*.025,-.44,.005],.105,.083);
    bone(leg,leather,[s*.025,-.43,.005],[s*.03,-.90,0],.083,.062);
    panel(leg,dark,[[-.085,-.12],[.085,-.12],[.071,-.35],[0,-.4],[-.071,-.35]],-.091,.025);
    panel(leg,steel,[[-.085,-.41],[0,-.37],[.085,-.41],[.065,-.5],[0,-.54],[-.065,-.5]],-.104,.028);
    panel(leg,steel,[[-.065,-.55],[.065,-.55],[.055,-.88],[-.05,-.91]],-.078,.03);
    line(leg,trim,[[0,-.55,-.096],[0,-.73,-.094],[0,-.9,-.105]],.006);
    for(const y of [-.61,-.8]){const strap=bone(leg,leather,[-.075,y,0],[.075,y,0],.074);strap.scale.y=.12;box(leg,trim,.052,y,-.081,.032,.021,.013);}
    // Boot outline extruded vertically: flat sole, heel, instep and a narrower toe.
    const sole=new THREE.Shape();sole.moveTo(-.074,.074);sole.lineTo(.074,.074);sole.lineTo(.085,-.1);sole.quadraticCurveTo(.085,-.24,.045,-.255);sole.lineTo(-.045,-.255);sole.quadraticCurveTo(-.085,-.24,-.085,-.1);sole.closePath();
    const soleMesh=mesh(leg,new THREE.ExtrudeGeometry(sole,{depth:.042,bevelEnabled:true,bevelSegments:2,bevelSize:.006,bevelThickness:.004}),rubber,s*.027,-1.063,0);soleMesh.rotation.x=Math.PI/2;
    ball(leg,leather,s*.027,-.969,-.067,.078,.093,.15);
    panel(leg,steel,[[-.065,-1.0],[.065,-1.0],[.053,-.95],[-.053,-.95]],-.211,.025);
    for(let j=0;j<3;j++)line(leg,trim,[[-.052,-.925-j*.025,-.13],[0,-.919-j*.025,-.149],[.052,-.925-j*.025,-.13]],.0035);
  }
  lathe(root,leather,[[.19,1.04],[.21,1.19],[.19,1.34],[.215,1.55],[.28,1.77],[.23,1.91],[.11,1.97]],.64);
  // Fitted overlapping cuirass follows the body's taper; bronze seams sit on its surface.
  lathe(root,dark,[[.205,1.35],[.215,1.52],[.279,1.77],[.254,1.85],[.16,1.92]],.67);
  for(const s of [-1,1]){
    curvePlate(panel(root,steel,[[s*.013,1.83],[s*.23,1.81],[s*.247,1.68],[s*.15,1.56],[s*.025,1.59]],-.221,.025));
    line(root,trim,[[s*.02,1.843,-.235],[s*.23,1.813,-.177],[s*.24,1.688,-.172],[s*.146,1.575,-.211],[s*.027,1.606,-.234]],.005);
    for(let j=0;j<3;j++)line(root,trim,[[s*.056,1.75-j*.035,-.235],[s*.118,1.77-j*.035,-.223],[s*.177,1.75-j*.035,-.203]],.0028);
    for(const [x,y]of [[.21,1.79],[.22,1.7],[.14,1.6]])ball(root,trim,s*x,y,-.24+x*x*1.1,.008,.008,.005);
    // Anatomical elbow bend and continuous fitted sleeves connect shoulder to the grip.
    bone(root,leather,[s*.28,1.82,0],[s*.365,1.51,-.025],.087,.072);
    ball(root,leather,s*.365,1.51,-.025,.074,.076,.07);
    bone(root,leather,[s*.365,1.51,-.025],[s*.355,1.41,-.32],.07,.054);
    const vambrace=bone(root,steel,[s*.364,1.49,-.08],[s*.356,1.42,-.265],.076,.059);
    line(root,trim,[[s*.364,1.555,-.075],[s*.36,1.50,-.18],[s*.356,1.475,-.265]],.006);
    ball(root,leather,s*.355,1.4,-.329,.057,.069,.048);
    for(let j=0;j<4;j++)bone(root,leather,[s*(.317+j*.023),1.417,-.346],[s*(.318+j*.023),1.365,-.373],.010,.011);
    bone(root,leather,[s*.31,1.435,-.319],[s*.319,1.393,-.369],.018,.014);
    // Strapped hip pouches and overlapping tassets end above the articulated knees.
    box(root,leather,s*.236,1.16,.015,.085,.14,.13);box(root,trim,s*.239,1.185,-.055,.035,.027,.012);
    for(let j=0;j<3;j++){
      panel(root,dark,[[s*.11,1.23-j*.1],[s*.24,1.24-j*.1],[s*.29,1.1-j*.1],[s*.135,1.09-j*.1]],-.116,.024);
      line(root,trim,[[s*.135,1.106-j*.1,-.13],[s*.27,1.115-j*.1,-.13]],.004);
    }
  }
  for(const side of [-1,1]){
    const lapel=curvePlate(panel(root,leather,[[side*.145,1.94],[side*.275,1.86],[side*.175,1.57],[side*.12,1.7]],-.205,.02));
    line(root,trim,[[side*.15,1.925,-.19],[side*.26,1.855,-.15],[side*.177,1.60,-.18]],.004);
    clothPanel(root,cloth,cloths,{x:side*.215,y:1.26,z:.045,width:.16,length:.92,spread:.45,back:.10});
  }
  for(let j=0;j<3;j++)panel(root,dark,[[-.14,1.56-j*.065],[.14,1.56-j*.065],[.17,1.5-j*.065],[-.17,1.5-j*.065]],-.141,.022);
  const belt=lathe(root,leather,[[.205,1.255],[.207,1.34]],.7);
  box(root,trim,0,1.29,-.153,.10,.065,.018);box(root,dark,0,1.29,-.166,.072,.041,.014);
  line(root,leather,[[-.175,1.85,-.225],[-.03,1.6,-.226],[.16,1.35,-.17]],.018);
  for(let j=0;j<3;j++)box(root,trim,-.10+j*.035,1.73-j*.062,-.247,.027,.043,.012);
  bone(root,leather,[0,1.9,0],[0,2.02,0],.09);
  lathe(root,cloth,[[.14,1.9],[.126,1.97],[.107,2.01]],.84);
  // Human-sized enclosed helmet; a narrow visor and central folded ridge replace the giant crest.
  const head=new THREE.Group();head.position.y=2.14;root.add(head);
  lathe(head,dark,[[.068,-.175],[.121,-.115],[.144,.015],[.132,.113],[.083,.171],[.015,.186]],.85);
  const face=new THREE.BufferGeometry();
  const vertices=[[0,.14,-.135],[-.123,.075,-.10],[.123,.075,-.10],[-.105,-.075,-.115],[.105,-.075,-.115],[0,-.163,-.145],[0,.024,-.20],[0,-.08,-.207]];
  face.setAttribute('position',new THREE.Float32BufferAttribute(vertices.flat(),3));face.setIndex([0,6,1,0,2,6,1,6,3,2,4,6,3,6,7,6,4,7,3,7,5,7,4,5]);face.computeVertexNormals();const faceplate=mesh(head,face,steel);faceplate.material.side=THREE.DoubleSide;
  for(const s of [-1,1]){
    curvePlate(panel(head,rubber,[[s*.015,.035],[s*.113,.063],[s*.105,.031],[s*.015,.012]],-.197,.004,.001),5.8);
    curvePlate(panel(head,glow,[[s*.026,.03],[s*.102,.05],[s*.096,.037],[s*.026,.018]],-.202,.002,.0005),5.8);
    line(head,trim,[[s*.113,.085,-.14],[s*.102,-.075,-.146],[s*.01,-.156,-.14]],.004);
    line(head,dark,[[s*.024,-.048,-.153],[s*.071,-.035,-.153]],.003);
    ball(head,trim,s*.14,-.014,-.014,.016,.023,.034);
  }
  line(head,trim,[[0,.14,-.14],[0,.024,-.204],[0,-.08,-.211],[0,-.161,-.15]],.004);
  const scarf=clothPanel(root,cloth,cloths,{x:-.07,width:.62,length:1.67,spread:.63});
  const scarfTail=clothPanel(root,cloth,cloths,{x:.19,y:1.35,z:.15,width:.25,length:1.12,spread:.3,back:.17});
  // A second dark coat tail separates the legs in silhouette, including from the rear.
  clothPanel(root,leather.clone(),cloths,{x:-.14,y:1.31,z:.13,width:.25,length:1.08,spread:.28,back:.16}).children.forEach(o=>o.material.side=THREE.DoubleSide);
  const variants=Object.fromEntries(['hunter','shade','oracle','pyre','sentinel'].map(id=>[id,new THREE.Group()]));Object.entries(variants).forEach(([id,g])=>{g.name=id;root.add(g);});
  function shoulder(group,s,size=1,material=steel){
    const pivot=new THREE.Group();pivot.position.set(s*.29,1.82,0);pivot.rotation.z=-s*.18;group.add(pivot);
    for(let j=0;j<3;j++){
      const g=new THREE.SphereGeometry(1,20,12,0,Math.PI*2,0,Math.PI*.52);
      const p=mesh(pivot,g,j===0?material:dark,s*j*.022,-j*.055,0,[.155*size,.09,.163]);p.material.side=THREE.DoubleSide;
      line(pivot,trim,[[s*(-.10),.032-j*.055,-.10],[s*.055,-j*.055,-.164],[s*.15,-.018-j*.055,-.05]],.005);
    }
  }
  for(const s of [-1,1])shoulder(variants.hunter,s);
  gem(variants.hunter,glow,-.2,1.91,-.09,.032,.045,.02);
  // Shade: an open-faced fabric hood, low asymmetric shoulder guard and blade sheath.
  const hood=mesh(variants.shade,new THREE.SphereGeometry(1,28,20,0,Math.PI*1.5,0,Math.PI*.85),cloth,0,2.16,.022,[.176,.215,.165]);hood.rotation.y=Math.PI*1.25;
  for(const s of [-1,1])line(variants.shade,trim,[[s*.016,2.36,-.018],[s*.139,2.25,-.109],[s*.145,2.05,-.082]],.004);
  shoulder(variants.shade,-1,.91,dark);shoulder(variants.shade,1,.72,dark);
  bone(variants.shade,leather,[-.22,1.15,.18],[.27,1.98,.18],.042);gem(variants.shade,steel,.3,2.04,.18,.028,.13,.025);
  // Oracle: pale ceremonial plates, thin crown and a crescent frame behind the shoulders.
  for(const s of [-1,1]){
    shoulder(variants.oracle,s,.95,ivory);
    panel(variants.oracle,ivory,[[s*.10,1.26],[s*.22,1.25],[s*.29,.54],[s*.18,.63]],-.15,.025);
    line(variants.oracle,trim,[[s*.14,1.2,-.169],[s*.225,.67,-.169]],.005);
  }
  for(let i=0;i<5;i++){const a=(i-2)*.65,x=Math.sin(a)*.137,z=Math.cos(a)*.12;gem(variants.oracle,trim,x,2.33+(2-Math.abs(i))*.035,z,.018,.13,.024);gem(variants.oracle,glow,x,2.435+(2-Math.abs(i))*.035,z,.013,.024,.017);}
  const crescent=mesh(variants.oracle,new THREE.TorusGeometry(.38,.018,8,56,Math.PI*1.6),trim,0,1.91,.25);crescent.rotation.z=-Math.PI*.3;
  gem(variants.oracle,ice,0,1.72,-.244,.04,.08,.025);
  // Alchemist: functional filters, lens rims, apron and three luminous reagent cylinders.
  for(const s of [-1,1]){
    shoulder(variants.pyre,s,.8,trim);
    bone(variants.pyre,dark,[s*.09,2.09,-.137],[s*.095,2.083,-.192],.041);
    const lens=mesh(variants.pyre,new THREE.TorusGeometry(.038,.008,8,24),trim,s*.064,2.19,-.154);
    ball(variants.pyre,amber,s*.064,2.19,-.157,.029,.024,.008);
  }
  panel(variants.pyre,leather,[[-.15,1.56],[.15,1.56],[.18,.77],[0,.70],[-.18,.77]],-.189,.018);
  line(variants.pyre,trim,[[-.14,1.55,-.208],[-.17,.79,-.208],[0,.73,-.208],[.17,.79,-.208],[.14,1.55,-.208]],.004);
  box(variants.pyre,dark,0,1.63,.25,.37,.47,.18);
  for(const x of [-.135,0,.135]){bone(variants.pyre,amber,[x,1.49,.36],[x,1.98,.36],.048);for(const y of [1.48,1.73,1.99])bone(variants.pyre,trim,[x,y-.019,.36],[x,y+.019,.36],.056);}
  line(variants.pyre,trim,[[.19,1.83,.29],[.31,1.72,.22],[.32,1.39,.06],[.21,1.28,-.16]],.014);
  // Frost guard: heavier articulated armor and a faceted shield fixed to the forearm.
  for(const s of [-1,1]){shoulder(variants.sentinel,s,1.22,ivory);gem(variants.sentinel,ice,s*.34,1.99,0,.037,.075,.054);}
  const shield=new THREE.Group();shield.position.set(-.46,1.48,-.13);shield.rotation.y=-.42;variants.sentinel.add(shield);
  panel(shield,steel,[[-.16,.25],[.16,.25],[.18,-.08],[0,-.3],[-.18,-.08]],-.04,.055);
  panel(shield,dark,[[-.128,.218],[.128,.218],[.143,-.065],[0,-.256],[-.143,-.065]],-.055,.017);
  gem(shield,ice,0,0,-.081,.065,.17,.042);line(shield,trim,[[0,.235,-.08],[0,.14,-.085]],.008);
  const pistolParts=[],shotgunParts=[],crossbowParts=[];
  function weapon(parts,x,y,z){const g=new THREE.Group();g.position.set(x,y,z);root.add(g);parts.push(g);return g;}
  for(const s of [-1,1]){
    const g=weapon(pistolParts,s*.355,1.416,-.353);
    const grip=box(g,leather,0,-.045,.013,.044,.116,.048);grip.rotation.x=-.17;
    box(g,dark,0,.042,-.077,.062,.068,.22);box(g,steel,0,.07,-.08,.059,.015,.22);
    bone(g,steel,[0,.033,-.14],[0,.033,-.32],.021);bone(g,trim,[0,.033,-.30],[0,.033,-.325],.028);
    bone(g,rubber,[0,.033,-.326],[0,.033,-.328],.016);
    line(g,trim,[[0,-.06,.002],[0,-.063,-.081],[0,.007,-.105]],.005);
    box(g,trim,0,.088,-.17,.012,.017,.027);gem(g,glow,0,.045,-.11,.008,.012,.035);
  }
  const shotgun=weapon(shotgunParts,.355,1.446,-.35);
  box(shotgun,leather,0,-.06,.015,.055,.12,.055);box(shotgun,dark,0,.006,-.06,.10,.07,.22);
  for(const x of [-.027,.027]){bone(shotgun,steel,[x,.016,-.13],[x,.016,-.58],.025);bone(shotgun,rubber,[x,.016,-.581],[x,.016,-.584],.018);}
  box(shotgun,trim,0,-.025,-.23,.086,.06,.17);
  const crossbow=weapon(crossbowParts,.355,1.446,-.35);
  box(crossbow,leather,0,-.045,.01,.05,.11,.06);box(crossbow,dark,0,.015,-.21,.045,.06,.53);
  line(crossbow,trim,[[-.29,.015,-.27],[-.19,.015,-.39],[0,.015,-.43],[.19,.015,-.39],[.29,.015,-.27]],.018);
  line(crossbow,ivory,[[-.29,.015,-.27],[0,.015,-.035],[.29,.015,-.27]],.003);
  bone(crossbow,steel,[0,.057,-.08],[0,.057,-.53],.007);gem(crossbow,glow,0,.057,-.53,.019,.015,.045);
  const ring=mesh(root,new THREE.RingGeometry(.54,.56,64),new THREE.MeshBasicMaterial({color:0xff5570,transparent:true,opacity:.32,side:THREE.DoubleSide}),0,.017);ring.rotation.x=-Math.PI/2;
  root.userData={legs,scarf,scarfTail,cloths,pistolParts,shotgunParts,crossbowParts,ring,variants,cloth,glow,trim};
  dressHunter(root,{hunter:'hunter',weapon:'pistols'});return root;
}
export const roleColors={hunter:0xba2546,shade:0x7950bd,oracle:0x258f92,pyre:0xdd6b29,sentinel:0x429bbf};
export function dressHunter(hunter,loadout,dye){
  const d=hunter.userData,role=Object.hasOwn(roleColors,loadout.hunter)?loadout.hunter:'hunter',color=dye??roleColors[role];
  d.pistolParts.forEach(m=>m.visible=loadout.weapon==='pistols');d.shotgunParts.forEach(m=>m.visible=loadout.weapon==='shotgun');d.crossbowParts.forEach(m=>m.visible=loadout.weapon==='crossbow');
  Object.entries(d.variants).forEach(([id,g])=>g.visible=id===role);d.cloth.color.setHex(color);d.glow.emissive.setHex(color);d.ring.material.color.setHex(color);d.role=role;d.dye=color;
}
export function animateHunter(hunter,time,amount=1){
  for(const m of hunter.userData.cloths){const p=m.geometry.attributes.position,rest=m.userData.rest;for(let i=0;i<p.count;i++){const v=Math.max(0,-rest[i*3+1]);p.setZ(i,rest[i*3+2]+Math.sin(time*2.4+rest[i*3]*4+v*2)*.035*v*amount);}p.needsUpdate=true;m.geometry.computeVertexNormals();}
}
