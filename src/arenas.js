import * as THREE from '../vendor/three.module.js';
import { buildArena,box,cone,orb,mat } from './models.js';
import { mapId } from './world-content.js';
export function makeArena(scene,id){
  if(mapId(id)==='graveyard')return {...buildArena(scene),hazards:[]};
  const group=new THREE.Group();scene.add(group);const obstacles=[],flames=[],hazards=[];
  const foundry=id==='foundry',texture=new THREE.TextureLoader().load(foundry?'/assets/forged-metal-v05.png':'/assets/slate.png');
  texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(10,10);texture.anisotropy=4;
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(78,78),new THREE.MeshStandardMaterial({map:texture,color:foundry?0xaa8a74:0xb6e2ed,bumpMap:texture,bumpScale:.08,metalness:foundry?.55:.25,roughness:foundry?.55:.48}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;group.add(floor);
  const stone=new THREE.MeshStandardMaterial({color:foundry?0x62606a:0x7db2c7,map:texture,bumpMap:texture,bumpScale:.06,metalness:foundry?.6:.35,roughness:.5}),trim=mat(foundry?0xa07945:0x9fbacf),glow=mat(foundry?0xff763b:0x71d5ff,foundry?0xff4b13:0x368faf,1.3);
  function pipe(points,r,material){const m=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),20,r,8,false),material);m.castShadow=true;group.add(m);return m;}
  // Inlaid floor seams provide scale without adding invisible collision walls.
  const seams=mat(foundry?0x25212a:0x1b3442);
  for(let n=-28;n<=28;n+=4){box(group,n,.008,0,.025,.012,56,seams);box(group,0,.009,n,56,.012,.025,seams);}
  const crystalSurface=new THREE.MeshPhysicalMaterial({color:0x5ba8c2,emissive:0x123447,emissiveIntensity:.55,metalness:.35,roughness:.23,clearcoat:.8,flatShading:true});
  function column(x,z,r=1,h=3){
    cone(group,x,h/2,z,r*.7,r,h,foundry?stone:crystalSurface,foundry?12:6);cone(group,x,.15,z,r*1.2,r*1.25,.3,trim);obstacles.push({x,z,r:r*1.05});
    if(foundry){const fire=orb(group,x,h+.15,z,.28,glow);flames.push(fire);}else{const crystal=cone(group,x,h+.55,z,0,r*.72,1.6,glow,5);crystal.rotation.z=.15;}
  }
  for(let n=-28;n<=28;n+=7)for(const s of [-1,1]){column(n,s*29,.65,2.8);if(Math.abs(n)<28)column(s*29,n,.65,2.8);}
  if(foundry){
    for(const x of [-18,0,18])for(const z of [-9,9]){column(x,z,1.4,3.1);box(group,x,1.2,z,2.5,2.4,2.5,stone);box(group,x,1.3,z-1.27,1.4,1.3,.05,glow);
      for(const side of [-1,1]){
        box(group,x,1.3,z+side*1.27,1.4,1.3,.055,glow);
        for(let k=-2;k<=2;k++)box(group,x+k*.26,1.3,z+side*1.32,.065,1.42,.1,trim);
        for(const y of [.45,2.1,2.9])cone(group,x,y,z,1.02,1.02,.1,trim,16);
        pipe([[x+side*.85,2.7,z],[x+side*1.3,2.6,z],[x+side*1.32,.6,z]],.12,trim);
      }
      cone(group,x,3.6,z,.65,.82,1.25,stone,16);cone(group,x,4.25,z,.84,.84,.12,trim,16);cone(group,x,4.32,z,.65,.65,.04,glow,16);
      const gear=new THREE.Mesh(new THREE.TorusGeometry(.75,.065,6,24),trim);gear.rotation.x=-Math.PI/2;gear.position.set(x,2.73,z);group.add(gear);
    }
    for(const x of [-8,8])for(const [z,height] of [[-22.25,7.5],[-8,11],[8,11],[22.25,7.5]]){
      const material=new THREE.MeshBasicMaterial({color:0xff7430,transparent:true,opacity:.2});const lava=new THREE.Mesh(new THREE.PlaneGeometry(2.6,height),material);lava.rotation.x=-Math.PI/2;lava.position.set(x,.035,z);group.add(lava);hazards.push(lava);
      const bed=new THREE.Mesh(new THREE.PlaneGeometry(2.6,height),new THREE.MeshStandardMaterial({color:0x5c271b,emissive:0xc33b11,emissiveIntensity:.6,roughness:.4,metalness:.3}));bed.rotation.x=-Math.PI/2;bed.position.set(x,.018,z);group.add(bed);
      for(let j=0;j<3;j++){const zz=z+(j-1)*height*.27;pipe([[x-.8,.055,zz-.5],[x-.32,.058,zz],[x+.2,.05,zz-.28],[x+.85,.055,zz+.5]],.025,glow);}

      for(const s of [-1,1])box(group,x+s*1.47,.12,z,.16,.24,height,trim);
    }
    for(const x of [-8,8])for(const z of [-16,0,16]){box(group,x,.075,z,3.1,.15,5,stone);for(let k=-6;k<=6;k++)box(group,x,.16,z+k*.34,3,.035,.065,trim);}
  }else{
    // Frozen ribs and angled fragments give crystal sites a layered silhouette.
    for(const x of [-24,24])for(const z of [-21,-7,7,21]){
      pipe([[x,.05,z-2],[x*.96,.25,z-1],[x*.94,.4,z],[x*.96,.25,z+1],[x,.05,z+2]],.1,trim);
    }
    for(const [x,z]of [[-6,-7],[6,7],[-18,0],[18,0],[-4,19],[4,-19],[-19,-19],[19,19]]){column(x,z,1.2,3.6);column(x+1.6,z+.8,.48,1.7);for(let i=0;i<3;i++){const a=i*2.1;const shard=cone(group,x+Math.cos(a)*.9,.75,z+Math.sin(a)*.9,0,.26,1.6,glow,5);shard.rotation.z=Math.cos(a)*.25;}}
    for(const [x,z]of [[-11,-10],[11,10],[-11,12],[12,-12]]){
      const ice=new THREE.Mesh(new THREE.CircleGeometry(4,64),new THREE.MeshBasicMaterial({color:0x65d5ed,transparent:true,opacity:.1,depthWrite:false}));ice.rotation.x=-Math.PI/2;ice.position.set(x,.03,z);group.add(ice);hazards.push(ice);
      const outline=new THREE.Mesh(new THREE.RingGeometry(3.95,4,64),new THREE.MeshBasicMaterial({color:0x9aeeff,transparent:true,opacity:.5}));outline.rotation.x=-Math.PI/2;outline.position.set(x,.04,z);group.add(outline);
    }
  }
  return {group,obstacles,flames,hazards};
}
