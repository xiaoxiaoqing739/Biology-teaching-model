// Zoom/pan the common visual layer, so photographic background, WebGL objects,
// cabinet door and hit zones retain the same coordinate system.
export function setupSceneNavigation({stage,canvas,isObjectAt}){
 const world=document.createElement('div');world.id='sceneWorld';world.style.cssText='position:absolute;inset:0;transform-origin:0 0;z-index:0';
 const ids=['background','leftCleanup','middleCleanup','tableCleanup','sunGlow','webgl','cabinetZone','sunZone','doorWrap','labels'];for(const id of ids){const el=document.getElementById(id);if(el)world.append(el)}stage.prepend(world);
 let zoom=1,x=0,y=0,drag=null,pinch=null;const touches=new Map();
 const controls=document.createElement('div');controls.id='viewControls';controls.innerHTML='<button aria-label="缩小画面">−</button><button aria-label="放大画面">＋</button><button aria-label="复位画面">复位画面</button><span>滚轮缩放 · 拖动空白平移 · 双指缩放</span>';stage.append(controls);
 function point(e){const r=stage.getBoundingClientRect();return{x:(e.clientX-r.left)*1672/r.width,y:(e.clientY-r.top)*941/r.height}}
 function render(){x=Math.max(1672*(1-zoom),Math.min(0,x));y=Math.max(941*(1-zoom),Math.min(0,y));world.style.transform=`translate(${x}px,${y}px) scale(${zoom})`}
 function scaleTo(z,p){z=Math.max(1,Math.min(3.5,z));const ratio=z/zoom;x=p.x-(p.x-x)*ratio;y=p.y-(p.y-y)*ratio;zoom=z;render()}
 const reset=()=>{zoom=1;x=y=0;render()};controls.children[0].onclick=()=>scaleTo(zoom/1.2,{x:836,y:470});controls.children[1].onclick=()=>scaleTo(zoom*1.2,{x:836,y:470});controls.children[2].onclick=reset;
 canvas.addEventListener('wheel',e=>{e.preventDefault();e.stopImmediatePropagation();scaleTo(zoom*Math.exp(-e.deltaY*.0012),point(e))},{capture:true,passive:false});
 canvas.addEventListener('pointerdown',e=>{touches.set(e.pointerId,point(e));if(touches.size===2){canvas.dispatchEvent(new Event('pointercancel'));const [a,b]=[...touches.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom};drag=null;e.stopImmediatePropagation();return}if(zoom>1&&!isObjectAt(e)){e.stopImmediatePropagation();drag={id:e.pointerId,p:point(e),x,y};canvas.setPointerCapture(e.pointerId)}},true);
 canvas.addEventListener('pointermove',e=>{if(touches.has(e.pointerId))touches.set(e.pointerId,point(e));if(pinch&&touches.size===2){e.stopImmediatePropagation();const [a,b]=[...touches.values()];scaleTo(pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,pinch.distance),{x:(a.x+b.x)/2,y:(a.y+b.y)/2});return}if(drag?.id===e.pointerId){e.stopImmediatePropagation();const p=point(e);x=drag.x+p.x-drag.p.x;y=drag.y+p.y-drag.p.y;render()}},true);
 canvas.addEventListener('pointerup',e=>{touches.delete(e.pointerId);if(drag||pinch)e.stopImmediatePropagation();drag=null;if(touches.size<2)pinch=null},true);
 document.querySelector('#resetBtn').addEventListener('click',reset);
}
