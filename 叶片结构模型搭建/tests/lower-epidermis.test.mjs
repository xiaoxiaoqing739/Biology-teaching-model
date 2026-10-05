import assert from 'node:assert/strict';
import {createLowerEpidermis} from '../js/lower-epidermis-model.js';

for (const parameters of [
  {columns: 9, rows: 6, layoutMode: 'mosaic', stomaSlotCount: 6, chloroplastCount: 0},
  {columns: 4, rows: 3, layoutMode: 'regular', stomaSlotCount: 1, chloroplastCount: 5},
  {columns: 9, rows: 6, layoutMode: 'mosaic', stomaSlotCount: 10, chloroplastCount: 18},
]) {
  const epidermis = createLowerEpidermis(parameters);
  const current = epidermis.getParameters();
  const cells = epidermis.getCells();
  const slots = epidermis.getStomaSlots();
  assert.equal(slots.length, current.stomaSlotCount);
  assert.equal(cells.length, current.columns * current.rows, 'Stomata no longer replace whole epidermal cells');
  assert(cells.every((cell) => cell.root.position.y === 0));
  assert(cells.every((cell) => cell.getParameters().chloroplastCount === current.chloroplastCount));
  assert(slots.every((slot) => slot.userData.anchorType === 'stoma-slot'));
  assert(slots.every((slot) => slot.userData.surface === 'lower'));
  assert(slots.every((slot) => slot.userData.recommendedFootprint.width > 0));
  assert.equal(new Set(slots.map(slot => slot.position.toArray().join(':'))).size, slots.length);
  assert(slots.every(slot => Number.isFinite(slot.userData.rotationY)));
  if (current.layoutMode === 'mosaic') assert(cells.every(cell => cell.root.userData.cellRole === 'pavement-cell'));
  assert(epidermis.root.getObjectByName('InteractionHitbox'));

  const serialized = epidermis.serialize();
  assert.equal(serialized.stomaSlots.length, slots.length);
  const clone = epidermis.clone();
  assert.deepEqual(clone.getParameters(), current);
  assert.notEqual(clone.root, epidermis.root);
  clone.dispose();
  epidermis.dispose();
}

console.log('PASS: lower epidermis regular/mosaic layout, 0–10 stomata, anchors, clone, and serialization.');

const lowerMinimum = createLowerEpidermis({stomaSlotCount: 0});
assert.equal(lowerMinimum.getParameters().stomaSlotCount, 0, 'Lower epidermis supports zero stomata');
assert.equal(lowerMinimum.getStomaSlots().length, 0);
lowerMinimum.dispose();
