import * as THREE from './vendor/three.module.js';

// A second camera on the same geometry/materials, sharing the staining uniforms.
// Only the viewing transform changes; the saved leaf-to-paper mask does not.
export function setupPhenomenonCloseup({leaf,stage}){
 const panel=document.createElement('aside');panel.id='phenomenonCloseup';panel.hidden=true;panel.setAttribute('aria-label','实验现象实时特写');
 const title=document.createElement('h2');title.textContent='实验现象特写';
 const caption=document.createElement('p');caption.textContent='等待滴加碘液，实时观察叶片变化';
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(355,300);renderer.outputColorSpace=THREE.SRGBColorSpace;
 panel.append(title,renderer.domElement,caption);stage.append(panel);
 const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xffffff,0x788778,2));const light=new THREE.DirectionalLight(0xffffff,2.3);light.position.set(-2,5,3);scene.add(light);
 const camera=new THREE.OrthographicCamera(-1,1,1,-1,.01,20);camera.up.set(0,0,-1);
 let specimen=null;
 function build(){
  // clone() deliberately shares materials, including the live bleach/stain shader.
  specimen=leaf.clone(true);specimen.traverse(o=>{if(o.geometry?.type==='TorusGeometry')o.visible=false});specimen.position.set(0,0,0);specimen.quaternion.identity();specimen.scale.setScalar(1);scene.add(specimen);specimen.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(specimen),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  const height=Math.max(size.z,size.x/(355/300)) * 1.2,width=height*355/300;
  camera.left=-width/2;camera.right=width/2;camera.top=height/2;camera.bottom=-height/2;
  camera.position.copy(center).add(new THREE.Vector3(0,5,0));camera.lookAt(center);camera.updateProjectionMatrix();
 }
 function tick(){requestAnimationFrame(tick);panel.hidden=!leaf.userData.stainStage;if(panel.hidden)return;if(!specimen)build();
  caption.textContent=leaf.userData.stained?'未遮光部分：蓝黑色｜原遮光部分：黄褐色':leaf.userData.stainStage==='developing'?'碘液正在显色，遮光范围与原操作一致':'等待滴加碘液，实时观察叶片变化';
  renderer.render(scene,camera);
 }requestAnimationFrame(tick);
 document.querySelector('#resetBtn').addEventListener('click',()=>{panel.hidden=true;if(specimen){scene.remove(specimen);specimen=null}});
}
