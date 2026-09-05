import * as THREE from '../vendor/three.module.js';

const materials = new Map(), geometries = new Map();
export function mat(color, glow = 0, intensity = 0) {
  const key = `${color}-${glow}-${intensity}`;
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: .82, metalness: .12, flatShading: true, emissive: glow, emissiveIntensity: intensity }));
  return materials.get(key);
}
function geo(key, build) { if (!geometries.has(key)) geometries.set(key, build()); return geometries.get(key); }
export function box(group, x, y, z, w, h, d, material) {
  const m = new THREE.Mesh(geo(`box${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), material);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; group.add(m); return m;
}
export function cone(group, x, y, z, r1, r2, height, material, sides = 8) {
  const m = new THREE.Mesh(geo(`cone${r1},${r2},${height},${sides}`, () => new THREE.CylinderGeometry(r1, r2, height, sides)), material);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; group.add(m); return m;
}
export function orb(group, x, y, z, radius, material) {
  const m = new THREE.Mesh(geo(`orb${radius}`, () => new THREE.IcosahedronGeometry(radius, 1)), material);
  m.position.set(x, y, z); m.castShadow = true; group.add(m); return m;
}
export function createHunter() {
  const g = new THREE.Group();
  const coat = mat(0x172330), boot = mat(0x10151c), silver = mat(0xc7ccca), red = mat(0x9f233e), skin = mat(0xc2aa98), gun = mat(0x8a9096);
  const legs = [box(g, -.18, .35, 0, .21, .64, .24, boot), box(g, .18, .35, 0, .21, .64, .24, boot)];
  cone(g, 0, .81, .04, .30, .48, .78, coat);
  box(g, 0, 1.28, 0, .61, .64, .34, coat);
  box(g, 0, 1.13, -.19, .05, .65, .02, mat(0x9b8260));
  box(g, 0, 1.02, 0, .63, .08, .37, boot);
  box(g, 0, 1.02, -.21, .12, .09, .05, silver);
  cone(g, 0, 1.57, 0, .20, .31, .16, red);
  orb(g, 0, 1.78, 0, .235, skin);
  const hair = orb(g, 0, 1.9, .01, .24, silver); hair.scale.set(1, .65, 1);
  box(g, 0, 1.73, -.206, .35, .065, .05, boot);
  for (const side of [-1, 1]) {
    orb(g, side * .37, 1.43, -.03, .17, coat);
    const arm = box(g, side * .4, 1.33, -.24, .19, .22, .56, coat); arm.rotation.x = -.08;
    box(g, side * .4, 1.31, -.56, .15, .16, .15, skin);
    box(g, side * .4, 1.39, -.76, .12, .12, .48, gun);
    box(g, side * .4, 1.3, -.64, .10, .24, .12, boot);
  }
  const scarf = box(g, -.12, 1.38, .4, .22, .07, .85, red); scarf.rotation.x = -.35;
  const scarfTail = box(g, -.25, 1.22, .84, .16, .06, .60, red); scarfTail.rotation.y = -.2;
  const ring = new THREE.Mesh(new THREE.RingGeometry(.65, .69, 40), new THREE.MeshBasicMaterial({ color: 0x5be0d1, transparent: true, opacity: .55, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .025; g.add(ring);
  g.userData = { legs, scarf, scarfTail }; return g;
}
export function createEnemy(type) {
  const g = new THREE.Group();
  const boss = type === 'boss', brute = type === 'brute', bat = type === 'bat';
  const cloak = mat(boss ? 0x672638 : brute ? 0x554951 : 0x46304e), skin = mat(0x88898a), dark = mat(0x161b24), eyes = mat(0xff6a65, 0xff352b, 2);
  if (bat) {
    const body = orb(g, 0, .75, 0, .3, cloak); body.scale.set(.75, 1, 1.4);
    orb(g, 0, .91, -.25, .23, dark);
    const wings = [];
    for (const s of [-1, 1]) {
      const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(s * .6, -.35); shape.lineTo(s * 1.2, .25); shape.lineTo(s * .8, .18); shape.lineTo(s * .6, .4); shape.lineTo(s * .3, .2); shape.lineTo(0, .3);
      const wing = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: 0x6f354d, side: THREE.DoubleSide, roughness: 1 }));
      wing.rotation.x = Math.PI / 2; wing.position.y = .8; g.add(wing); wings.push(wing);
      orb(g, s * .1, .98, -.43, .045, eyes);
    }
    g.userData.wings = wings;
  } else {
    const legs = [box(g, -.17, .3, 0, .19, .54, .22, dark), box(g, .17, .3, 0, .19, .54, .22, dark)];
    cone(g, 0, .71, .08, .29, .48, .76, cloak);
    cone(g, 0, 1.19, 0, .42, .27, .65, cloak);
    orb(g, 0, 1.6, -.03, .27, cloak);
    box(g, 0, 1.56, -.239, .31, .27, .1, dark);
    for (const s of [-1, 1]) {
      orb(g, s * .08, 1.6, -.3, .037, eyes);
      const arm = box(g, s * .43, 1.13, -.16, .18, .56, .2, cloak); arm.rotation.x = -.65; arm.rotation.z = s * .3;
      box(g, s * .53, .94, -.39, .18, .18, .25, skin);
      if (brute || boss) cone(g, s * .4, 1.53, .03, 0, .14, .5, mat(0x9b8580), 5);
    }
    g.userData.legs = legs;
    if (boss) {
      for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; cone(g, Math.cos(a) * .21, 1.99, Math.sin(a) * .21, 0, .08, .5, mat(0xc7a875), 4); }
      const aura = new THREE.Mesh(new THREE.RingGeometry(.68, .76, 48), new THREE.MeshBasicMaterial({ color: 0xe84b65, side: THREE.DoubleSide })); aura.rotation.x = -Math.PI / 2; aura.position.y = .04; g.add(aura);
    }
  }
  g.scale.setScalar(boss ? 2.1 : brute ? 1.5 : 1); return g;
}

export function buildArena(scene) {
  const group = new THREE.Group(); scene.add(group);
  const texture = new THREE.TextureLoader().load('/assets/slate.png'); texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(9, 9); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(78, 78), new THREE.MeshStandardMaterial({ map: texture, bumpMap: texture, bumpScale: .1, color: 0xb3bac0, roughness: .94 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; group.add(ground);
  const stone = mat(0x3e4b59), pale = mat(0x53606a), iron = mat(0x1e2b34), gold = mat(0x84704c);
  const stoneDetail=new THREE.TextureLoader().load('/assets/slate.png');
  stone.bumpMap=stoneDetail;stone.bumpScale=.11;stone.needsUpdate=true;pale.bumpMap=stoneDetail;pale.bumpScale=.07;pale.needsUpdate=true;
  const obstacles = [], flames = [];
  let seed = 91; const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  function pillar(x, z, h = 3.6) {
    const p = new THREE.Group(); p.position.set(x, 0, z); group.add(p);
    box(p, 0, .13, 0, 1.5, .26, 1.5, stone); box(p, 0, .38, 0, 1.1, .25, 1.1, pale);
    cone(p, 0, h / 2 + .45, 0, .42, .5, h, stone, 6);
    box(p, 0, h + .45, 0, .95, .22, .95, pale); cone(p, 0, h + .91, 0, 0, .49, .75, stone, 4);
    obstacles.push({ x, z, r: .86 }); return p;
  }
  for (let i = -28; i <= 28; i += 7) {
    for (const s of [-1, 1]) {
      pillar(i, s * 29, 3 + rand());
      if (Math.abs(i) < 28) pillar(s * 29, i, 3 + rand());
    }
  }
  // Fence segments frame the hunting ground without blocking its view.
  for (let i = -28; i < 29; i += 1.1) for (const side of [-1, 1]) {
    box(group, i, 1.05, side * 29, .055, 2.1, .055, iron); cone(group, i, 2.25, side * 29, 0, .11, .3, iron, 4);
    box(group, side * 29, 1.05, i, .055, 2.1, .055, iron);
  }
  for (const side of [-1, 1]) for (const h of [.6, 1.6]) { box(group, 0, h, side * 29, 58, .07, .07, iron); box(group, side * 29, h, 0, .07, .07, 58, iron); }
  for (const x of [-21, 0, 21]) {
    pillar(x - 2.3, -27, 5); pillar(x + 2.3, -27, 5);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x - 2.3, 4.5, -27), new THREE.Vector3(x - 1.8, 6.1, -27), new THREE.Vector3(x, 8, -27), new THREE.Vector3(x + 1.8, 6.1, -27), new THREE.Vector3(x + 2.3, 4.5, -27)]);
    const arch = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, .33, 6, false), stone); arch.castShadow = true; group.add(arch);
  }
  const gravePositions = [[-10,-8],[10,-9],[-14,6],[13,9],[-6,16],[7,-19],[-21,-17],[20,-15],[-22,17],[21,18],[-16,-1],[19,0],[-4,-11],[4,12]];
  for (const [x,z] of gravePositions) {
    const p = new THREE.Group(); p.position.set(x,0,z); p.rotation.y = (rand()-.5)*.6; group.add(p);
    box(p,0,.10,.5,1.25,.20,2.5,stone); box(p,0,.8,-.3,1.0,1.4,.35,pale); cone(p,0,1.6,-.3,.47,.55,.32,pale,4);
    box(p,0,1.07,-.49,.1,.64,.035,gold); box(p,0,1.14,-.49,.43,.08,.035,gold);
    obstacles.push({x,z:z-.3,r:.78});
    for(let j=0;j<3;j++) { const c=box(p,.65+j*.15,.14,.2+j*.24,.085,.27+rand()*.12,.085,mat(0xb4a382)); const f=orb(p,c.position.x,c.position.y+.21,c.position.z,.05,mat(0xffd19a,0xff8532,3)); flames.push(f); }
  }
  for(const [x,z] of [[-8,5],[9,1],[-18,-12],[17,14]]) { const p=pillar(x,z,1.7+rand()); const f=orb(p,0,2.8,0,.17,mat(0xffb65f,0xff6a22,3)); flames.push(f); const light=new THREE.PointLight(0xff9652,7,7,2); light.position.set(x,2.8,z); group.add(light); }
  // Weathered ritual circle, visible through the real stone texture.
  for(const radius of [3.8,4.05,4.5]) { const ring = new THREE.Mesh(new THREE.RingGeometry(radius,radius+.025,96),new THREE.MeshBasicMaterial({color:0x927856,transparent:true,opacity:.27,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.014;group.add(ring); }
  for(let i=0;i<65;i++) { const a=rand()*Math.PI*2,r=24+rand()*7; const m=box(group,Math.cos(a)*r,.12,Math.sin(a)*r,.2+rand()*.5,.2+rand()*.5,.3+rand()*.5,stone);m.rotation.set(rand(),rand(),rand()); }
  return { obstacles, flames };
}
