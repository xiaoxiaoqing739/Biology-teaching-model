import * as THREE from '../../shared/vendor/three.module.js';

export function createWideMouthBottle() {
  const root = new THREE.Group();
  root.name = 'wide-mouth-glass-bottle';
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xc9f4f0, roughness: .08, transmission: .91, transparent: true, opacity: .44, ior: 1.47, thickness: .16, clearcoat: .65, clearcoatRoughness: .08, side: THREE.DoubleSide, depthWrite: false });
  const edge = new THREE.MeshPhysicalMaterial({ color: 0xa9e3de, roughness: .12, transmission: .72, transparent: true, opacity: .78, ior: 1.47, thickness: .2, clearcoat: .8 });
  const profile = [[1.34,.10],[1.43,.18],[1.49,.34],[1.52,.62],[1.52,3.70],[1.48,4.02],[1.34,4.25],[1.16,4.43],[1.06,4.58],[1.06,5.03]].map(([r,y])=>new THREE.Vector2(r,y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile,128),glass); body.castShadow=true; body.receiveShadow=true; root.add(body);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.39,1.43,.18,128),edge); base.position.y=.14; root.add(base);
  const inset = new THREE.Mesh(new THREE.CylinderGeometry(1.08,1.20,.08,96),new THREE.MeshPhysicalMaterial({color:0x8fd0cb,transparent:true,opacity:.34,roughness:.2,transmission:.65,depthWrite:false})); inset.position.y=.25; root.add(inset);
  const rimOuter = new THREE.Mesh(new THREE.TorusGeometry(1.09,.11,24,128),edge); rimOuter.rotation.x=Math.PI/2; rimOuter.position.y=5.05; root.add(rimOuter);
  const rimInner = new THREE.Mesh(new THREE.TorusGeometry(.92,.045,18,128),new THREE.MeshStandardMaterial({color:0x76aaa8,transparent:true,opacity:.70,roughness:.28})); rimInner.rotation.x=Math.PI/2; rimInner.position.y=5.045; root.add(rimInner);
  const mouth = new THREE.Mesh(new THREE.RingGeometry(.86,1,128),new THREE.MeshBasicMaterial({color:0x31565b,transparent:true,opacity:.38,side:THREE.DoubleSide,depthWrite:false})); mouth.rotation.x=-Math.PI/2; mouth.position.y=5.015; root.add(mouth);
  const mouthAnchor = new THREE.Object3D(); mouthAnchor.position.y=5.08; root.add(mouthAnchor);
  root.userData={type:'wide-mouth-bottle',mouthRadius:.86,innerHeight:4.78,mouthAnchor};
  return root;
}

export function createBottleStopper() {
  const root = new THREE.Group();
  root.name = 'bottle-stopper';
  const cork = new THREE.MeshStandardMaterial({ color: 0xb88758, roughness: .86 });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.08, .24, 96), cork);
  top.position.y = .54; top.castShadow = true; root.add(top);
  const plug = new THREE.Mesh(new THREE.CylinderGeometry(.91, .84, .58, 96), cork);
  plug.position.y = .22; plug.castShadow = true; root.add(plug);
  for (let i = 0; i < 10; i++) {
    const grain = new THREE.Mesh(new THREE.TorusGeometry(.48 + i % 3 * .13, .012, 6, 48, Math.PI * (1 + i % 2 * .32)), new THREE.MeshBasicMaterial({ color: 0x805a3e, transparent: true, opacity: .34 }));
    grain.rotation.x = Math.PI / 2; grain.rotation.z = i * .63; grain.position.y = .665; root.add(grain);
  }
  root.userData.type = 'bottle-stopper';
  return root;
}
