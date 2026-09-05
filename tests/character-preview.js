import * as T from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.toneMapping=T.ACESFilmicToneMapping;document.body.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x111720);scene.add(new T.HemisphereLight(0xb3cfed,0x38302a,2));
for(const [x,y,z,c,p] of [[-3,4,4,0xffdbb5,3],[3,3,-2,0x779fff,4]]){const l=new T.DirectionalLight(c,p);l.position.set(x,y,z);scene.add(l);}
const camera=new T.PerspectiveCamera(32,innerWidth/innerHeight,.1,20);camera.position.set(2,1.7,4);camera.lookAt(0,1,0);
const loader=new GLTFLoader();
try{
 const [outfit,base,motions]=await Promise.all([loader.loadAsync('/assets/characters/Male_Ranger.gltf'),loader.loadAsync('/assets/characters/Superhero_Male_FullBody.gltf'),fetch('/assets/characters/motions.json').then(r=>r.json())]);
 const root=outfit.scene;scene.add(root);base.scene.updateMatrixWorld(true);root.updateMatrixWorld(true);
 const inverse=base.scene.getObjectByName('Head').matrixWorld.clone().invert(),head=root.getObjectByName('Head');
 base.scene.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.clone();if(o.name==='SuperHero_Male'){const p=g.attributes.position,indices=[];for(let i=0;i<g.index.count;i+=3){const a=g.index.getX(i),b=g.index.getX(i+1),c=g.index.getX(i+2);if(Math.min(p.getY(a),p.getY(b),p.getY(c))>1.545)indices.push(a,b,c);}g.setIndex(indices);}
 g.applyMatrix4(inverse);const material=o.material.clone();material.metalness=0;material.roughness=.8;const mesh=new T.Mesh(g,material);head.add(mesh);});
 const mixer=new T.AnimationMixer(root),clips=motions.map(c=>T.AnimationClip.parse(c)),names=['Idle_Loop','Pistol_Idle_Loop','Jog_Fwd_Loop'];let pose=0,turn=false;
 function play(){mixer.stopAllAction();mixer.clipAction(clips.find(c=>c.name===names[pose])).play();}play();
 document.querySelector('#rotate').onclick=()=>turn=!turn;document.querySelector('#pose').onclick=()=>{pose=(pose+1)%names.length;play();};
 document.querySelector('#info').textContent='Quaternius 遊俠服裝 + 人體頭部\n'+root.children.length+' 組 / 真正蒙皮模型';
 const clock=new T.Clock();renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),.05);mixer.update(dt);if(turn)root.rotation.y+=dt*.65;renderer.render(scene,camera);});
}catch(e){document.querySelector('#info').textContent=e.stack;console.error(e);}

