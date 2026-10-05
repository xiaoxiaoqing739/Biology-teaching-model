import assert from 'node:assert/strict';
import {createUpperEpidermis} from '../js/upper-epidermis-model.js';

const cases = [
  {columns: 9, rows: 6, cellWidth: 1.55, layerThickness: 0.58, layoutMode: 'mosaic', stomaSlotCount: 1, chloroplastCount: 0},
  {columns: 3, rows: 2, cellWidth: 1.1, layerThickness: 0.38, layoutMode: 'regular', stomaSlotCount: 2, chloroplastCount: 12},
  {columns: 8, rows: 5, cellWidth: 2.2, layerThickness: 1.05, layoutMode: 'mosaic', stomaSlotCount: 3, chloroplastCount: 24},
];

for (const parameters of cases) {
  const epidermis = createUpperEpidermis(parameters);
  const current = epidermis.getParameters();
  const cells = epidermis.getCells();
  const slots = epidermis.getStomaSlots();
  assert.equal(slots.length, current.stomaSlotCount, 'Upper epidermis keeps 1–3 stomatal slots');
  assert.equal(cells.length, current.columns * current.rows, 'Stomata no longer replace whole epidermal cells');
  assert(cells.every((cell) => cell.root.position.y === 0), 'Upper epidermis remains a single layer');
  assert(cells.every((cell) => cell.getParameters().chloroplastCount === current.chloroplastCount), 'Chloroplast setting reaches every cell');
  assert(slots.every((slot) => slot.userData.surface === 'upper'));
  assert.equal(new Set(slots.map(slot => slot.position.toArray().join(':'))).size, slots.length);
  assert(slots.every(slot => Number.isFinite(slot.userData.rotationY)), 'Each stoma has a stable orientation');
  if (current.layoutMode === 'mosaic') assert(cells.every(cell => cell.root.userData.cellRole === 'pavement-cell'));
  assert(epidermis.root.getObjectByName('InteractionHitbox'), 'Tissue needs its own interaction hitbox');

  const bounds = epidermis.getLocalBounds();
  assert.equal(epidermis.anchors.left.position.x, bounds.min.x);
  assert.equal(epidermis.anchors.right.position.x, bounds.max.x);
  assert.equal(epidermis.anchors.topSurface.position.y, bounds.max.y);
  assert.equal(epidermis.anchors.bottomSurface.position.y, bounds.min.y);
  assert.equal(epidermis.anchors.front.position.z, bounds.max.z);
  assert.equal(epidermis.anchors.back.position.z, bounds.min.z);

  const detached = epidermis.detachCells();
  assert.equal(detached.length, cells.length, 'Every tissue cell can be detached as an independent clone');
  assert(detached.every((cell, index) => cell.root !== cells[index].root));
  detached.forEach((cell) => cell.dispose());

  const clone = epidermis.clone();
  assert.deepEqual(clone.getParameters(), current);
  assert.notEqual(clone.root, epidermis.root);
  assert.deepEqual(epidermis.serialize().parameters, current);
  assert.equal(epidermis.serialize().stomaSlots.length, slots.length);
  clone.dispose();
  epidermis.dispose();
}

console.log('PASS: upper epidermis regular/mosaic layout, 0–3 stomata, anchors, clone, and serialization.');

const upperMinimum = createUpperEpidermis({stomaSlotCount: 0});
assert.equal(upperMinimum.getParameters().stomaSlotCount, 0, 'Upper epidermis supports zero stomata');
assert.equal(upperMinimum.getStomaSlots().length, 0);
upperMinimum.dispose();
