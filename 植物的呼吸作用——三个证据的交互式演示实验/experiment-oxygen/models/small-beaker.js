import * as THREE from '../../shared/vendor/three.module.js';

export function createSmallBeaker() {
  const root = new THREE.Group();
  root.name = 'small-seed-beaker';
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xcaf4f0, roughness: .08, transmission: .9, transparent: true, opacity: .38, ior: 1.46, thickness: .12, clearcoat: .55, side: THREE.DoubleSide, depthWrite: false });
  const edge = new THREE.MeshPhysicalMaterial({ color: 0xa6ded8, roughness: .12, transmission: .68, transparent: true, opacity: .76, ior: 1.46, thickness: .16 });
  const profile = [[.94,.04],[.98,.10],[1.0,.20],[1.0,1.14],[1.04,1.24]].map(([r,y])=>new THREE.Vector2(r,y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile,96),glass); body.castShadow=true; root.add(body);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.94,.97,.10,96),edge); base.position.y=.08; root.add(base);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.04,.045,16,96),edge); rim.rotation.x=Math.PI/2; rim.position.y=1.25; root.add(rim);
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(1.16,1.16,1.48,24),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false})); hit.position.y=.63; root.add(hit);
  root.userData={type:'seed-beaker',hit};
  return root;
}
