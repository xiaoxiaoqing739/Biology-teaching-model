import * as THREE from './vendor/three.module.js';

export function setupLeafStain({roots,scene,camera,canvas,guide,toast,isActive}){
 const get=n=>roots.find(o=>o.name===n),leaf=get('plant').userData.experimentLeaf,blade=leaf.getObjectByName('LeafBlade'),bottle=get('iodine'),dish=get('dish');
 const {dropper,bulb,tubeLiquid,meniscus,tipAnchor}=bottle.userData.parts;
 const home={position:dropper.position.clone(),quaternion:dropper.quaternion.clone(),scale:dropper.scale.clone()},bulbScale=bulb.scale.clone();
 const panel=document.createElement('div');panel.id='stainAction';panel.style.cssText='display:none;position:absolute;left:650px;bottom:76px;z-index:19;padding:14px;max-width:650px;background:#09273cee;border:1px solid #8be4d0;border-radius:12px';
 const button=document.createElement('button'),hint=document.createElement('div');hint.style.cssText='font-size:17px;color:#def6ee;margin-top:8px';panel.append(button,hint);document.querySelector('#stage').append(panel);
 let phase='waiting',job=null,drag=null,last=performance.now(),reaction=0;
 const progress={value:0},mask={value:new THREE.Matrix4()},half={value:new THREE.Vector2(.23,.13)};
 // Chain the existing chlorophyll-removal shader, rather than replacing it.
 leaf.updateWorldMatrix(true,true);const meshToLeaf=new THREE.Matrix4().copy(leaf.matrixWorld).invert().multiply(blade.matrixWorld);
 const original=Array.isArray(blade.material)?blade.material:[blade.material];
 const stained=original.map(source=>{const m=source.clone(),before=source.onBeforeCompile,key=source.customProgramCacheKey.bind(source);
  m.onBeforeCompile=shader=>{before.call(source,shader);Object.assign(shader.uniforms,{stainProgress:progress,stainMask:mask,stainHalf:half,stainMeshToLeaf:{value:meshToLeaf}});
   shader.vertexShader='uniform mat4 stainMask; uniform mat4 stainMeshToLeaf; varying vec2 stainPaper;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nstainPaper=(stainMask*stainMeshToLeaf*vec4(position,1.0)).xz;');
   shader.fragmentShader='uniform float stainProgress; uniform vec2 stainHalf; varying vec2 stainPaper;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float covered=step(abs(stainPaper.x),stainHalf.x)*step(abs(stainPaper.y),stainHalf.y);
    float delay=min(length(stainPaper)*0.18,0.35);
    float develop=smoothstep(delay,delay+0.62,stainProgress);
    float textureLight=0.72+0.28*clamp(dot(diffuseColor.rgb,vec3(0.299,0.587,0.114)),0.0,1.0);
    vec3 result=mix(vec3(0.025,0.032,0.13),vec3(0.67,0.48,0.19),covered)*textureLight;
    diffuseColor.rgb=mix(diffuseColor.rgb,result,develop);
   `);
  };m.customProgramCacheKey=()=>key()+'-stain-mask-v1';return m;
 });blade.material=Array.isArray(blade.material)?stained:stained[0];
 const drop=new THREE.Mesh(new THREE.SphereGeometry(.014,18,12),new THREE.MeshPhysicalMaterial({color:0x61300e,roughness:.13,transparent:true,opacity:.88}));scene.add(drop);drop.visible=false;
 const ray=new THREE.Raycaster();
 function show(p,title,text){phase=p;leaf.userData.stainStage=p;panel.style.display='block';button.disabled=false;button.textContent=title;hint.textContent=text;guide(title,text)}
 function world(o){return o.getWorldPosition(new THREE.Vector3())}
 function near(e,o,r=130){const v=world(o).project(camera),b=canvas.getBoundingClientRect();return Math.hypot(e.clientX-b.left-(v.x+1)*b.width/2,e.clientY-b.top-(1-v.y)*b.height/2)<r*b.width/1672}
 function tween(duration,update,done){job={duration,update,done,time:0};button.disabled=true}
 function liquid(amount){tubeLiquid.scale.y=amount;tubeLiquid.position.y=.1225+.1125*amount;meniscus.position.y=.1225+.225*amount}
 function take(){if(job||phase!=='take')return;const start=dropper.position.clone();tween(.85,t=>{bulb.scale.copy(bulbScale);bulb.scale.x*=1-.2*Math.sin(t*Math.PI);liquid(.4+.6*t);dropper.position.copy(start).add(new THREE.Vector3(0,.55*Math.max(0,(t-.35)/.65),0))},()=>show('aim','移动滴管到叶片上方','拖动滴管到培养皿松手；也可点击培养皿自动对准'))}
 function aim(){if(job||phase!=='aim')return;scene.attach(dropper);const start=dropper.position.clone(),target=dish.localToWorld(new THREE.Vector3(0,.48,0)),end=start.clone().add(target.sub(world(tipAnchor)));
  tween(.65,t=>dropper.position.copy(start).lerp(end,t),()=>show('dose','挤压滴管，滴加碘液','点击按钮或滴管胶头滴加三滴碘液，随后观察逐渐显色'));
 }
 function dose(){if(job||phase!=='dose')return;show('developing','正在滴加并显色','未遮光部分逐渐变蓝黑，原遮光部分保留黄褐色');reaction=0;
  const end=new THREE.Box3().setFromObject(blade).getCenter(new THREE.Vector3());
  tween(2.7,t=>{const cycle=Math.min(t*3,2.999),p=cycle%1;bulb.scale.copy(bulbScale);bulb.scale.x*=1-.22*Math.sin(p*Math.PI);liquid(1-.65*t);
   const a=world(tipAnchor);drop.visible=p>.12&&p<.93;drop.position.copy(a).lerp(end,Math.pow(THREE.MathUtils.clamp((p-.12)/.8,0,1),2));drop.scale.set(1,1+.4*Math.sin(p*Math.PI),1);
   if(t>.30)reaction=Math.max(reaction,.001);
  },()=>{drop.visible=false;bulb.scale.copy(bulbScale);const from=dropper.position.clone();bottle.updateWorldMatrix(true,true);const to=bottle.localToWorld(home.position.clone());tween(.7,t=>dropper.position.copy(from).lerp(to,t),()=>{bottle.add(dropper);dropper.position.copy(home.position);dropper.quaternion.copy(home.quaternion);dropper.scale.copy(home.scale);button.disabled=true})});
 }
 button.onclick=()=>{if(!isActive())return;if(phase==='take')take();else if(phase==='aim')aim();else if(phase==='dose')dose()};
 function rayAt(e){const r=canvas.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera)}
 canvas.addEventListener('pointerdown',e=>{
  if(phase==='waiting'||phase==='done'||!isActive())return;
  if(job){e.stopImmediatePropagation();return}
  if(phase==='take'&&near(e,bottle)){e.stopImmediatePropagation();take();return}
  if(phase==='dose'&&near(e,bulb,100)){e.stopImmediatePropagation();dose();return}
  if(phase!=='aim')return;
  if(near(e,dish)){e.stopImmediatePropagation();aim();return}
  if(!near(e,bulb,115)&&!near(e,tipAnchor,100))return;e.stopImmediatePropagation();scene.attach(dropper);rayAt(e);const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()),dropper.position),p=ray.ray.intersectPlane(plane,new THREE.Vector3());if(p){drag={id:e.pointerId,plane,offset:dropper.position.clone().sub(p)};canvas.setPointerCapture(e.pointerId)}
 },true);
 canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;e.stopImmediatePropagation();if(!isActive())return;rayAt(e);const p=ray.ray.intersectPlane(drag.plane,new THREE.Vector3());if(p)dropper.position.copy(p).add(drag.offset)},true);
 canvas.addEventListener('pointerup',e=>{if(!drag)return;e.stopImmediatePropagation();drag=null;if(isActive()&&near(e,dish,180))aim()},true);
 canvas.addEventListener('pointercancel',()=>drag=null,true);
 document.querySelector('#resetBtn').addEventListener('click',()=>{phase='waiting';leaf.userData.stainStage=null;job=drag=null;reaction=progress.value=0;panel.style.display='none';drop.visible=false;bottle.add(dropper);dropper.position.copy(home.position);dropper.quaternion.copy(home.quaternion);dropper.scale.copy(home.scale);bulb.scale.copy(bulbScale);liquid(1);leaf.userData.stained=false});
 function tick(now){requestAnimationFrame(tick);const dt=Math.min(.05,(now-last)/1000);last=now;if(!isActive())return;
  if(phase==='waiting'&&leaf.userData.rinsed){const record=leaf.userData.shadeRecord;if(!record){guide('缺少遮光记录','请重置并完成遮光与光照步骤，避免生成错误的染色范围');phase='blocked';return}mask.value.fromArray(record.leafToPaper);half.value.fromArray(record.paperHalfSize);document.querySelector('#rinseAction').style.display='none';show('take','吸取碘液并取出滴管','点击碘液瓶或下方按钮，滴管内将保留可见的碘液')}
  if(job){const j=job;j.time+=dt;j.update(Math.min(1,j.time/j.duration));if(j.time>=j.duration){job=null;j.done()}}
  if(reaction>0&&phase==='developing'){reaction+=dt;progress.value=Math.min(1,reaction/5);if(progress.value===1&&!job){leaf.userData.stained=true;show('done','观察染色结果','未遮光部分呈蓝黑色；原遮光部分呈黄褐色。可放大观察，遮光范围与之前一致。');button.disabled=true;toast('显色完成，滴管已归位')}}
 }requestAnimationFrame(tick);
}
