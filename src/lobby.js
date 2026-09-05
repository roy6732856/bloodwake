import * as THREE from '../vendor/three.module.js';
import { createHunter, dressHunter, animateHunter, roleColors } from './hunter-model.js';
import { hunters } from './content.js';
import { ThemeMusic, themes } from './music.js';

const $=id=>document.getElementById(id);
export const personas={
  hunter:{ en:'THE ASHEN HUNTER', line:'餘燼尚存，銀誓不滅。', ability:'灰燼契約', detail:'每次升級恢復 8 點生命', effect:'銀誓齊射', values:[70,65,55], colors:[['血誓',0xba2546],['古金',0xac7438],['霜銀',0x7896ad]] },
  shade:{ en:'THE VEILED WANDERER', line:'讓黑夜，追不上你的影子。', ability:'緋影步法', detail:'移速 +18% · 暴擊率 +15% · 生命 −20', effect:'緋影殘像', values:[85,95,35], colors:[['紫夜',0x7950bd],['緋紅',0xc5346f],['月白',0x839dab]] },
  pyre:{en:'THE EMBER ALCHEMIST',line:'將餘燼，煉成下一場風暴。',ability:'熔火鍊成',detail:'銀彈灼燒 · 新星留下焰池 · 生命 −10',effect:'熔火焰池',values:[90,55,80],colors:[['熔金',0xc66b28],['銅綠',0x518e75],['暗紅',0x993646]]},
  sentinel:{en:'THE FROST SENTINEL',line:'寒霜不退，誓約不滅。',ability:'霜衛護盾',detail:'35 點再生護盾 · 新星回盾 · 移速 −10%',effect:'霜衛屏障',values:[60,40,90],colors:[['霜藍',0x5b9abd],['銀白',0x9aa7b6],['暮紫',0x80658b]]},
  oracle:{ en:'THE ECLIPSE ORACLE', line:'聽見月蝕，回應群星。', ability:'月蝕共鳴', detail:'新星冷卻 −35% · 傷害 +35% · 經驗 +15%', effect:'月蝕新星', values:[60,55,95], colors:[['碧月',0x258f92],['紫晶',0x7e62b5],['琥珀',0xc18b38]] },
};
const icon=(name)=>`<svg viewBox="0 0 40 40" aria-hidden="true"><path d="${name==='nova'?'M20 3 24 15 37 20 24 25 20 37 16 25 3 20 16 15ZM20 10V3M30 20H37M20 30V37M10 20H3':name==='dash'?'M6 25 18 13 24 19 35 8M6 32 18 20 24 26 35 15':'M9 31 14 21 29 6 35 12 20 27 9 31ZM14 21 20 27M25 10 31 16'}"/></svg>`;

export class Lobby {
  constructor(game, selection, changed) {
    this.game=game;this.selection=selection;this.changed=changed;this.role=selection.hunter;this.dyes={};this.angle=0;this.dragging=false;this.elapsed=0;this.effectTime=0;this.effectCount=0;
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    try { const stored=JSON.parse(localStorage.getItem('bloodwake.appearance.v1'));for(const id of Object.keys(personas)){if(Number.isInteger(stored?.[id])&&stored[id]>=0&&stored[id]<3)this.dyes[id]=stored[id];} } catch { /* defaults remain usable without storage */ }
    game.cosmetics=this.dyes;
    this.music=new ThemeMusic(game.sound,()=>this.updateMusic());
    this.scene=new THREE.Scene();this.backdrop=new THREE.Scene();
    const background=new THREE.TextureLoader().load('/assets/sanctum-v05.png');background.colorSpace=THREE.SRGBColorSpace;this.backdrop.background=background;
    this.camera=new THREE.PerspectiveCamera(33,1,.1,40);
    this.camera.position.set(2.15,1.95,-4.8);this.camera.lookAt(0,1.05,0);
    this.scene.add(new THREE.HemisphereLight(0xb4d4f4,0x171320,2.1));
    // A captured light studio supplies broad, physically meaningful metal reflections.
    const studio=new THREE.Scene();studio.background=new THREE.Color(0x303944);
    for(const [x,y,z,color] of [[-3,3,-3,0xffe6c9],[4,2,1,0x90c4e5],[0,5,0,0xffffff]]) {
      const panel=new THREE.Mesh(new THREE.PlaneGeometry(3,4),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));panel.position.set(x,y,z);panel.lookAt(0,1,0);studio.add(panel);
    }
    const pmrem=new THREE.PMREMGenerator(game.renderer);this.environment=pmrem.fromScene(studio,.02);this.scene.environment=this.environment.texture;this.scene.environmentIntensity=.75;game.scene.environment=this.environment.texture;game.scene.environmentIntensity=.45;
    pmrem.dispose();studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
    const key=new THREE.DirectionalLight(0xffe1b6,5);key.position.set(-3,5,-4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-3,right:3,top:4,bottom:-2});key.shadow.normalBias=.025;this.scene.add(key);
    const rim=new THREE.DirectionalLight(0x8ebdff,4);rim.position.set(3,3,2);this.scene.add(rim);
    this.accent=new THREE.PointLight(roleColors.hunter,4,7);this.accent.position.set(-1,1,1);this.scene.add(this.accent);
    this.model=createHunter();this.model.position.y=.16;this.scene.add(this.model);
    const stoneTex=new THREE.TextureLoader().load('/assets/slate.png');stoneTex.colorSpace=THREE.SRGBColorSpace;
    const stone=new THREE.MeshStandardMaterial({color:0x64717a,map:stoneTex,bumpMap:stoneTex,bumpScale:.065,roughness:.52,metalness:.25});
    const gold=new THREE.MeshStandardMaterial({color:0xc6a36e,metalness:.8,roughness:.3});
    const pedestal=new THREE.Mesh(new THREE.CylinderGeometry(1.22,1.36,.22,96),stone);pedestal.position.y=.015;pedestal.receiveShadow=true;this.scene.add(pedestal);
    for(const radius of [1.05,1.24]) { const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,.015,8,96),gold);ring.rotation.x=Math.PI/2;ring.position.y=.133;this.scene.add(ring); }
    const runeTex=new THREE.TextureLoader().load('/assets/arcane-ring.png');runeTex.colorSpace=THREE.SRGBColorSpace;
    this.rune=new THREE.Mesh(new THREE.PlaneGeometry(2.40,2.40),new THREE.MeshBasicMaterial({map:runeTex,color:roleColors.hunter,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending}));this.rune.rotation.x=-Math.PI/2;this.rune.position.y=.143;this.scene.add(this.rune);
    this.halo=new THREE.Group();this.halo.position.set(0,1.34,.65);this.scene.add(this.halo);
    this.haloMaterial=new THREE.MeshBasicMaterial({color:roleColors.hunter,transparent:true,opacity:.62});
    for(const r of [.83,.90])this.halo.add(new THREE.Mesh(new THREE.TorusGeometry(r,.009,6,96),this.haloMaterial));
    for(let i=0;i<24;i++){const a=i*Math.PI/12;const tick=new THREE.Mesh(new THREE.OctahedronGeometry(.022),gold);tick.position.set(Math.sin(a)*.865,Math.cos(a)*.865,0);this.halo.add(tick);}
    this.effects=new THREE.Group();this.scene.add(this.effects);
    this.fxGeo=new THREE.SphereGeometry(1,8,6);this.fxMat=new THREE.MeshBasicMaterial({color:0xffce9b,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});
    this.fxParticles=[];
    for(let i=0;i<38;i++){const p=new THREE.Mesh(this.fxGeo,this.fxMat);p.visible=false;this.effects.add(p);this.fxParticles.push(p);}
    this.wave=new THREE.Mesh(new THREE.TorusGeometry(1,.012,6,96),this.fxMat);this.wave.rotation.x=Math.PI/2;this.wave.visible=false;this.effects.add(this.wave);
    const points=new Float32Array(80*3);for(let i=0;i<80;i++){points[i*3]=Math.sin(i*2.4)*2.1;points[i*3+1]=(i*.173)%3;points[i*3+2]=Math.cos(i*2.4)*1.6;}
    this.dust=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(points,3)),new THREE.PointsMaterial({color:0xc8ab7d,size:.018,transparent:true,opacity:.5,depthWrite:false}));this.scene.add(this.dust);
    this.bind();this.select(this.role,false);
  }
  bind() {
    $('hunter-roster').innerHTML=hunters.map((h,i)=>`<button class="hunter-slot" data-lobby-hunter="${h.id}" aria-pressed="false"><img src="/assets/${h.id}-${['pyre','sentinel'].includes(h.id)?'v06':'v05'}.png" alt="${h.name}的概念肖像"><span><small>0${i+1} / ${h.title}</small><strong>${h.name}</strong></span><i></i></button>`).join('');
    document.querySelectorAll('[data-lobby-hunter]').forEach(b=>b.onclick=()=>this.select(b.dataset.lobbyHunter));
    $('preview-effect').onclick=()=>this.preview();
    $('preview-nova').onclick=()=>this.preview('nova');
    const toggleMusic=async()=>{const ok=await this.music.toggle();if(ok===false)$('music-caption').textContent='音訊尚未啟用，請再點一次播放。';};
    $('music-toggle').onclick=toggleMusic;
    const combatMusic=document.createElement('button');combatMusic.id='combat-music';combatMusic.setAttribute('aria-label','播放主題音樂');combatMusic.innerHTML='♫ <span>音樂 關</span>';$('sound').after(combatMusic);combatMusic.onclick=toggleMusic;
    $('music-volume').oninput=e=>this.music.setVolume(Number(e.target.value)/100);
    $('rotate-left').onclick=()=>{this.angle-=.55;};$('rotate-right').onclick=()=>{this.angle+=.55;};
    const stage=$('lobby-stage');let pointer=null,last=0;
    stage.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;pointer=e.pointerId;last=e.clientX;this.dragging=true;stage.setPointerCapture(pointer);});
    stage.addEventListener('pointermove',e=>{if(e.pointerId===pointer){this.angle+=(e.clientX-last)*.012;last=e.clientX;}});
    const release=()=>{pointer=null;this.dragging=false;};stage.addEventListener('pointerup',release);stage.addEventListener('pointercancel',release);stage.addEventListener('lostpointercapture',release);
    // Geometry is measured only when layout changes, not every animation frame.
    this.observer=new ResizeObserver(()=>this.measure());this.observer.observe(stage);window.addEventListener('resize',()=>this.measure());$('menu').addEventListener('scroll',()=>this.measure(),{passive:true});this.measure();
  }
  measure(){this.rect=$('lobby-stage').getBoundingClientRect();}
  getDye(id){return personas[id]?.colors[this.dyes[id]||0][1];}
  select(id,notify=true) {
    if(!personas[id])return;this.role=id;this.selection.hunter=id;this.angle=0;this.effectTime=0;
    const p=personas[id],h=hunters.find(h=>h.id===id);
    $('menu').dataset.hunter=id;$('hero-name').textContent=h.name;$('hero-english').textContent=p.en;$('hero-lore').textContent=p.line;
    $('trait-name').textContent=p.ability;$('trait-detail').textContent=p.detail;
    $('preview-effect').innerHTML=`${icon(id==='shade'?'dash':id==='oracle'?'nova':'gun')}<span>${p.effect}<small>點擊在祭壇試映</small></span><b>▷</b>`;
    $('hero-stats').innerHTML=['火力','機動','法術'].map((n,i)=>`<div><span>${n}</span><i><b style="width:${p.values[i]}%"></b></i></div>`).join('');
    document.querySelectorAll('[data-lobby-hunter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lobbyHunter===id)));
    $('dye-options').innerHTML=p.colors.map(([name,color],i)=>`<button data-dye="${i}" aria-label="${name}配色" title="${name}" style="--swatch:#${color.toString(16).padStart(6,'0')}"><i></i></button>`).join('');
    document.querySelectorAll('[data-dye]').forEach(b=>b.onclick=()=>{this.dyes[id]=Number(b.dataset.dye);this.applyDye();try{localStorage.setItem('bloodwake.appearance.v1',JSON.stringify(this.dyes));}catch{/* session appearance still works */}});
    this.applyDye();this.music.select(id);this.updateMusic();if(notify)this.changed();
  }
  applyDye() {
    const index=this.dyes[this.role]||0,[name,color]=personas[this.role].colors[index];
    this.color=color;dressHunter(this.model,this.selection,color);this.rune.material.color.setHex(color);this.haloMaterial.color.setHex(color);this.accent.color.setHex(color);this.fxMat.color.setHex(color);
    $('menu').style.setProperty('--role-color',`#${color.toString(16).padStart(6,'0')}`);$('dye-name').textContent=name;
    document.querySelectorAll('[data-dye]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.dye)===index)));
  }
  updateMusic() {
    const t=themes[this.role];$('music-title').textContent=t.name;$('music-caption').textContent=t.subtitle;
    $('music-toggle').setAttribute('aria-pressed',String(this.music.playing));$('music-toggle').setAttribute('aria-label',this.music.playing?'暫停主題音樂':'播放主題音樂');
    $('music-toggle').textContent=this.music.playing?'Ⅱ':'▷';$('music-status').textContent=this.music.playing?'正在播放':'點擊試聽';
    if($('combat-music')){$('combat-music').innerHTML=`♫ <span>音樂 ${this.music.playing?'開':'關'}</span>`;$('combat-music').setAttribute('aria-label',this.music.playing?'暫停主題音樂':'播放主題音樂');}
  }
  preview(kind=this.role) {
    this.effectKind=kind;this.effectTime=2.1;this.effectCount++;this.game.sound.unlock();
    const rect=$('lobby-stage').getBoundingClientRect();if(rect.top<60||rect.bottom>innerHeight)$('lobby-stage').scrollIntoView({block:'center',behavior:this.reduced?'instant':'smooth'});
    if(kind==='nova'||kind==='oracle')this.game.sound.nova();else if(kind==='shade')this.game.sound.dash();else this.game.sound.shoot('pistols');
    $('preview-status').textContent=kind==='nova'?'新星 · 範圍衝擊':personas[this.role].effect+' · 外觀試映';
  }
  render(dt) {
    this.elapsed+=dt;const t=this.elapsed;this.effectTime=Math.max(0,this.effectTime-dt);
    const motion=this.reduced?0:1, progress=1-this.effectTime/2.1;
    this.model.rotation.y=this.angle+(this.dragging?0:Math.sin(t*.23)*.07*motion);
    this.model.position.y=.16+Math.sin(t*1.6)*.009*motion;
    this.model.position.x=this.effectTime&&this.effectKind==='shade'?Math.sin(progress*Math.PI*2)*.55*motion:0;
    animateHunter(this.model,t,motion);this.dust.rotation.y=t*.018*motion;this.halo.rotation.z=Math.sin(t*.15)*.07*motion;
    this.accent.intensity=4+(this.effectTime?Math.sin(progress*Math.PI)*6:0);
    this.wave.visible=this.effectTime>0&&(this.effectKind==='nova'||this.effectKind==='oracle'||this.effectKind==='pyre'||this.effectKind==='sentinel');this.wave.position.y=.24;
    this.wave.scale.setScalar(.15+progress*1.55);this.fxMat.opacity=Math.max(0,Math.sin(progress*Math.PI))*.9;
    this.fxParticles.forEach((p,i)=>{
      p.visible=this.effectTime>0;const a=i*2.399,rad=.4+progress*1.7;
      if(this.effectKind==='hunter') {
        const shot=(progress*3+i*.11)%1;p.position.set(i%2?.45:-.45,1.11-shot*.18,-.55-shot*1.5);p.scale.set(.012,.012,.08);
      }else {
        p.position.set(Math.sin(a)*rad,.25+(i%5)*.17+Math.sin(progress*Math.PI)*.5,Math.cos(a)*rad);
        p.scale.set(.014,.03+(this.effectKind==='shade'?.13:.02),.014);
      }
    });
    if(!this.effectTime)$('preview-status').textContent='拖曳旋轉 · 細看你的獵人';
    const levels=this.music.levels();document.querySelectorAll('#music-meter i').forEach((bar,i)=>bar.style.height=`${levels?Math.max(2,levels[1+i]*.11):2}px`);
    const renderer=this.game.renderer,w=this.game.container.clientWidth,h=this.game.container.clientHeight,r=this.rect;
    renderer.setScissorTest(false);renderer.setViewport(0,0,w,h);renderer.render(this.backdrop,this.camera);
    if(r?.width>0&&r?.height>0) {
      this.camera.aspect=r.width/r.height;const distance=Math.max(1,.96/this.camera.aspect);this.camera.position.set(1.45*distance,1.65+.35*distance,-4.8*distance);this.camera.lookAt(0,1.18,0);this.camera.updateProjectionMatrix();
      renderer.setViewport(r.left,h-r.bottom,r.width,r.height);renderer.setScissor(r.left,h-r.bottom,r.width,r.height);renderer.setScissorTest(true);
      const auto=renderer.autoClear;renderer.autoClear=false;renderer.clearDepth();renderer.render(this.scene,this.camera);renderer.autoClear=auto;
      renderer.setScissorTest(false);renderer.setViewport(0,0,w,h);
    }
  }
}
