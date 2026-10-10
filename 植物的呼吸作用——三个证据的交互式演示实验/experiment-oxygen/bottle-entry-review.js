import * as THREE from '../shared/vendor/three.module.js';
import {createWideMouthBottle,createBottleStopper} from './models/wide-mouth-bottle.js';
import {createCandleInLongSpoon} from './models/candle-spoon.js';
import {createGerminatingSeed} from './models/germinating-seed.js';

const canvas=document.querySelector('#model-scene'),renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;renderer.shadowMap.enabled=true;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x192a31);scene.add(new THREE.HemisphereLight(0xfff6df,0x263941,2.8));
const key=new THREE.DirectionalLight(0xffead1,4.4);key.position.set(-5,9,7);key.castShadow=true;scene.add(key);
const fill=new THREE.DirectionalLight(0x70dadd,2.2);fill.position.set(6,5,-5);scene.add(fill);
const platform=new THREE.Mesh(new THREE.CylinderGeometry(4.2,4.45,.32,96),new THREE.MeshStandardMaterial({color:0x314a4e,roughness:.54,metalness:.3}));platform.position.y=-.52;platform.receiveShadow=true;scene.add(platform);

function createSettledSeedBed(){
  const bed=new THREE.Group();
  const positions=[[0,0]];
  for(let i=0;i<6;i++){const a=i*Math.PI*2/6;positions.push([Math.cos(a)*.28,Math.sin(a)*.28])}
  for(let i=0;i<8;i++){const a=i*Math.PI*2/8+.12;positions.push([Math.cos(a)*.53,Math.sin(a)*.53])}
  for(let i=0;i<12;i++){const a=i*Math.PI*2/12+.05;positions.push([Math.cos(a)*.78,Math.sin(a)*.78])}
  const layers=8;
  for(let layer=0;layer<layers;layer++){
    for(let i=0;i<positions.length;i++){
      const seed=createGerminatingSeed();seed.scale.setScalar(.14);
      const [x,z]=positions[i];
      seed.position.set(x+((layer+i)%3-1)*.018,.30+layer*.16,z+((layer+i*2)%3-1)*.018);
      seed.rotation.set((layer+i)*.17,i*.23,(layer+i)*.31);bed.add(seed)
    }
  }
  bed.name='settled-germinating-seeds';
  bed.userData={seedCount:layers*positions.length,layers,seedsPerLayer:positions.length,layout:'radial-flat-bed'};
  return bed
}
const bottle=createWideMouthBottle();bottle.position.set(0,-.34,0);bottle.add(createSettledSeedBed());scene.add(bottle);
const stopper=createBottleStopper();const stopperHome=new THREE.Vector3(0,4.05,0);const stopperOpen=new THREE.Vector3(2.15,4.55,.35);stopper.position.copy(stopperHome);scene.add(stopper);
const spoon=createCandleInLongSpoon();spoon.position.set(.72,4.28,.32);spoon.rotation.y=-.06;scene.add(spoon);
const pickMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:.001,depthTest:false,depthWrite:false});
const spoonPick=new THREE.Mesh(new THREE.BoxGeometry(.42,4.75,.42),pickMaterial);spoonPick.position.set(-.47,2.35,0);spoonPick.renderOrder=60;spoon.add(spoonPick);spoon.userData.pick=spoonPick;
spoon.userData.flame.visible=true;spoon.userData.flameCore.visible=true;spoon.userData.glow.visible=true;spoon.userData.lit=true;

const state={stopperOpen:false,spoonPlaced:false,animation:null};
const camera=new THREE.PerspectiveCamera(32,1,.1,100),view={azimuth:.12,elevation:.10,distance:12.8};let drag=null;
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),worldPoint=new THREE.Vector3(),targetPoint=new THREE.Vector3(),dragPlane=new THREE.Plane(new THREE.Vector3(0,0,1),0);
const status=document.querySelector('#entry-status');

function updateCamera(){const h=Math.cos(view.elevation)*view.distance;camera.position.set(Math.sin(view.azimuth)*h,2.35+Math.sin(view.elevation)*view.distance,Math.cos(view.azimuth)*h);camera.lookAt(0,2.35,.1)}
function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix()}
function rayFrom(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);raycaster.setFromCamera(pointer,camera)}
function openStopper(){state.stopperOpen=true;stopper.position.copy(stopperOpen);stopper.rotation.y=-.34;status.textContent='瓶塞已移开：拖动小长匙，使匙碗对准瓶口'}
function reset(){state.stopperOpen=false;state.spoonPlaced=false;state.animation=null;stopper.position.copy(stopperHome);stopper.rotation.set(0,0,0);spoon.position.set(.72,4.28,.32);spoon.rotation.set(0,-.06,0);status.textContent='准备开始：瓶内已有静置一夜的萌发种子；先打开瓶口'}
function mouthWorld(){return bottle.userData.mouthAnchor.getWorldPosition(new THREE.Vector3())}
function screenDistance(e,target){const r=canvas.getBoundingClientRect(),p=target.clone().project(camera),x=r.left+(p.x+1)*r.width*.5,y=r.top+(1-p.y)*r.height*.5;return Math.hypot(e.clientX-x,e.clientY-y)}
function startEntry(){state.animation={start:spoon.position.clone(),end:new THREE.Vector3(0,1.42,.04),started:performance.now(),duration:850};status.textContent='匙碗已对准瓶口：正在从上向下放入，停在种子层上方'}
function pointerdown(e){rayFrom(e);const stopperHit=raycaster.intersectObject(stopper,true).length>0;const spoonHit=state.stopperOpen&&!state.spoonPlaced&&(raycaster.intersectObject(spoon.userData.pick,true).length>0||raycaster.intersectObject(spoon,true).length>0);
  if(stopperHit){drag={id:e.pointerId,mode:'stopper',x:e.clientX,y:e.clientY,moved:false};dragPlane.constant=-stopper.position.z}
  else if(spoonHit){drag={id:e.pointerId,mode:'spoon',x:e.clientX,y:e.clientY,moved:false,offset:new THREE.Vector3()};dragPlane.constant=-spoon.position.z;raycaster.ray.intersectPlane(dragPlane,worldPoint);drag.offset.copy(spoon.position).sub(worldPoint)}
  else{drag={id:e.pointerId,mode:'view',x:e.clientX,y:e.clientY,moved:false}}
  canvas.setPointerCapture(e.pointerId)
}
function pointermove(e){if(!drag||drag.id!==e.pointerId)return;if(drag.mode==='stopper'||drag.mode==='spoon'){drag.moved||=Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5;rayFrom(e);if(raycaster.ray.intersectPlane(dragPlane,worldPoint)){if(drag.mode==='stopper')stopper.position.copy(worldPoint).add(drag.offset||new THREE.Vector3());else spoon.position.copy(worldPoint).add(drag.offset||new THREE.Vector3())}}else if(drag.mode==='view'){view.azimuth-=(e.clientX-drag.x)*.006;view.elevation=THREE.MathUtils.clamp(view.elevation+(e.clientY-drag.y)*.005,-.2,.55)}drag.x=e.clientX;drag.y=e.clientY}
function pointerup(e){if(!drag||drag.id!==e.pointerId)return;if(drag.mode==='stopper'){if(!drag.moved){if(!state.stopperOpen)openStopper()}else if(screenDistance(e,stopperOpen)<130)openStopper();else{stopper.position.copy(stopperHome);status.textContent='瓶塞已复位：请将瓶口打开后再放入小长匙'}}else if(drag.mode==='spoon'&&state.stopperOpen&&!state.spoonPlaced){const nearMouth=screenDistance(e,mouthWorld())<145;if(nearMouth)startEntry();else status.textContent='请将匙碗拖到广口瓶口正上方'}drag=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId)}
canvas.addEventListener('pointerdown',pointerdown);canvas.addEventListener('pointermove',pointermove);canvas.addEventListener('pointerup',pointerup);canvas.addEventListener('pointercancel',pointerup);canvas.addEventListener('wheel',e=>{e.preventDefault();view.distance=THREE.MathUtils.clamp(view.distance+e.deltaY*.008,8.2,14)},{passive:false});
document.querySelector('#reset-scene').addEventListener('click',()=>{Object.assign(view,{azimuth:.12,elevation:.10,distance:10.9});reset()});new ResizeObserver(resize).observe(canvas);resize();reset();
function render(now){updateCamera();if(state.animation){const p=THREE.MathUtils.clamp((now-state.animation.started)/state.animation.duration,0,1),e=1-Math.pow(1-p,3);spoon.position.lerpVectors(state.animation.start,state.animation.end,e);if(p>=1){state.animation=null;state.spoonPlaced=true;status.textContent='小长匙已从瓶口放入：当前可审核匙碗与瓶身的空间关系'}}renderer.render(scene,camera);requestAnimationFrame(render)}requestAnimationFrame(render);
