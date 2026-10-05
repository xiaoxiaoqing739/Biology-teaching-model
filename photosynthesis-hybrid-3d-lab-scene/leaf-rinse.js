import * as THREE from './vendor/three.module.js';

// Continue with the original leaf instance: its UVs and shadeRecord never change.
export function setupLeafRinse({roots,scene,camera,canvas,restore,guide,toast,isActive}) {
 const get=n=>roots.find(o=>o.name===n),leaf=get('plant').userData.experimentLeaf;
 const tool=get('tweezers'),dish=get('dish'),wash=get('wash'),D=dish.userData.parts,W=wash.userData.parts;
 const arms=tool.userData.parts.arms,armAngles=arms.map(a=>a.rotation.y);
 const panel=document.createElement('div');panel.id='rinseAction';panel.style.cssText='display:none;position:absolute;left:650px;bottom:76px;z-index:18;padding:14px;max-width:610px;background:#09273cee;border:1px solid #8be4d0;border-radius:12px';
 const button=document.createElement('button'),hint=document.createElement('div');hint.style.cssText='font-size:17px;color:#def6ee;margin-top:8px';panel.append(button,hint);document.querySelector('#stage').append(panel);
 let phase='waiting',selected=false,drag=null,job=null,last=performance.now();
 const ray=new THREE.Raycaster(),up=new THREE.Vector3(0,1,0);
 const waterMaterial=new THREE.MeshPhysicalMaterial({color:0xd9f1f2,transparent:true,opacity:.35,roughness:.06,transmission:.75,ior:1.333,depthWrite:false});
 const pool=new THREE.Mesh(new THREE.CylinderGeometry(.397,.397,.012,64),waterMaterial);pool.position.y=.035;pool.visible=false;dish.add(pool);
 const effects=new THREE.Group();scene.add(effects);effects.visible=false;
 const jet=Array.from({length:30},()=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,9),waterMaterial);effects.add(m);return m});
 const ripples=Array.from({length:4},()=>{const m=new THREE.Mesh(new THREE.TorusGeometry(1,.025,8,48),waterMaterial.clone());m.rotation.x=-Math.PI/2;dish.add(m);m.visible=false;return m});
 const droplets=Array.from({length:12},()=>{const m=new THREE.Mesh(new THREE.SphereGeometry(.009,10,8),waterMaterial);effects.add(m);return m});
 function show(p,title,text){phase=p;selected=false;panel.style.display='block';button.disabled=false;button.textContent=title;hint.textContent=text;guide(title,text)}
 function tween(duration,update,done){job={duration,update,done,time:0};button.disabled=true}
 function world(o){return o.getWorldPosition(new THREE.Vector3())}
 function near(e,o,r=115){const v=world(o).project(camera),b=canvas.getBoundingClientRect();return Math.hypot(e.clientX-b.left-(v.x+1)*b.width/2,e.clientY-b.top-(1-v.y)*b.height/2)<r*b.width/1672}
 function rayAt(e){const r=canvas.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera)}
 function setWorld(o,p){o.position.copy(o.parent.worldToLocal(p.clone()))}
 function tip(){return tool.localToWorld(new THREE.Vector3(.40,.10,0))}
 function closeTool(p){arms.forEach((a,i)=>a.rotation.y=armAngles[i]*(1-.9*p))}
 function pick(){
  if(job||phase!=='pick')return;selected=false;
  const start=world(tool),delta=world(leaf).sub(tip()),end=start.clone().add(delta);
  tween(.65,t=>{setWorld(tool,start.clone().lerp(end,t));closeTool(t)},()=>{
   tool.attach(leaf);leaf.userData.inBeaker=false;
   show('place','将叶片放入培养皿','拖动夹着叶片的镊子到培养皿，或点击培养皿');
   selected=true;
  });
 }
 function place(){
  if(job||phase!=='place')return;
  const start=world(tool),target=dish.localToWorld(new THREE.Vector3(0,.19,0)),end=start.clone().add(target.sub(world(leaf)));
  tween(.75,t=>setWorld(tool,start.clone().lerp(end,t)),()=>{
   dish.attach(leaf);const pos=leaf.position.clone(),q=leaf.quaternion.clone(),s=leaf.scale.clone();
   // Leaf geometry is authored in local XZ. Lay it flat, fitting inside the dish.
   leaf.quaternion.identity();leaf.scale.setScalar(1);leaf.position.set(0,.065,0);dish.updateWorldMatrix(true,true);
   const box=new THREE.Box3().setFromObject(leaf),size=box.getSize(new THREE.Vector3()),scale=dish.getWorldScale(new THREE.Vector3()).x;
   const fit=Math.min(.66*scale/Math.hypot(size.x,size.z),1),center=dish.worldToLocal(box.getCenter(new THREE.Vector3()));
   const destScale=new THREE.Vector3().setScalar(fit),dest=new THREE.Vector3(-center.x*fit,.065,-center.z*fit);
   leaf.position.copy(pos);leaf.quaternion.copy(q);leaf.scale.copy(s);
   tween(.55,t=>{leaf.position.copy(pos).lerp(dest,t);leaf.quaternion.copy(q).slerp(new THREE.Quaternion(),t);leaf.scale.copy(s).lerp(destScale,t);closeTool(1-t)},()=>{
    restore(tool);leaf.userData.inDish=true;show('wash','选择洗瓶漂洗叶片','把洗瓶拖到培养皿附近松手，或选择洗瓶后点击培养皿');toast('叶片已放入培养皿，镊子已归位');
   });
  });
 }
 function rinse(){
  if(job||phase!=='wash')return;
  const start=world(wash),out=wash.localToWorld(new THREE.Vector3(.495,.592,0)),target=dish.localToWorld(new THREE.Vector3(-.10,.62,0)),end=start.clone().add(target.sub(out));
  tween(.65,t=>setWorld(wash,start.clone().lerp(end,t)),()=>{
   pool.visible=true;
   show('rinsing','正在挤压漂洗','清水冲洗叶片，水流和培养皿积水逐渐变化');
   tween(4,t=>{
    const squeeze=Math.min(t*6,1,(1-t)*6);
    W.bottle.scale.set(1-.22*squeeze,1+.055*squeeze,1+.10*squeeze);
    W.water.scale.set(1-.18*squeeze,1+.08*squeeze-.22*t,1+.08*squeeze);W.waterTop.position.y=.33*(1+.08*squeeze-.22*t);
    effects.visible=t>.03&&t<.97;
    const a=wash.localToWorld(new THREE.Vector3(.495,.592,0)),b=dish.localToWorld(new THREE.Vector3(0,.071,0));
    const curve=new THREE.QuadraticBezierCurve3(a,a.clone().lerp(b,.45).add(new THREE.Vector3(.10,.12,0)),b);
    jet.forEach((m,i)=>{const p=curve.getPoint(i/30),q=curve.getPoint((i+1)/30),v=q.clone().sub(p);m.position.copy(p).add(q).multiplyScalar(.5);m.quaternion.setFromUnitVectors(up,v.clone().normalize());const r=(.011-i*.00013)*(1+.12*Math.sin(t*110+i));m.scale.set(r,v.length()*1.03,r)});
    pool.scale.y=1+t*2;pool.position.y=.035+t*.012;
    ripples.forEach((m,i)=>{const p=(t*5+i/4)%1;m.visible=effects.visible;m.position.set(0,.071,0);m.scale.setScalar(.025+p*.32);m.material.opacity=(1-p)*.30});
    droplets.forEach((m,i)=>{const p=(t*9+i/12)%1,angle=i*2.4;m.position.copy(b).add(new THREE.Vector3(Math.cos(angle)*p*.12,Math.sin(p*Math.PI)*.07,Math.sin(angle)*p*.12));m.scale.setScalar(1-p*.7)});
   },()=>{
    effects.visible=false;ripples.forEach(m=>m.visible=false);W.bottle.scale.set(1,1,1);W.water.scale.set(1,.78,1);W.waterTop.position.y=.33*.78;restore(wash);
    leaf.userData.rinsed=true;show('done','漂洗完成','已保留原叶片的遮光位置与范围，下一步再滴加碘液');button.disabled=true;toast('漂洗完成，洗瓶已自动归位');
   });
  });
 }
 button.onclick=()=>{if(!isActive()||job)return;selected=true;hint.textContent=phase==='pick'?'请点击小烧杯中的叶片':phase==='place'?'请点击培养皿':'请点击培养皿开始漂洗'};
 function target(){return phase==='pick'?leaf:dish}
 function source(){return phase==='wash'?wash:tool}
 function action(){if(phase==='pick')pick();else if(phase==='place')place();else if(phase==='wash')rinse()}
 canvas.addEventListener('pointerdown',e=>{
  if(phase==='waiting'||phase==='done'||!isActive())return;
  if(job){e.stopImmediatePropagation();return}
  if(selected&&near(e,target(),145)){e.stopImmediatePropagation();action();return}
  const o=source();if(!near(e,o,120))return;
  e.stopImmediatePropagation();selected=true;rayAt(e);const p=world(o),plane=new THREE.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()),p),hit=ray.ray.intersectPlane(plane,new THREE.Vector3());
  if(hit){drag={id:e.pointerId,o,plane,offset:p.sub(hit),x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)}
 },true);
 canvas.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;e.stopImmediatePropagation();if(!isActive())return;rayAt(e);const p=ray.ray.intersectPlane(drag.plane,new THREE.Vector3());if(p)setWorld(drag.o,p.add(drag.offset))},true);
 canvas.addEventListener('pointerup',e=>{if(!drag)return;e.stopImmediatePropagation();const moved=Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5;drag=null;if(isActive()&&moved&&near(e,target(),165))action()},true);
 canvas.addEventListener('pointercancel',()=>{drag=null},true);
 document.querySelector('#resetBtn').addEventListener('click',()=>{phase='waiting';drag=job=null;selected=false;panel.style.display='none';pool.visible=effects.visible=false;ripples.forEach(m=>m.visible=false);closeTool(0);D.lid.position.copy(D.lidClosed.position);D.lid.rotation.copy(D.lidClosed.rotation);W.bottle.scale.set(1,1,1);W.water.scale.set(1,1,1);W.waterTop.position.y=.33;leaf.userData.inDish=leaf.userData.rinsed=false});
 function tick(now){requestAnimationFrame(tick);const dt=Math.min(.05,(now-last)/1000);last=now;if(!isActive())return;
  if(phase==='waiting'&&leaf.userData.heatingComplete){document.querySelector('#bathAction').style.display='none';D.lid.position.copy(D.lidOpen.position);D.lid.rotation.copy(D.lidOpen.rotation);show('pick','用镊子夹取叶片','灯已熄灭。拖动镊子靠近杯中叶片，或先选镊子再点击叶片')}
  if(job){const j=job;j.time+=dt;j.update(Math.min(1,j.time/j.duration));if(j.time>=j.duration){job=null;j.done()}}
 }requestAnimationFrame(tick);
}
