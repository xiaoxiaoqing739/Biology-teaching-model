import * as THREE from '../vendor/three.module.js';
import {createPlantCell} from './plant-cell-model.js?v=4';
import {createPavementCell} from './pavement-cell-model.js?v=2';
import {
  clampStomaCount,
  distributedStomaSlots,
  epidermisDimensions,
  gridCellCenter,
  mosaicCellOutline,
  normalizeLayoutMode,
} from './epidermis-layout.js?v=2';

const DEFAULTS = Object.freeze({
  columns: 9,
  rows: 6,
  cellWidth: 1.45,
  layerThickness: 0.58,
  gap: 0.035,
  layoutMode: 'mosaic',
  stomaSlotCount: 6,
  chloroplastCount: 0,
  colorContrast: 1,
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function createLowerEpidermis(initialParameters = {}) {
  const root = new THREE.Group();
  root.name = 'LowerEpidermis';
  root.userData.modelType = 'lower-epidermis';
  root.userData.modelVersion = 2;

  const tissue = new THREE.Group();
  tissue.name = 'OrdinaryEpidermalCells';
  root.add(tissue);

  const anchors = {};
  for (const name of ['left', 'right', 'topSurface', 'bottomSurface', 'front', 'back', 'center']) {
    const anchor = new THREE.Object3D();
    anchor.name = `Anchor_${name}`;
    anchor.userData.anchorType = name;
    anchors[name] = anchor;
    root.add(anchor);
  }

  let parameters = {...DEFAULTS, ...initialParameters};
  let cells = [];
  let stomaSlots = [];
  let hitbox = null;

  function normalize(next) {
    const columns = Math.round(clamp(Number(next.columns), 4, 9));
    const rows = Math.round(clamp(Number(next.rows), 3, 6));
    return {
      columns,
      rows,
      cellWidth: clamp(Number(next.cellWidth), 1.05, 2.1),
      layerThickness: clamp(Number(next.layerThickness), 0.38, 1.05),
      gap: clamp(Number(next.gap), 0.015, 0.12),
      layoutMode: normalizeLayoutMode(next.layoutMode),
      stomaSlotCount: clampStomaCount(next.stomaSlotCount, 0, 10, rows, columns),
      chloroplastCount: Math.round(clamp(Number(next.chloroplastCount), 0, 24)),
      colorContrast: clamp(Number(next.colorContrast ?? 1), 0.6, 3),
    };
  }

  function dimensions() {
    return epidermisDimensions(parameters);
  }

  function clear() {
    for (const cell of cells) {
      tissue.remove(cell.root);
      cell.dispose();
    }
    cells = [];
    for (const slot of stomaSlots) root.remove(slot);
    stomaSlots = [];
    if (hitbox) {
      root.remove(hitbox);
      hitbox.geometry.dispose();
      hitbox.material.dispose();
      hitbox = null;
    }
  }

  function updateAnchors(size) {
    anchors.left.position.set(-size.width * 0.5, 0, 0);
    anchors.right.position.set(size.width * 0.5, 0, 0);
    anchors.topSurface.position.set(0, size.height * 0.5, 0);
    anchors.bottomSurface.position.set(0, -size.height * 0.5, 0);
    anchors.front.position.set(0, 0, size.depth * 0.5);
    anchors.back.position.set(0, 0, -size.depth * 0.5);
    anchors.center.position.set(0, 0, 0);
  }

  function rebuild() {
    parameters = normalize(parameters);
    clear();
    const size = dimensions();
    for (let row = 0; row < parameters.rows; row += 1) {
      for (let column = 0; column < parameters.columns; column += 1) {
        const {x, z} = gridCellCenter(parameters, row, column);
        const cell = parameters.layoutMode === 'mosaic'
          ? createPavementCell({
            outline: mosaicCellOutline(parameters, row, column),
            thickness: parameters.layerThickness,
            chloroplastCount: parameters.chloroplastCount,
            colorContrast: parameters.colorContrast,
            seed: row * parameters.columns + column + 101,
          })
          : createPlantCell({
            width: parameters.cellWidth,
            height: parameters.layerThickness,
            depth: size.cellDepth,
            boxiness: 0.78,
            irregularity: 0.055 + ((row + column) % 2) * 0.018,
            wallOpacity: 0.27 + parameters.chloroplastCount / 24 * 0.49,
            chloroplastCount: parameters.chloroplastCount,
            colorContrast: parameters.colorContrast,
          });
        cell.root.position.set(x, 0, z);
        cell.root.userData.tissueIndex = {row, column};
        cell.root.userData.parentTissue = root;
        tissue.add(cell.root);
        cells.push(cell);
      }
    }

    for (const slotData of distributedStomaSlots(parameters, parameters.stomaSlotCount, 4207)) {
      const slot = new THREE.Object3D();
      slot.name = `StomaSlot_${stomaSlots.length + 1}`;
      slot.position.set(slotData.x, 0, slotData.z);
      slot.userData.anchorType = 'stoma-slot';
      slot.userData.surface = 'lower';
      slot.userData.slotIndex = stomaSlots.length;
      slot.userData.gridPosition = {row: slotData.row, column: slotData.column};
      slot.userData.rotationY = slotData.rotation;
      slot.userData.recommendedFootprint = {
        width: parameters.cellWidth * 0.9,
        depth: size.cellDepth * 0.82,
      };
      root.add(slot);
      stomaSlots.push(slot);
    }

    hitbox = new THREE.Mesh(
      new THREE.BoxGeometry(size.width * 1.03, size.height * 1.32, size.depth * 1.03),
      new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false}),
    );
    hitbox.name = 'InteractionHitbox';
    hitbox.userData.selectRoot = root;
    hitbox.userData.interactionRole = 'drag-target';
    root.add(hitbox);
    updateAnchors(size);
    root.userData.parameters = {...parameters};
    root.userData.cellCount = cells.length;
    root.userData.stomaSlotCount = stomaSlots.length;
  }

  const api = {
    root,
    anchors,
    getCells: () => [...cells],
    getStomaSlots: () => [...stomaSlots],
    getParameters: () => ({...parameters}),
    setParameters(nextParameters) {
      parameters = {...parameters, ...nextParameters};
      rebuild();
      return api;
    },
    getLocalBounds() {
      const size = dimensions();
      return new THREE.Box3(
        new THREE.Vector3(-size.width * 0.5, -size.height * 0.5, -size.depth * 0.5),
        new THREE.Vector3(size.width * 0.5, size.height * 0.5, size.depth * 0.5),
      );
    },
    serialize() {
      return {
        type: root.userData.modelType,
        version: root.userData.modelVersion,
        parameters: {...parameters},
        stomaSlots: stomaSlots.map((slot) => ({
          position: slot.position.toArray(),
          gridPosition: {...slot.userData.gridPosition},
          rotationY: slot.userData.rotationY,
          surface: 'lower',
        })),
        transform: {
          position: root.position.toArray(),
          quaternion: root.quaternion.toArray(),
          scale: root.scale.toArray(),
        },
      };
    },
    clone() {
      const clone = createLowerEpidermis(parameters);
      clone.root.position.copy(root.position);
      clone.root.quaternion.copy(root.quaternion);
      clone.root.scale.copy(root.scale);
      return clone;
    },
    detachCells() {
      return cells.map((cell) => cell.clone());
    },
    dispose() {
      clear();
    },
  };

  root.userData.modelAPI = api;
  rebuild();
  return api;
}

export const LOWER_EPIDERMIS_DEFAULTS = DEFAULTS;
