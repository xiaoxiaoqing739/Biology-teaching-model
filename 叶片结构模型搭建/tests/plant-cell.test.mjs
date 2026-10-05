import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {createPlantCell} from '../js/plant-cell-model.js';

const cases = [
  {width: 5.2, height: 1.2, depth: 2.7, boxiness: 0.78, irregularity: 0.06, chloroplastCount: 0},
  {width: 1.8, height: 5.3, depth: 1.8, boxiness: 0.6, irregularity: 0.04, chloroplastCount: 24},
  {width: 3, height: 3, depth: 3, boxiness: 0, irregularity: 0, chloroplastCount: 10},
  {shapeType: 'irregular', width: 3.8, height: 2.8, depth: 3.6, boxiness: 0.2, irregularity: 0.92, chloroplastCount: 10},
  {width: 1.4, height: 0.8, depth: 0.7, chloroplastCount: 48, chloroplastSize: 0.32},
  {width: 7, height: 7, depth: 5, chloroplastCount: 48, chloroplastSize: 0.32},
];

for (const parameters of cases) {
  const cell = createPlantCell(parameters);
  const current = cell.getParameters();
  assert.equal(current.greenStrength, current.chloroplastCount / 48, 'Green strength must follow chloroplast count');
  assert.equal(current.chloroplastSize, 0.18, 'Chloroplast size remains fixed');
  assert.equal(current.showNucleus, true, 'Nucleus remains visible');
  assert.equal(current.showVacuole, true, 'Central vacuole remains visible');
  assert(['regular', 'irregular'].includes(current.shapeType));
  assert.equal(cell.root.userData.shapeType, current.shapeType);
  const bounds = cell.getLocalBounds();
  const hitbox = cell.root.getObjectByName('InteractionHitbox');
  assert(hitbox, 'Every cell needs an interaction hitbox');
  assert.equal(hitbox.userData.interactionRole, 'drag-target');

  assert.equal(cell.anchors.left.position.x, -current.width * 0.5);
  assert.equal(cell.anchors.right.position.x, current.width * 0.5);
  assert.equal(cell.anchors.top.position.y, current.height * 0.5);
  assert.equal(cell.anchors.bottom.position.y, -current.height * 0.5);
  assert.equal(cell.anchors.front.position.z, current.depth * 0.5);
  assert.equal(cell.anchors.back.position.z, -current.depth * 0.5);

  const chloroplasts = cell.root.getObjectByName('Chloroplasts');
  if (current.chloroplastCount === 0) {
    assert.equal(chloroplasts, undefined);
  } else {
    assert.equal(chloroplasts.count, current.chloroplastCount);
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    for (let index = 0; index < chloroplasts.count; index += 1) {
      chloroplasts.getMatrixAt(index, matrix);
      matrix.decompose(position, quaternion, scale);
      const radius = Math.max(scale.x, scale.y, scale.z);
      assert(position.x - radius >= bounds.min.x && position.x + radius <= bounds.max.x, 'Chloroplast must remain inside the cell width');
      assert(position.y - radius >= bounds.min.y && position.y + radius <= bounds.max.y, 'Chloroplast must remain inside the cell height');
      assert(position.z - radius >= bounds.min.z && position.z + radius <= bounds.max.z, 'Chloroplast must remain inside the cell depth');
    }
  }

  const saved = cell.serialize();
  const clone = cell.clone();
  assert.deepEqual(clone.getParameters(), saved.parameters);
  assert.notEqual(clone.root, cell.root);
  clone.dispose();
  cell.dispose();
}

console.log('PASS: plant cell parameters, anchors, hitbox, chloroplast containment, serialization, and independent cloning.');
