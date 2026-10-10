import * as THREE from '../shared/vendor/three.module.js';
import {createRespirationBench,RESPIRATION_BENCH_PLAN} from '../shared/bench/respiration-bench.js';
import {createWideMouthBottle,createBottleStopper} from './models/wide-mouth-bottle.js';
import {createSmallBeaker} from './models/small-beaker.js';
import {createGerminatingSeed,createCookedSeed} from './models/germinating-seed.js';
import {createCandleInLongSpoon} from './models/candle-spoon.js';
import {createReusedMatchbox} from './models/matchbox-reused.js';
import {setupPageControls} from '../shared/page-controls.js';
import {populateStorageCatalog} from '../shared/storage-catalog.js';

const canvas=document.querySelector('#experiment-scene');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.24;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x1b2a31);
const camera=new THREE.OrthographicCamera(-18,18,10,-10,.1,100);
const initialEye=new THREE.Vector3(0,11.8,31),initialFocus=new THREE.Vector3(0,.05,5.9),view={eye:initialEye.clone(),focus:initialFocus.clone(),zoom:1.04};
scene.add(new THREE.HemisphereLight(0xf2f8f6,0x34424b,2.65));
const key=new THREE.DirectionalLight(0xfff1d9,3.4);key.position.set(-8,16,8);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-20,right:20,top:13,bottom:-13,near:.1,far:55});scene.add(key);
const fill=new THREE.DirectionalLight(0xbde9f8,1.75);fill.position.set(8,10,-8);scene.add(fill);
const bench=createRespirationBench(scene),oxygenZone=bench.zones.find(zone=>zone.id==='oxygen'),oxygenPlan=RESPIRATION_BENCH_PLAN.find(zone=>zone.id==='oxygen');
populateStorageCatalog(scene,bench,'oxygen');

const ui={phase:document.querySelector('#scene-phase'),hint:document.querySelector('#scene-hint'),feedback:document.querySelector('#action-feedback'),stepNumber:document.querySelector('#step-number'),groupBadge:document.querySelector('#group-badge'),stepTitle:document.querySelector('#step-title'),instruction:document.querySelector('#step-instruction'),start:document.querySelector('#start-experiment'),day:document.querySelector('#advance-day'),time:document.querySelector('#time-output'),obsA:document.querySelector('#observation-a'),obsB:document.querySelector('#observation-b'),conclusion:document.querySelector('#conclusion'),finish:document.querySelector('#finish-experiment'),detail:document.querySelector('#candle-detail'),detailCanvas:document.querySelector('#candle-detail-canvas'),detailGroup:document.querySelector('#detail-group'),detailTime:document.querySelector('#detail-time'),detailStatus:document.querySelector('#detail-status'),detailProgress:document.querySelector('#detail-progress'),detailAState:document.querySelector('#detail-a-state'),detailBState:document.querySelector('#detail-b-state')};
const detailRenderer=new THREE.WebGLRenderer({canvas:ui.detailCanvas,antialias:true,alpha:true});detailRenderer.setPixelRatio(Math.min(devicePixelRatio,2));detailRenderer.outputColorSpace=THREE.SRGBColorSpace;detailRenderer.toneMapping=THREE.ACESFilmicToneMapping;detailRenderer.toneMappingExposure=1.35;
const detailScene=new THREE.Scene(),detailCamera=new THREE.PerspectiveCamera(25,1,.1,30);detailCamera.position.set(.15,2.05,8.1);detailCamera.lookAt(0,1.55,0);detailScene.add(new THREE.HemisphereLight(0xf6fff9,0x26363d,2.8));const detailKey=new THREE.DirectionalLight(0xffe8c1,3.6);detailKey.position.set(-3,6,5);detailScene.add(detailKey);
function createDetailCandle(x){const candle=createCandleInLongSpoon();candle.position.set(x,-.10,0);candle.scale.setScalar(.94);detailScene.add(candle);candle.userData.setFlameStrength(0);const glass=new THREE.Mesh(new THREE.CylinderGeometry(.88,.88,3.5,64,1,true),new THREE.MeshPhysicalMaterial({color:0xaad7d1,transparent:true,opacity:.10,roughness:.08,metalness:0,transmission:.72,side:THREE.DoubleSide,depthWrite:false}));glass.position.set(x,1.48,0);detailScene.add(glass);return candle}
const detailCandles={A:createDetailCandle(-1.02),B:createDetailCandle(1.02)};
const detailSmokeMaterial=new THREE.MeshBasicMaterial({color:0xf1f5f3,transparent:true,opacity:0,depthWrite:false,depthTest:false});const detailSmoke=Array.from({length:6},(_,index)=>{const puff=new THREE.Mesh(new THREE.SphereGeometry(.055+index*.012,18,12),detailSmokeMaterial.clone());puff.visible=false;puff.renderOrder=190;detailScene.add(puff);return puff});let detailActiveGroup=null,detailSmokeLevel=0;
const steps=[
  {group:'甲组',title:'把萌发种子倒入甲瓶',instruction:'拖动甲组小烧杯到甲瓶口上方。杯口对准后松手，小烧杯将倾斜，种子从瓶口落入。'},
  {group:'乙组',title:'把煮熟种子倒入乙瓶',instruction:'拖动乙组小烧杯到乙瓶口上方，完成相同的倒入操作。'},
  {group:'甲组',title:'密封甲瓶',instruction:'拖动甲瓶塞到甲瓶口，瓶塞与瓶口对齐后会吸附闭合。'},
  {group:'乙组',title:'密封乙瓶',instruction:'拖动乙瓶塞到乙瓶口，完成两组密封。'},
  {group:'两组同步',title:'在温暖处静置一夜',instruction:'两瓶均已密封。点击场景右上角“24小时后”，从中午12点观察至次日中午12点。'},
  {group:'甲组',title:'用燃烧的蜡烛检验甲瓶',instruction:'先打开甲瓶，再打开火柴盒、取火柴、划燃并点燃甲组蜡烛，最后拖动小长匙从瓶口上方向下放入。'},
  {group:'乙组',title:'用燃烧的蜡烛检验乙瓶',instruction:'按照相同顺序打开乙瓶、点燃乙组蜡烛，并从瓶口上方向下放入。'},
  {group:'比较结果',title:'比较甲、乙两瓶现象',instruction:'甲组白烟与乙组火焰保持显示。完成对比和讲解后，点击“结束实验并归位”。'}
];
const state={started:false,busy:false,finished:false,step:0,seeded:{A:false,B:false},sealed:{A:false,B:false},incubated:false,observed:{A:false,B:false},boxOpen:false,matchTaken:false,matchLit:false,targetGroup:null,dayToken:0,actionToken:0};
const items=[],tweens=[],raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),worldPoint=new THREE.Vector3(),dragPlane=new THREE.Plane(),cameraDirection=new THREE.Vector3(),matchHeadWorld=new THREE.Vector3();let drag=null,pourEffect=null,smokeEffect=null;
const invisibleMaterial=()=>new THREE.MeshBasicMaterial({transparent:true,opacity:.001,depthWrite:false,depthTest:false});
const V=(x,y,z)=>new THREE.Vector3(x,y,z);

function createSeedBed(kind){
  const bed=new THREE.Group(),positions=[[0,0]];
  for(let i=0;i<6;i++){const a=i*Math.PI*2/6;positions.push([Math.cos(a)*.34,Math.sin(a)*.34])}
  for(let i=0;i<8;i++){const a=i*Math.PI*2/8+.12;positions.push([Math.cos(a)*.69,Math.sin(a)*.69])}
  for(let i=0;i<12;i++){const a=i*Math.PI*2/12+.05;positions.push([Math.cos(a)*1.02,Math.sin(a)*1.02])}
  const layerGroups=[];
  for(let layer=0;layer<8;layer++){
    const layerGroup=new THREE.Group();layerGroup.visible=false;bed.add(layerGroup);layerGroups.push(layerGroup);
    const angle=layer*.11,cos=Math.cos(angle),sin=Math.sin(angle);
    for(let i=0;i<positions.length;i++){
      const seed=kind==='A'?createGerminatingSeed():createCookedSeed();seed.scale.setScalar(.14);
      const [px,pz]=positions[i],x=px*cos-pz*sin,z=px*sin+pz*cos;
      seed.position.set(x+((layer+i)%3-1)*.018,.30+layer*.16,z+((layer+i*2)%3-1)*.018);seed.rotation.set((layer+i)*.17,i*.23,(layer+i)*.31);layerGroup.add(seed)
    }
  }
  bed.userData={layerGroups,seedCount:216,layers:8,seedsPerLayer:27};return bed
}

function createBeakerContent(kind){
  const content=new THREE.Group();
  for(let layer=0;layer<4;layer++)for(let i=0;i<12;i++){
    const seed=kind==='A'?createGerminatingSeed():createCookedSeed();seed.scale.setScalar(.12);const a=i*Math.PI*2/12+layer*.22,r=.20+(i%3)*.18;seed.position.set(Math.cos(a)*r,.24+layer*.20,Math.sin(a)*r);seed.rotation.set(i*.2,layer*.3,i*.31);content.add(seed)
  }
  return content
}

function createBottleAssembly(kind){
  const root=new THREE.Group(),model=createWideMouthBottle();model.scale.setScalar(.55);root.add(model);const bed=createSeedBed(kind);bed.scale.set(1.12,.70,1.12);model.add(bed);bed.visible=false;
  const hit=new THREE.Mesh(new THREE.BoxGeometry(1.85,3.05,1.85),invisibleMaterial());hit.position.y=1.48;root.add(hit);
  return{root,model,bed,hit,mouth:()=>model.userData.mouthAnchor.getWorldPosition(new THREE.Vector3())}
}
function createBeakerAsset(kind){const root=new THREE.Group(),model=createSmallBeaker();model.scale.setScalar(.50);root.add(model);const content=createBeakerContent(kind);model.add(content);return{root,model,content}}
function createStopperAsset(){const root=new THREE.Group(),model=createBottleStopper();model.scale.setScalar(.55);root.add(model);const hit=new THREE.Mesh(new THREE.CylinderGeometry(.72,.72,.55,24),invisibleMaterial());hit.position.y=.28;root.add(hit);return{root,model,hit}}
function createSpoonAsset(){const root=new THREE.Group(),model=createCandleInLongSpoon();model.scale.setScalar(.50);root.add(model);const hit=new THREE.Mesh(new THREE.BoxGeometry(.65,2.7,.65),invisibleMaterial());hit.position.set(-.23,1.18,0);root.add(hit);model.userData.setFlameStrength(0);return{root,model,hit}}

const bottles={A:createBottleAssembly('A'),B:createBottleAssembly('B')},beakers={A:createBeakerAsset('A'),B:createBeakerAsset('B')},stoppers={A:createStopperAsset(),B:createStopperAsset()},spoons={A:createSpoonAsset(),B:createSpoonAsset()},matchbox=createReusedMatchbox();
const matchRoot=new THREE.Group();matchbox.group.scale.setScalar(1.7);matchRoot.add(matchbox.group);const matchHit=new THREE.Mesh(new THREE.BoxGeometry(1.55,.65,1.05),invisibleMaterial());matchHit.position.y=.26;matchRoot.add(matchHit);const activeMatch=matchbox.parts.activeMatch;
const homes={bottleA:V(-5.15,.03,10.45),beakerA:V(-6.15,.03,12.70),stopperA:V(-4.75,.03,12.70),spoonA:V(-3.20,.03,10.72),matchbox:V(0,.03,11.74),spoonB:V(3.20,.03,10.72),stopperB:V(4.75,.03,12.70),beakerB:V(6.15,.03,12.70),bottleB:V(5.15,.03,10.45)};
const origin=(slotIndex,dx=0,dz=0)=>{const slot=oxygenPlan.slots[slotIndex];return V(oxygenZone.center+slot[2]+dx,.03,slot[3]+dz)};
const origins={bottleA:V(oxygenZone.center-2.10,.03,-1.70),bottleB:V(oxygenZone.center-.45,.03,-1.70),beakerA:V(oxygenZone.center-2.45,.03,.72),beakerB:V(oxygenZone.center-1.15,.03,.72),spoonA:V(oxygenZone.center+.32,.03,-.70),spoonB:V(oxygenZone.center+1.12,.03,-.70),stopperA:V(oxygenZone.center+.20,.03,2.28),stopperB:V(oxygenZone.center+1.14,.03,2.28),matchbox:V(oxygenZone.center+2.43,.03,2.22)};

function register(id,asset,kind,group,scale=1){const root=asset.root??asset.group??asset;root.position.copy(origins[id]);root.scale.setScalar(scale);scene.add(root);const item={id,asset,root,kind,group,home:homes[id].clone(),origin:origins[id].clone(),sealed:false,lit:false};root.traverse(object=>object.userData.dragItem=item);items.push(item);return item}
const itemMap={
  bottleA:register('bottleA',bottles.A,'bottle','A'),bottleB:register('bottleB',bottles.B,'bottle','B'),
  beakerA:register('beakerA',beakers.A,'beaker','A'),beakerB:register('beakerB',beakers.B,'beaker','B'),
  stopperA:register('stopperA',stoppers.A,'stopper','A'),stopperB:register('stopperB',stoppers.B,'stopper','B'),
  spoonA:register('spoonA',spoons.A,'spoon','A'),spoonB:register('spoonB',spoons.B,'spoon','B'),
  matchbox:register('matchbox',{root:matchRoot},'matchbox',null)
};

const marker=new THREE.Mesh(new THREE.RingGeometry(.48,.58,48),new THREE.MeshBasicMaterial({color:0x72e0d7,transparent:true,opacity:.72,side:THREE.DoubleSide,depthWrite:false}));marker.rotation.x=-Math.PI/2;marker.position.y=.055;marker.visible=false;scene.add(marker);
const smokeMaterial=new THREE.MeshBasicMaterial({color:0xcbd6d3,transparent:true,opacity:.34,depthWrite:false});
const smokePuffs=Array.from({length:4},(_,index)=>{const puff=new THREE.Mesh(new THREE.SphereGeometry(.07+index*.018,16,12),smokeMaterial.clone());puff.visible=false;scene.add(puff);return puff});

function setFeedback(text){ui.feedback.textContent=text}
function updateTime(hour){const normalized=((hour%24)+24)%24,whole=Math.floor(normalized),minutes=Math.floor((normalized-whole)*60);ui.time.value=`${String(whole).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`;bench.dayNightWindow.setHour(normalized)}
function currentItem(){return state.step===0?itemMap.beakerA:state.step===1?itemMap.beakerB:state.step===2?itemMap.stopperA:state.step===3?itemMap.stopperB:state.step===5?itemMap.spoonA:state.step===6?itemMap.spoonB:null}
function updateMarker(){const active=currentItem();if(!state.started||state.busy||!active){marker.visible=false;return}marker.visible=true;const p=active.root.getWorldPosition(new THREE.Vector3());marker.position.set(p.x,.055,p.z)}
function updateUI(){
  if(!state.started){ui.stepNumber.textContent='准备';ui.groupBadge.textContent='全部材料';ui.stepTitle.textContent='材料进入操作台';ui.instruction.textContent='材料就位后，由你按照先甲组、后乙组的顺序完成每一步操作。';ui.day.disabled=true}
  else{const step=steps[state.step];ui.stepNumber.textContent=`第 ${state.step+1} 步 / ${steps.length}`;ui.groupBadge.textContent=step.group;ui.stepTitle.textContent=step.title;ui.instruction.textContent=step.instruction;ui.phase.textContent=step.title;ui.hint.textContent=step.instruction;ui.day.disabled=state.step!==4||state.busy}
  document.querySelectorAll('[data-step]').forEach(button=>{const index=Number(button.dataset.step);button.classList.toggle('active',state.started&&index===state.step);button.classList.toggle('done',state.started&&index<state.step)});
  ui.obsA.classList.toggle('complete',state.observed.A);ui.obsA.querySelector('span').textContent=state.observed.A?'火焰逐渐变弱并熄灭':'等待检验';
  ui.obsB.classList.toggle('complete',state.observed.B);ui.obsB.querySelector('span').textContent=state.observed.B?'火焰保持明显燃烧':'等待检验';ui.conclusion.hidden=state.step<7;ui.finish.disabled=state.busy||state.finished;ui.finish.textContent=state.finished?'实验已结束·器材已归位':'结束实验并归位';
  updateMarker()
}

function tween(object,to,duration=520,rotation=null){
  const start=object.position.clone(),startQ=object.quaternion.clone(),endQ=rotation?new THREE.Quaternion().setFromEuler(rotation):startQ.clone(),started=performance.now();
  return new Promise(resolve=>tweens.push({object,start,to:to.clone(),startQ,endQ,started,duration,resolve}))
}
const wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
function returnHome(item,duration=460){return tween(item.root,item.home,duration,new THREE.Euler(0,0,0))}
function showBed(group,visible){bottles[group].bed.visible=visible;bottles[group].bed.userData.layerGroups.forEach(layer=>layer.visible=visible)}
function showBeakerContent(group,visible){beakers[group].content.visible=visible}
function setCandle(group,strength){spoons[group].model.userData.lit=strength>.01;spoons[group].model.userData.setFlameStrength(strength);itemMap[`spoon${group}`].lit=strength>.01;detailCandles[group].userData.setFlameStrength(strength)}
function showCandleDetail(group){detailActiveGroup=group;ui.detail.hidden=false;ui.detailGroup.textContent='现象对照';ui.detailTime.value='0.0 s';ui.detailStatus.textContent=`${group==='A'?'甲':'乙'}组小长匙正从瓶口上方进入`;ui.detailProgress.style.width='0%';detailCandles[group].userData.setFlameStrength(1);if(group==='A')ui.detailAState.textContent='观察中';else ui.detailBState.textContent='观察中'}
function updateCandleDetail(group,progress,strength,status,smoke=0){if(detailActiveGroup!==group)return;ui.detailTime.value=`${(progress*8).toFixed(1)} s`;ui.detailStatus.textContent=`${group==='A'?'甲':'乙'}组：${status}`;ui.detailProgress.style.width=`${Math.round(progress*100)}%`;if(group==='A')detailSmokeLevel=Math.max(detailSmokeLevel,smoke);detailCandles[group].userData.setFlameStrength(strength)}
function preserveDetailResult(group){ui.detail.hidden=false;detailActiveGroup=null;ui.detailTime.value='现象保留';ui.detailProgress.style.width='100%';if(group==='A'){detailSmokeLevel=1;detailCandles.A.userData.setFlameStrength(0);ui.detailAState.textContent='熄灭·持续白烟';ui.detailStatus.textContent='甲组现象已保留，可继续检验乙组'}else{detailCandles.B.userData.setFlameStrength(1);ui.detailBState.textContent='持续明亮燃烧';ui.detailStatus.textContent='甲组持续白烟，乙组持续燃烧，请对比现象'}}
function hideCandleDetail(){ui.detail.hidden=true;detailActiveGroup=null;detailSmokeLevel=0;detailCandles.A.userData.setFlameStrength(0);detailCandles.B.userData.setFlameStrength(0);ui.detailAState.textContent='等待检验';ui.detailBState.textContent='等待检验';detailSmoke.forEach(puff=>puff.visible=false)}
function renderCandleDetail(now){if(ui.detail.hidden)return;const width=Math.max(1,ui.detailCanvas.clientWidth),height=Math.max(1,ui.detailCanvas.clientHeight);if(ui.detailCanvas.width!==Math.round(width*detailRenderer.getPixelRatio())||ui.detailCanvas.height!==Math.round(height*detailRenderer.getPixelRatio())){detailRenderer.setSize(width,height,false);detailCamera.aspect=width/height;detailCamera.updateProjectionMatrix()}detailSmoke.forEach((puff,index)=>{const phase=(now*.00024+index*.145)%1;puff.visible=detailSmokeLevel>.01;puff.position.set(-1.02+Math.sin(phase*7+index)*.07,1.72+phase*.86,.03);puff.scale.setScalar(.78+phase*.92);puff.material.opacity=detailSmokeLevel*(1-phase)*.42});detailRenderer.render(detailScene,detailCamera)}

function attachStopper(group,animate=true,token=null){
  const stopper=itemMap[`stopper${group}`],bottle=itemMap[`bottle${group}`],mouth=bottles[group].mouth();scene.attach(stopper.root);
  const inserted=mouth.clone().add(V(0,-.20,0)),aligned=mouth.clone().add(V(0,1.12,0));
  const finish=()=>{bottle.root.attach(stopper.root);const local=bottle.root.worldToLocal(inserted.clone());stopper.root.position.copy(local);stopper.root.rotation.set(0,0,0);stopper.sealed=true;state.sealed[group]=true};
  if(!animate){stopper.root.position.copy(inserted);finish();return Promise.resolve()}
  return tween(stopper.root,aligned,340,new THREE.Euler()).then(()=>{
    if(token!==null&&token!==state.actionToken)return;
    return tween(stopper.root,inserted,560,new THREE.Euler())
  }).then(()=>{if(token===null||token===state.actionToken)finish()})
}
function detachStopper(group){const stopper=itemMap[`stopper${group}`];scene.attach(stopper.root);stopper.sealed=false;state.sealed[group]=false}

async function pourSeeds(group){
  const token=state.actionToken,beaker=itemMap[`beaker${group}`],mouth=bottles[group].mouth(),side=group==='A'?-1:1,tilt=side<0?-Math.PI*.40:Math.PI*.40;
  state.busy=true;updateUI();setFeedback(`${group==='A'?'甲':'乙'}组小烧杯正在对准瓶口……`);
  const above=mouth.clone().add(V(0,1.42,0)),pourRoot=mouth.clone().add(V(side*.60,.53,0));
  await tween(beaker.root,above,420,new THREE.Euler());if(token!==state.actionToken)return;
  await tween(beaker.root,pourRoot,520,new THREE.Euler(0,0,tilt));if(token!==state.actionToken)return;
  const particles=Array.from({length:22},(_,index)=>{const seed=group==='A'?createGerminatingSeed():createCookedSeed();seed.scale.setScalar(.075);scene.add(seed);return seed});
  pourEffect={group,particles,start:performance.now(),duration:1250,source:mouth.clone().add(V(0,.70,0)),target:mouth.clone().add(V(0,-2.05,0))};
  showBeakerContent(group,false);showBed(group,true);bottles[group].bed.userData.layerGroups.forEach(layer=>layer.visible=false);
  await wait(1300);if(token!==state.actionToken)return;pourEffect=null;particles.forEach(seed=>scene.remove(seed));bottles[group].bed.userData.layerGroups.forEach(layer=>layer.visible=true);state.seeded[group]=true;
  await tween(beaker.root,beaker.home,560,new THREE.Euler());if(token!==state.actionToken)return;state.busy=false;setFeedback(`${group==='A'?'甲':'乙'}组种子已从瓶口倒入并平铺至瓶内约三分之一高度。`);advanceStep()
}

function completeSeal(group){const token=state.actionToken;state.busy=true;updateUI();attachStopper(group,true,token).then(()=>{if(token!==state.actionToken)return;state.busy=false;setFeedback(`${group==='A'?'甲':'乙'}瓶已密封，瓶塞会随瓶体整体移动。`);advanceStep()})}
function advanceStep(){state.step=Math.min(7,state.step+1);if(state.step===7&&state.observed.A&&state.observed.B)setFeedback('甲组白烟与乙组火焰将持续保留；对比结束后请点击“结束实验并归位”。');updateUI()}

async function runDay(){
  if(state.step!==4||state.busy)return;state.busy=true;updateUI();const token=++state.dayToken,started=performance.now(),duration=8000;setFeedback('真实实验需在温暖处放置一夜；网页正在压缩演示24小时变化。');
  await new Promise(resolve=>{const tick=now=>{if(token!==state.dayToken){resolve();return}const p=THREE.MathUtils.clamp((now-started)/duration,0,1);updateTime(12+p*24);if(p<1)requestAnimationFrame(tick);else resolve()};requestAnimationFrame(tick)});
  if(token!==state.dayToken)return;updateTime(12);state.incubated=true;state.busy=false;setFeedback('已到次日中午12:00。甲瓶中的萌发种子已呼吸一夜，现在开始检验。');advanceStep()
}

function openStopper(group){
  const stopper=itemMap[`stopper${group}`];if(!stopper.sealed)return;detachStopper(group);state.busy=true;updateUI();returnHome(stopper,480).then(()=>{state.busy=false;setFeedback(`${group==='A'?'甲':'乙'}瓶已打开。现在用火柴点燃对应的小长匙蜡烛。`);updateUI()})
}
function openMatchbox(){state.boxOpen=true;matchbox.parts.tray.position.x=.56;setFeedback('火柴盒已打开。再次点击盒内火柴将其取出。')}
function takeMatch(){state.matchTaken=true;scene.attach(activeMatch);scene.attach(matchbox.parts.flame);activeMatch.visible=true;activeMatch.position.copy(itemMap.matchbox.home).add(V(-.65,.45,.05));activeMatch.rotation.set(0,0,Math.PI/2);matchbox.parts.flame.userData.setStrength(0);syncMatchFlame();setFeedback('已取出火柴。用火柴头轻轻划过火柴盒侧面即可点燃。')}
function strikeWorld(){return matchbox.group.localToWorld(V(.1,.18,.236))}
function targetWick(){const group=state.step===5?'A':state.step===6?'B':null;return group?spoons[group].model.localToWorld(V(0,1.74,0)):null}
function igniteMatch(){state.matchLit=true;matchbox.parts.flame.userData.setStrength(1);setFeedback('火柴已点燃。拖动燃烧的火柴靠近当前组蜡烛芯。')}
function igniteCandle(group){setCandle(group,1);state.matchLit=false;state.matchTaken=false;activeMatch.visible=false;matchbox.parts.flame.userData.setStrength(0);matchbox.parts.tray.position.x=0;state.boxOpen=false;setFeedback(`${group==='A'?'甲':'乙'}组蜡烛已点燃。拖动小长匙手柄，使匙碗从瓶口正上方向下进入。`);updateUI()}

async function insertSpoon(group){
  const token=state.actionToken,item=itemMap[`spoon${group}`],bottle=itemMap[`bottle${group}`],mouth=bottles[group].mouth();state.busy=true;updateUI();
  showCandleDetail(group);const above=mouth.clone().add(V(0,.40,0));await tween(item.root,above,350,new THREE.Euler());if(token!==state.actionToken)return;
  const seedTop=bottle.root.position.y+1.52*.55;await tween(item.root,V(bottle.root.position.x,seedTop,bottle.root.position.z),800,new THREE.Euler());if(token!==state.actionToken)return;
  const observationDuration=8000,started=performance.now();
  if(group==='A'){
    setFeedback('甲瓶内氧气较少，请观察 8 秒火焰细节变化……');
    await new Promise(resolve=>{const observe=now=>{if(token!==state.actionToken){resolve();return}const p=THREE.MathUtils.clamp((now-started)/observationDuration,0,1),envelope=p<.14?1:p<.78?1-(p-.14)/.64*.72:Math.max(0,.28-(p-.78)/.22*.28),flicker=(Math.sin(now*.021)+Math.sin(now*.047)*.55)*(.035+.09*p),strength=THREE.MathUtils.clamp(envelope+flicker,0,1),smoke=THREE.MathUtils.smoothstep(p,.78,1);setCandle('A',strength);updateCandleDetail('A',p,strength,p<.25?'火焰开始缩小':p<.74?'火焰明暗不稳、持续变弱':p<.95?'仅剩微弱火芯':'火焰熄灭，出现少量烟气',smoke);if(p<1)requestAnimationFrame(observe);else resolve()};requestAnimationFrame(observe)});if(token!==state.actionToken)return;setCandle('A',0);startSmoke(spoons.A.model.localToWorld(V(0,1.78,0)),true);updateCandleDetail('A',1,0,'火焰已熄灭，烛芯持续冒出白烟',1);state.observed.A=true;setFeedback('甲瓶内火焰已熄灭并持续冒出白烟。现象将保留，请继续检验乙瓶。')
  }else{
    setFeedback('乙瓶内火焰保持明显燃烧，请观察 8 秒稳定性……');
    await new Promise(resolve=>{const observe=now=>{if(token!==state.actionToken){resolve();return}const p=THREE.MathUtils.clamp((now-started)/observationDuration,0,1),strength=.94+Math.sin(now*.017)*.04+Math.sin(now*.039)*.02;setCandle('B',strength);updateCandleDetail('B',p,strength,'火焰保持明亮，大小基本稳定',0);if(p<1)requestAnimationFrame(observe);else resolve()};requestAnimationFrame(observe)});if(token!==state.actionToken)return;setCandle('B',1);state.observed.B=true;setFeedback('乙瓶内火焰保持燃烧。甲乙现象都将保留，请完成对比后点击“结束实验并归位”。')
  }
  preserveDetailResult(group);state.busy=false;advanceStep()
}
function startSmoke(position,persistent=false){smokeEffect={start:performance.now(),duration:1800,position:position.clone(),persistent};smokePuffs.forEach((puff,index)=>{puff.visible=true;puff.position.copy(position).add(V((index-1.5)*.03,index*.05,0));puff.material.opacity=.36})}
function positionSpoonInBottle(group){const item=itemMap[`spoon${group}`],bottle=itemMap[`bottle${group}`],seedTop=bottle.root.position.y+1.52*.55;scene.attach(item.root);item.root.position.set(bottle.root.position.x,seedTop,bottle.root.position.z);item.root.rotation.set(0,0,0)}
async function finishExperiment(){
  if(state.step!==7||state.busy||state.finished)return;const token=state.actionToken;state.busy=true;setFeedback('正在结束实验：甲乙两组小长匙同步归位……');updateUI();smokeEffect=null;smokePuffs.forEach(puff=>puff.visible=false);setCandle('A',0);setCandle('B',0);
  await Promise.all([returnHome(itemMap.spoonA,760),returnHome(itemMap.spoonB,760)]);if(token!==state.actionToken)return;hideCandleDetail();resetObjects(false);state.started=true;state.step=7;state.finished=true;state.busy=false;localStorage.setItem('respiration-experiment-1',JSON.stringify({started:true,step:7,finished:true}));ui.start.hidden=true;setFeedback('实验一已完成，全部器材已归回后方材料台。');updateUI()
}

function syncMatchFlame(){matchbox.parts.head.getWorldPosition(matchHeadWorld);matchbox.parts.flame.position.copy(matchHeadWorld).add(V(0,.065,0));matchbox.parts.flame.quaternion.identity()}
function resetMatch(){state.boxOpen=state.matchTaken=state.matchLit=false;matchbox.parts.tray.position.x=0;scene.attach(activeMatch);scene.attach(matchbox.parts.flame);activeMatch.position.set(0,0,0);activeMatch.rotation.set(0,0,0);activeMatch.visible=false;matchbox.parts.flame.position.set(0,0,0);matchbox.parts.flame.quaternion.identity();matchbox.parts.flame.userData.setStrength(0)}
function resetObjects(atOperation=false){
  state.dayToken++;state.actionToken++;tweens.splice(0).forEach(tween=>tween.resolve());if(pourEffect)pourEffect.particles.forEach(seed=>scene.remove(seed));pourEffect=null;smokeEffect=null;smokePuffs.forEach(puff=>puff.visible=false);hideCandleDetail();resetMatch();
  for(const group of ['A','B']){const stopper=itemMap[`stopper${group}`];if(stopper.root.parent!==scene)scene.attach(stopper.root);stopper.sealed=false;setCandle(group,0);showBed(group,false);showBeakerContent(group,true)}
  items.forEach(item=>{item.root.position.copy(atOperation?item.home:item.origin);item.root.rotation.set(0,0,0)});updateTime(12)
}
function saveExperimentState(){localStorage.setItem('respiration-experiment-1',JSON.stringify({started:state.started,step:state.step,finished:state.finished}))}
function resetExperiment(){Object.assign(state,{started:false,busy:false,finished:false,step:0,incubated:false,boxOpen:false,matchTaken:false,matchLit:false,targetGroup:null});state.seeded={A:false,B:false};state.sealed={A:false,B:false};state.observed={A:false,B:false};resetObjects(false);localStorage.removeItem('respiration-experiment-1');ui.start.hidden=false;ui.phase.textContent='准备实验';ui.hint.textContent='点击“开始实验”，全部材料将进入前方操作台。';setFeedback('尚未开始');updateUI()}
async function startExperiment(){if(state.started||state.busy)return;const token=state.actionToken;state.busy=true;ui.start.hidden=true;setFeedback('实验一材料正在进入前方操作台……');await Promise.all(items.map((item,index)=>tween(item.root,item.home,650+index*45,new THREE.Euler())));if(token!==state.actionToken)return;state.started=true;state.busy=false;setFeedback('材料已全部就位。请先完成甲组装种。');updateUI()}

function applySnapshot(step){
  state.started=true;state.busy=false;state.finished=false;state.step=THREE.MathUtils.clamp(step,0,7);state.seeded={A:false,B:false};state.sealed={A:false,B:false};state.observed={A:false,B:false};state.incubated=false;resetObjects(true);ui.start.hidden=true;
  if(step>=1){state.seeded.A=true;showBed('A',true);showBeakerContent('A',false)}
  if(step>=2){state.seeded.B=true;showBed('B',true);showBeakerContent('B',false)}
  if(step>=3)attachStopper('A',false);
  if(step>=4)attachStopper('B',false);
  if(step>=5)state.incubated=true;
  if(step>=6){detachStopper('A');itemMap.stopperA.root.position.copy(itemMap.stopperA.home);state.observed.A=true;positionSpoonInBottle('A');setCandle('A',0);startSmoke(spoons.A.model.localToWorld(V(0,1.78,0)),true);showCandleDetail('A');preserveDetailResult('A')}
  if(step>=7){detachStopper('B');itemMap.stopperB.root.position.copy(itemMap.stopperB.home);state.observed.B=true;positionSpoonInBottle('B');setCandle('B',1);showCandleDetail('B');preserveDetailResult('B')}
  setFeedback(`已恢复到第 ${step+1} 步开始前的完整状态。请直接操作当前材料。`);updateUI()
}

function rayFrom(event){const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-((event.clientY-rect.top)/rect.height)*2+1);raycaster.setFromCamera(pointer,camera)}
function screenDistance(event,point){const rect=canvas.getBoundingClientRect(),screen=point.clone().project(camera),x=rect.left+(screen.x+1)*rect.width*.5,y=rect.top+(1-screen.y)*rect.height*.5;return Math.hypot(event.clientX-x,event.clientY-y)}
function beginDrag(event){
  rayFrom(event);const matchHit=state.matchTaken&&activeMatch.visible&&raycaster.intersectObject(activeMatch,true).length>0;
  if(matchHit){camera.getWorldDirection(cameraDirection);dragPlane.setFromNormalAndCoplanarPoint(cameraDirection,activeMatch.getWorldPosition(new THREE.Vector3()));raycaster.ray.intersectPlane(dragPlane,worldPoint);drag={id:event.pointerId,type:'active-match',object:activeMatch,offset:activeMatch.position.clone().sub(worldPoint),startX:event.clientX,startY:event.clientY,moved:false};canvas.setPointerCapture(event.pointerId);return}
  const hits=raycaster.intersectObjects(items.map(item=>item.root),true);const hit=hits.find(result=>result.object.userData.dragItem);if(hit){const item=hit.object.userData.dragItem;if(!state.started||state.busy){setFeedback(state.busy?'当前动作正在完成，请稍候。':'请先点击“开始实验”。');return}if(item.kind==='stopper'&&item.sealed){const mayOpen=(state.step===5&&item.group==='A')||(state.step===6&&item.group==='B');if(!mayOpen){setFeedback('当前瓶塞需要保持密封，已与瓶体组成整体。');return}detachStopper(item.group)}camera.getWorldDirection(cameraDirection);dragPlane.setFromNormalAndCoplanarPoint(cameraDirection,item.root.getWorldPosition(new THREE.Vector3()));raycaster.ray.intersectPlane(dragPlane,worldPoint);drag={id:event.pointerId,type:'item',item,offset:item.root.position.clone().sub(worldPoint),startX:event.clientX,startY:event.clientY,moved:false};canvas.setPointerCapture(event.pointerId);return}
  drag={id:event.pointerId,type:'view',x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY};canvas.setPointerCapture(event.pointerId)
}
function moveDrag(event){
  if(!drag||drag.id!==event.pointerId)return;
  if(drag.type==='view'){const scale=(camera.right-camera.left)/canvas.clientWidth/camera.zoom,dx=(event.clientX-drag.x)*scale,dz=(event.clientY-drag.y)*scale;view.eye.x-=dx;view.focus.x-=dx;view.eye.z-=dz;view.focus.z-=dz;drag.x=event.clientX;drag.y=event.clientY;updateCamera();return}
  rayFrom(event);if(raycaster.ray.intersectPlane(dragPlane,worldPoint)){drag.object?.position.copy(worldPoint).add(drag.offset);drag.item?.root.position.copy(worldPoint).add(drag.offset)}
  if(drag.type==='active-match'){syncMatchFlame();if(!state.matchLit&&screenDistance(event,strikeWorld())<110)igniteMatch()}
  drag.moved||=Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>5
}
async function finishItemDrag(event,item,moved){
  if(item.kind==='matchbox'){
    if(!moved){if(!state.boxOpen)openMatchbox();else if(!state.matchTaken)takeMatch();else setFeedback('火柴已经取出，请拖动火柴头到划火处。')}else await returnHome(item);return
  }
  if(item.kind==='beaker'){
    const expected=state.step===0?'A':state.step===1?'B':null,mouth=expected?bottles[expected].mouth():null;if(expected===item.group&&mouth&&screenDistance(event,mouth)<135){await pourSeeds(item.group);return}setFeedback(expected?`当前应操作${expected==='A'?'甲':'乙'}组小烧杯，并从对应瓶口倒入。`:'当前步骤不需要移动种子烧杯。');await returnHome(item);return
  }
  if(item.kind==='stopper'){
    const sealExpected=state.step===2?'A':state.step===3?'B':null,testExpected=state.step===5?'A':state.step===6?'B':null,mouth=bottles[item.group].mouth();
    if(sealExpected===item.group&&screenDistance(event,mouth)<125){completeSeal(item.group);return}
    if(testExpected===item.group&&!item.sealed){await returnHome(item);setFeedback(`${item.group==='A'?'甲':'乙'}瓶已打开。现在点燃对应蜡烛。`);updateUI();return}
    setFeedback(sealExpected?`请先密封${sealExpected==='A'?'甲':'乙'}瓶。`:'当前步骤不需要移动这个瓶塞。');await returnHome(item);return
  }
  if(item.kind==='spoon'){
    const expected=state.step===5?'A':state.step===6?'B':null,mouth=expected?bottles[expected].mouth():null;
    if(expected===item.group&&item.lit&&!state.sealed[item.group]&&screenDistance(event,mouth)<145){await insertSpoon(item.group);return}
    if(expected===item.group&&!item.lit)setFeedback('蜡烛尚未点燃：请先使用火柴完成点火。');else if(expected===item.group&&state.sealed[item.group])setFeedback('瓶塞尚未打开，不能将小长匙放入。');else setFeedback(expected?`当前应检验${expected==='A'?'甲':'乙'}瓶。`:'当前步骤不需要移动小长匙。');await returnHome(item);return
  }
  await returnHome(item);setFeedback('器材已自动归回固定位置。')
}
async function endDrag(event){if(!drag||drag.id!==event.pointerId)return;const finished=drag;drag=null;if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);if(finished.type==='active-match'){
    const strike=strikeWorld(),wick=targetWick();if(!state.matchLit&&screenDistance(event,strike)<100)igniteMatch();else if(state.matchLit&&wick&&screenDistance(event,wick)<78)igniteCandle(state.step===5?'A':'B');else setFeedback(state.matchLit?'请把燃烧的火柴靠近当前组烛芯。':'请把火柴头拖到火柴盒侧面的划火处。');return
  }if(finished.type==='item')await finishItemDrag(event,finished.item,finished.moved)}

canvas.addEventListener('pointerdown',beginDrag);canvas.addEventListener('pointermove',moveDrag);canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);canvas.addEventListener('lostpointercapture',event=>{if(drag?.id===event.pointerId)drag=null});
canvas.addEventListener('wheel',event=>{event.preventDefault();view.zoom=THREE.MathUtils.clamp(view.zoom*Math.exp(-event.deltaY*.001),.72,2.75);updateCamera()},{passive:false});
ui.start.addEventListener('click',startExperiment);ui.day.addEventListener('click',runDay);ui.finish.addEventListener('click',finishExperiment);document.querySelector('#reset-experiment').addEventListener('click',resetExperiment);document.querySelector('#reset-view').addEventListener('click',()=>{view.eye.copy(initialEye);view.focus.copy(initialFocus);view.zoom=1.04;updateCamera()});
document.querySelectorAll('[data-step]').forEach(button=>button.addEventListener('click',()=>applySnapshot(Number(button.dataset.step))));document.querySelector('#previous-step').addEventListener('click',()=>applySnapshot(Math.max(0,state.step-1)));document.querySelector('#next-step').addEventListener('click',()=>applySnapshot(Math.min(7,state.step+1)));

function updateCamera(){camera.position.copy(view.eye);camera.lookAt(view.focus);camera.zoom=view.zoom;camera.updateProjectionMatrix()}
function resize(){const width=canvas.clientWidth,height=canvas.clientHeight,aspect=width/Math.max(height,1),span=Math.max(38,19*aspect);camera.left=-span/2;camera.right=span/2;camera.top=span/aspect/2;camera.bottom=-camera.top;renderer.setSize(width,height,false);updateCamera()}
setupPageControls({detailPanel:ui.detail,detailButton:document.querySelector('#candle-detail-expand'),onLayoutChange:resize});
function updateTweens(now){for(let i=tweens.length-1;i>=0;i--){const tweenData=tweens[i],p=THREE.MathUtils.clamp((now-tweenData.started)/tweenData.duration,0,1),ease=1-Math.pow(1-p,3);tweenData.object.position.lerpVectors(tweenData.start,tweenData.to,ease);tweenData.object.quaternion.slerpQuaternions(tweenData.startQ,tweenData.endQ,ease);if(p>=1){tweens.splice(i,1);tweenData.resolve()}}}
function updatePour(now){if(!pourEffect)return;const p=THREE.MathUtils.clamp((now-pourEffect.start)/pourEffect.duration,0,1),layers=bottles[pourEffect.group].bed.userData.layerGroups;layers.forEach((layer,index)=>layer.visible=p>(index+1)/(layers.length+2));pourEffect.particles.forEach((seed,index)=>{const local=(p*2.1+index/pourEffect.particles.length)%1;seed.position.lerpVectors(pourEffect.source,pourEffect.target,local);seed.position.x+=(index%5-2)*.012;seed.position.z+=(index%3-1)*.012;seed.rotation.x+=.10;seed.rotation.z+=.07})}
function updateSmoke(now){if(!smokeEffect)return;const elapsed=(now-smokeEffect.start)/smokeEffect.duration;if(!smokeEffect.persistent&&elapsed>=1){smokePuffs.forEach(puff=>puff.visible=false);smokeEffect=null;return}smokePuffs.forEach((puff,index)=>{const q=smokeEffect.persistent?(elapsed+index/smokePuffs.length)%1:THREE.MathUtils.clamp(elapsed-index*.11,0,1);puff.visible=true;puff.position.copy(smokeEffect.position).add(V(Math.sin(q*8+index)*.075,q*.68,0));puff.material.opacity=.38*(1-q);puff.scale.setScalar(.9+q*1.05)})}
function animate(now){updateTweens(now);updatePour(now);updateSmoke(now);if(state.matchTaken)syncMatchFlame();if(state.matchLit)matchbox.parts.flame.userData.setStrength(.90+Math.sin(now*.021)*.07+Math.sin(now*.047)*.03);for(const group of ['A','B'])if(itemMap[`spoon${group}`].lit&&!state.busy)setCandle(group,.93+Math.sin(now*.014+(group==='A'?0:1))*.05+Math.sin(now*.031)*.02);updateMarker();renderer.render(scene,camera);renderCandleDetail(now);requestAnimationFrame(animate)}
function restoreExperimentState(){let saved=null;try{saved=JSON.parse(localStorage.getItem('respiration-experiment-1'))}catch{}if(!saved?.started){resetExperiment();return}if(saved.finished){resetObjects(false);Object.assign(state,{started:true,step:7,finished:true,busy:false});ui.start.hidden=true;setFeedback('实验一已完成，器材位于后方材料台。');updateUI();return}applySnapshot(saved.step||0)}
async function parkForSeries(animate=true){saveExperimentState();state.dayToken++;state.actionToken++;tweens.splice(0).forEach(data=>data.resolve());drag=null;for(const item of items)if(item.root.parent!==scene)scene.attach(item.root);hideCandleDetail();smokeEffect=null;smokePuffs.forEach(puff=>puff.visible=false);state.busy=true;if(animate)await Promise.all(items.map((item,index)=>tween(item.root,item.origin,480+index*24,new THREE.Euler())));resetObjects(false);state.busy=false}
async function activateFromSeries(){if(state.finished)return;if(!state.started){await startExperiment();return}const savedStep=state.step;state.busy=true;await Promise.all(items.map((item,index)=>tween(item.root,item.home,520+index*26,new THREE.Euler())));state.busy=false;applySnapshot(savedStep)}
let seriesPrimed=false;
addEventListener('message',async event=>{const message=event.data;if(!message||typeof message!=='object')return;if(message.type==='series:set-active'&&!seriesPrimed){seriesPrimed=true;if(message.id!=='oxygen')await parkForSeries(false)}if(message.type==='series:deactivate'){await parkForSeries(true);window.seriesBridge?.notify('series:deactivated',{id:'oxygen',requestId:message.requestId})}if(message.type==='series:activate'){await activateFromSeries();window.seriesBridge?.notify('series:activated',{id:'oxygen',requestId:message.requestId})}});
addEventListener('pagehide',saveExperimentState);
new ResizeObserver(resize).observe(canvas);addEventListener('resize',resize);resize();restoreExperimentState();requestAnimationFrame(animate);
