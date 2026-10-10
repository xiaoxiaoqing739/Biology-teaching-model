import * as THREE from '../shared/vendor/three.module.js';

/**
 * 8 个平整交错层，顶面约 y=2.45，与保温瓶内腔 4.32 的有效高度形成二分之一装量。
 * 使用 InstancedMesh 保证两组高数量种子仍能流畅渲染。
 */
export function createSeedBed({group = 'A'} = {}) {
  const positions = [];
  const spacing = .285;
  const radius = .91;
  for (let layer = 0; layer < 8; layer += 1) {
    for (let row = -4; row <= 4; row += 1) {
      for (let column = -4; column <= 4; column += 1) {
        const x = column * spacing + ((row + layer) % 2 ? spacing * .48 : 0);
        const z = row * spacing * .80 + (layer % 3 - 1) * .022;
        if (Math.hypot(x, z) <= radius) positions.push({x, z, layer, order: Math.hypot(x, z)});
      }
    }
  }
  positions.sort((a, b) => a.layer - b.layer || a.order - b.order);
  const geometry = new THREE.SphereGeometry(1, 18, 12);
  const material = new THREE.MeshStandardMaterial({
    color: group === 'A' ? 0xc99648 : 0x8f644f,
    roughness: .80,
  });
  const seeds = new THREE.InstancedMesh(geometry, material, positions.length);
  seeds.name = `experiment-three-seed-bed-${group}`;
  seeds.castShadow = true;
  seeds.receiveShadow = true;
  const dummy = new THREE.Object3D();
  positions.forEach((position, index) => {
    dummy.position.set(position.x, .49 + position.layer * .276, position.z);
    dummy.rotation.set((index % 7) * .11, (index * .73) % Math.PI, ((index + position.layer) % 5) * .09);
    dummy.scale.set(.155, .105, .125);
    dummy.updateMatrix();
    seeds.setMatrixAt(index, dummy.matrix);
  });
  seeds.instanceMatrix.needsUpdate = true;
  const setFillProgress = progress => {
    seeds.count = Math.round(positions.length * THREE.MathUtils.clamp(progress, 0, 1));
    seeds.visible = seeds.count > 0;
  };
  seeds.userData = {type: 'seed-bed', group, capacity: positions.length, fillFraction: .5, setFillProgress};
  setFillProgress(0);
  return seeds;
}
