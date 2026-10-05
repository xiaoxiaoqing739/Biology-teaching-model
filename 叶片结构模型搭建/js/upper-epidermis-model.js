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
  cellWidth: 1.55,
  layerThickness: 0.58,
  gap: 0.035,
  layoutMode: 'mosaic',
  stomaSlotCount: 1,
  chloroplastCount: 0,
  colorContrast: 1,
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function createUpperEpidermis(initialParameters = {}) {
  const root = new THREE.Group();
  root.name = 'UpperEpidermis';
  root.userData.modelType = 'upper-epidermis';
  root.userData.modelVersion = 2;

  const tissue = new THREE.Group();
  tissue.name = 'EpidermalCells';
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
    const columns = Math.round(clamp(Number(next.columns), 3, 9));
    const rows = Math.round(clamp(Number(next.rows), 2, 6));
    return {
      columns,
      rows,
      cellWidth: clamp(Number(next.cellWidth), 1.1, 2.2),
      layerThickness: clamp(Number(next.layerThickness), 0.38, 1.05),
      gap: clamp(Number(next.gap), 0.015, 0.12),
      layoutMode: normalizeLayoutMode(next.layoutMode),
      stomaSlotCount: clampStomaCount(next.stomaSlotCount, 0, 3, rows, columns),
      chloroplastCount: Math.round(clamp(Number(next.chloroplastCount), 0, 24)),
      colorContrast: clamp(Number(next.colorContrast ?? 1), 0.6, 3),
    };
  }

  function clearTissue() {
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

  function getDimensions() {
    return epidermisDimensions(parameters);
  }

  function updateAnchors(dimensions) {
    anchors.left.position.set(-dimensions.width * 0.5, 0, 0);
    anchors.right.position.set(dimensions.width * 0.5, 0, 0);
    anchors.topSurface.position.set(0, dimensions.height * 0.5, 0);
    anchors.bottomSurface.position.set(0, -dimensions.height * 0.5, 0);
    anchors.front.position.set(0, 0, dimensions.depth * 0.5);
    anchors.back.position.set(0, 0, -dimensions.depth * 0.5);
    anchors.center.position.set(0, 0, 0);
  }

  function rebuild() {
    parameters = normalize(parameters);
    clearTissue();
    const dimensions = getDimensions();
    for (let row = 0; row < parameters.rows; row += 1) {
      for (let column = 0; column < parameters.columns; column += 1) {
        const {x, z} = gridCellCenter(parameters, row, column);
        const cell = parameters.layoutMode === 'mosaic'
          ? createPavementCell({
            outline: mosaicCellOutline(parameters, row, column),
            thickness: parameters.layerThickness,
            chloroplastCount: parameters.chloroplastCount,
            colorContrast: parameters.colorContrast,
            seed: row * parameters.columns + column + 1,
          })
          : createPlantCell({
            width: parameters.cellWidth,
            height: parameters.layerThickness,
            depth: dimensions.cellDepth,
            boxiness: 0.82,
            irregularity: 0.05 + ((row + column) % 3) * 0.015,
            wallOpacity: 0.28 + parameters.chloroplastCount / 24 * 0.48,
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

    for (const slotData of distributedStomaSlots(parameters, parameters.stomaSlotCount, 1901)) {
      const slot = new THREE.Object3D();
      slot.name = `UpperStomaSlot_${stomaSlots.length + 1}`;
      slot.position.set(slotData.x, 0, slotData.z);
      slot.userData.anchorType = 'stoma-slot';
      slot.userData.surface = 'upper';
      slot.userData.slotIndex = stomaSlots.length;
      slot.userData.gridPosition = {row: slotData.row, column: slotData.column};
      slot.userData.rotationY = slotData.rotation;
      slot.userData.recommendedFootprint = {width: parameters.cellWidth * 0.92, depth: dimensions.cellDepth * 0.86};
      root.add(slot);
      stomaSlots.push(slot);
    }

    hitbox = new THREE.Mesh(
      new THREE.BoxGeometry(dimensions.width * 1.03, dimensions.height * 1.32, dimensions.depth * 1.03),
      new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false}),
    );
    hitbox.name = 'InteractionHitbox';
    hitbox.userData.selectRoot = root;
    hitbox.userData.interactionRole = 'drag-target';
    root.add(hitbox);

    updateAnchors(dimensions);
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
      const {width, height, depth} = getDimensions();
      return new THREE.Box3(
        new THREE.Vector3(-width * 0.5, -height * 0.5, -depth * 0.5),
        new THREE.Vector3(width * 0.5, height * 0.5, depth * 0.5),
      );
    },
    serialize() {
      return {
        type: root.userData.modelType,
        version: root.userData.modelVersion,
        parameters: {...parameters},
        stomaSlots: stomaSlots.map(slot => ({
          position: slot.position.toArray(),
          gridPosition: {...slot.userData.gridPosition},
          rotationY: slot.userData.rotationY,
          surface: 'upper',
        })),
        transform: {
          position: root.position.toArray(),
          quaternion: root.quaternion.toArray(),
          scale: root.scale.toArray(),
        },
      };
    },
    clone() {
      const clone = createUpperEpidermis(parameters);
      clone.root.position.copy(root.position);
      clone.root.quaternion.copy(root.quaternion);
      clone.root.scale.copy(root.scale);
      return clone;
    },
    detachCells() {
      return cells.map((cell) => cell.clone());
    },
    dispose() {
      clearTissue();
    },
  };

  root.userData.modelAPI = api;
  rebuild();
  return api;
}

export const UPPER_EPIDERMIS_DEFAULTS = DEFAULTS;
