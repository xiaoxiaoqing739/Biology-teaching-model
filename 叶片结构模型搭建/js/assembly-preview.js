import * as THREE from '../vendor/three.module.js';
import {createPlantCell} from './plant-cell-model.js?v=5';
import {createUpperEpidermis} from './upper-epidermis-model.js?v=5';
import {createLowerEpidermis} from './lower-epidermis-model.js?v=5';
import {createStoma} from './stoma-model.js?v=4';
import {createLeafVein} from './leaf-vein-model.js?v=8';
import {advanceGasParticleProgress, apertureLabel, apertureToRelativeFlux, gasParticleIsActive, poreLaneOffset} from './stoma-interaction.js?v=3';

const GRID = Object.freeze({rows: 6, columns: 9, cellWidth: 1.55, gap: 0.035, thickness: 0.52});
const clone = value => JSON.parse(JSON.stringify(value));
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const host = document.querySelector('#model-stage');
const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
host.append(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x102128);
scene.add(new THREE.HemisphereLight(0xebfff4, 0x13242b, 2.55));
const key = new THREE.DirectionalLight(0xffffff, 3.2); key.position.set(7, 11, 9); scene.add(key);
const fill = new THREE.DirectionalLight(0x84c7ff, 1.05); fill.position.set(-7, 4, -5); scene.add(fill);
const camera = new THREE.PerspectiveCamera(37, 1, .05, 180);
let yaw = -.58, pitch = .38, distance = 25, orbiting = false, previousX = 0, previousY = 0;
const assembly = new THREE.Group(); scene.add(assembly);
const interactionEffects = new THREE.Group(); interactionEffects.name = 'InteractionEffects'; assembly.add(interactionEffects);
const grid = new THREE.GridHelper(32, 32, 0x46636b, 0x243d44); grid.position.y = -5; scene.add(grid);

let upperApi = null, lowerApi = null, veinApi = null, stomaApis = [], tissueLayers = [], layerSpecs = [];
let surfacesInstalled = false, surfaceY = 1, randomSeed = 1729;
let appMode = 'edit', interactionPlaying = false, interactionTime = 0, interactionSpeed = 1, lastStomaUpdate = -1;
let stomaAperture = 1, targetStomaAperture = 1, lastApertureLabel = '';
let waterParticles = [], sugarParticles = [], gasParticles = [], viewTransition = null;
const lookTarget = new THREE.Vector3();
const history = [];

function setWorkflowStage(stage) {
  document.querySelectorAll('[data-stage-step]').forEach(item => item.classList.toggle('is-active', item.dataset.stageStep === stage));
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; };
}

function cellParameters() {
  return {
    shape: document.querySelector('#cell-shape').value,
    width: Number(document.querySelector('#cell-width').value),
    height: Number(document.querySelector('#cell-height').value),
    chloroplastCount: Number(document.querySelector('#chloroplast-count').value),
  };
}

function configuration() {
  return {
    upperStomaCount: Number(document.querySelector('#upper-stoma-count').value),
    lowerStomaCount: Number(document.querySelector('#lower-stoma-count').value),
    upperLayoutMode: document.querySelector('#upper-layout-mode').value,
    lowerLayoutMode: document.querySelector('#lower-layout-mode').value,
    upperChloroplastCount: Number(document.querySelector('#upper-chloroplast-count').value),
    lowerChloroplastCount: Number(document.querySelector('#lower-chloroplast-count').value),
    fillMode: document.querySelector('#fill-mode').value,
    density: Number(document.querySelector('#fill-density').value) / 100,
    veinSize: document.querySelector('#vein-size').value,
    cell: cellParameters(),
  };
}

function fittedDimensions(parameters, scale = 1) {
  const maxWidth = GRID.cellWidth - .2;
  const maxDepth = GRID.cellWidth * .84 - .2;
  let width = Math.min(parameters.width * scale, maxWidth);
  if (parameters.shape === 'sphere') width = Math.min(width, maxDepth);
  const height = parameters.shape === 'sphere' ? width : parameters.height;
  const desiredDepth = parameters.shape === 'flat' ? width * .72 : parameters.shape === 'column' ? width * .82 : parameters.shape === 'irregular' ? width * .95 : width;
  return {width, height, depth: Math.min(desiredDepth, maxDepth)};
}

function makeCell(parameters, scale = 1) {
  const dimensions = fittedDimensions(parameters, scale);
  return createPlantCell({
    ...dimensions,
    shapeType: parameters.shape === 'irregular' ? 'irregular' : 'regular',
    boxiness: parameters.shape === 'sphere' ? .05 : parameters.shape === 'column' ? .7 : parameters.shape === 'irregular' ? .2 : .48,
    irregularity: parameters.shape === 'irregular' ? .92 : .05,
    chloroplastCount: parameters.chloroplastCount,
    colorContrast: 2.35,
  });
}

function disposeSurfaces() {
  stomaApis.forEach(api => api.dispose()); stomaApis = [];
  if (upperApi) { assembly.remove(upperApi.root); upperApi.dispose(); upperApi = null; }
  if (lowerApi) { assembly.remove(lowerApi.root); lowerApi.dispose(); lowerApi = null; }
}

function disposeVein() {
  if (!veinApi) return;
  assembly.remove(veinApi.root); veinApi.dispose(); veinApi = null;
}

function disposeLayer(layer) { assembly.remove(layer.group); layer.cells.forEach(cell => cell.dispose()); }

function clearLayers(recordHistory = true) {
  if (!layerSpecs.length) return updateState('当前没有可清除的中间组织', true);
  if (recordHistory) pushHistory();
  layerSpecs = [];
  rebuildAssembly('中间组织已清除');
}

function layoutFor(config, specs = layerSpecs) {
  const heights = specs.map(spec => fittedDimensions(spec.cell).height);
  const tissueHeight = heights.reduce((sum, height) => sum + height, 0) + Math.max(0, heights.length - 1) * .12;
  const veinHeight = config.veinSize === 'none' ? 0 : 1.62 * Number(config.veinSize);
  let interiorHeight;
  if (!specs.length && config.veinSize === 'none') interiorHeight = 0;
  else if (!specs.length) interiorHeight = veinHeight + .18;
  else interiorHeight = Math.max(tissueHeight, veinHeight) + .28;
  const positions = [];
  let cursor = interiorHeight * .5;
  heights.forEach(height => { positions.push(cursor - height * .5); cursor -= height + .12; });
  return {heights, positions, interiorHeight, surfaceY: (interiorHeight + GRID.thickness) * .5};
}

function rebuildSurfaces(config, nextSurfaceY) {
  disposeSurfaces();
  const common = {rows: GRID.rows, columns: GRID.columns, cellWidth: GRID.cellWidth, gap: GRID.gap, layerThickness: GRID.thickness, colorContrast: 2.6};
  upperApi = createUpperEpidermis({...common, layoutMode: config.upperLayoutMode, stomaSlotCount: config.upperStomaCount, chloroplastCount: config.upperChloroplastCount});
  lowerApi = createLowerEpidermis({...common, layoutMode: config.lowerLayoutMode, stomaSlotCount: config.lowerStomaCount, chloroplastCount: config.lowerChloroplastCount});
  surfaceY = nextSurfaceY;
  upperApi.root.position.y = surfaceY;
  lowerApi.root.position.y = -surfaceY;
  assembly.add(upperApi.root, lowerApi.root);
  const installStomata = (surfaceApi, side) => {
    for (const slot of surfaceApi.getStomaSlots()) {
      const api = createStoma({aperture: .5, guardCellSize: .72, chloroplastCount: 6});
      const footprint = api.getMountFootprint();
      const target = slot.userData.recommendedFootprint;
      const scale = Math.min(target.width / footprint.width, target.depth / footprint.depth) * .92;
      api.root.scale.setScalar(scale);
      api.root.rotation.y = slot.userData.rotationY || 0;
      api.root.position.copy(slot.position);
      api.root.position.y = side * GRID.thickness * .52;
      api.root.userData.surface = side > 0 ? 'upper' : 'lower';
      surfaceApi.root.add(api.root);
      stomaApis.push(api);
    }
  };
  installStomata(upperApi, 1);
  installStomata(lowerApi, -1);
  surfacesInstalled = true;
}

function installVein(config) {
  disposeVein();
  if (config.veinSize === 'none') return;
  const size = Number(config.veinSize);
  veinApi = createLeafVein({veinSize: size, xylemCount: 7, phloemCount: 7});
  const surfaceWidth = GRID.columns * GRID.cellWidth + (GRID.columns - 1) * GRID.gap;
  veinApi.root.scale.x = surfaceWidth / (5.2 * size);
  veinApi.root.position.set(0, 0, 0);
  assembly.add(veinApi.root);
}

function veinBlocksCell(config, x, y, z, dimensions) {
  if (config.veinSize === 'none') return false;
  const size = Number(config.veinSize);
  const renderedLength = GRID.columns * GRID.cellWidth + (GRID.columns - 1) * GRID.gap;
  return Math.abs(x) < renderedLength * .5 + dimensions.width * .5 + .06
    && Math.abs(y) < 1.62 * size * .5 + dimensions.height * .5 + .05
    && Math.abs(z) < 1.55 * size * .5 + dimensions.depth * .5 + .06;
}

function clearInteractionEffects() {
  const geometries = new Set(), materials = new Set();
  interactionEffects.traverse(child => {
    if (child.geometry) geometries.add(child.geometry);
    if (child.material) (Array.isArray(child.material) ? child.material : [child.material]).forEach(material => materials.add(material));
  });
  interactionEffects.clear();
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
  waterParticles = []; sugarParticles = []; gasParticles = [];
}

function effectParticle(color, radius = .075) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 14, 10),
    new THREE.MeshBasicMaterial({color, transparent: true, opacity: .96, depthTest: true, depthWrite: false}),
  );
  interactionEffects.add(mesh);
  return mesh;
}

function buildInteractionEffects() {
  clearInteractionEffects();
  const width = GRID.columns * GRID.cellWidth + (GRID.columns - 1) * GRID.gap;
  const veinSize = Number(configuration().veinSize);
  for (let index = 0; index < 24; index += 1) {
    const mesh = effectParticle(0x2aaeff, .105);
    waterParticles.push({mesh, phase: index / 24, y: veinSize * (.24 + (index % 2) * .16), z: veinSize * (-.42 + (index % 4) * .28)});
  }
  for (let index = 0; index < 22; index += 1) {
    const mesh = effectParticle(0xff9638, .1);
    sugarParticles.push({mesh, phase: index / 22, y: -veinSize * (.24 + (index % 2) * .13), z: veinSize * (-.4 + (index % 4) * .27)});
  }
  const stomatalSurfaces = [
    {api: upperApi, side: 1},
    {api: lowerApi, side: -1},
  ].filter(entry => entry.api);
  let globalSlotIndex = 0;
  for (const surface of stomatalSurfaces) {
    surface.api.getStomaSlots().forEach((slot) => {
      const gases = [
        {type: 'co2', inward: true, color: 0x5ee08b},
        {type: 'oxygen', inward: false, color: 0xa790ff},
        {type: 'vapor', inward: false, color: 0x8befff},
      ];
      gases.forEach((gas, gasIndex) => {
        for (let index = 0; index < 2; index += 1) {
          const mesh = effectParticle(gas.color, gas.type === 'vapor' ? .065 : .072);
          gasParticles.push({
            mesh,
            type: gas.type,
            inward: gas.inward,
            phase: (index * .5 + gasIndex * .19 + globalSlotIndex * .13) % 1,
            progress: (index * .5 + gasIndex * .19 + globalSlotIndex * .13) % 1,
            activation: index === 0 ? .16 : .66,
            lane: index === 0 ? -.42 : .42,
            zOffset: (gasIndex - 1) * .09,
            slotX: slot.position.x,
            slotZ: slot.position.z,
            slotRotation: slot.userData.rotationY || 0,
            poreSpan: slot.userData.recommendedFootprint.width * .3,
            outsideY: surface.side * (surfaceY + .92),
            insideY: surface.side * (surfaceY - .5),
          });
        }
      });
      globalSlotIndex += 1;
    });
  }
  updateInteractionEffects(0, true);
  interactionEffects.visible = true;
  document.querySelector('#interaction-state').textContent = '正在同步演示';
  return width;
}

function updateApertureReadout() {
  const label = apertureLabel(targetStomaAperture);
  const text = `${Math.round(targetStomaAperture * 100)}% · ${label}`;
  if (text === lastApertureLabel) return;
  lastApertureLabel = text;
  document.querySelector('#stoma-aperture-value').textContent = text;
  document.querySelectorAll('[data-aperture]').forEach(button => {
    button.classList.toggle('is-active', Number(button.dataset.aperture) === Math.round(targetStomaAperture * 100));
  });
}

function setTargetStomaAperture(percent) {
  targetStomaAperture = clamp(Number(percent) / 100, 0, 1);
  document.querySelector('#stoma-aperture').value = Math.round(targetStomaAperture * 100);
  updateApertureReadout();
}

function updateInteractionEffects(time, forceStoma = false, delta = 0, particleDelta = 0) {
  const width = GRID.columns * GRID.cellWidth + (GRID.columns - 1) * GRID.gap;
  const half = width * .5;
  waterParticles.forEach(particle => {
    const progress = (particle.phase + time * .115) % 1;
    particle.mesh.position.set(-half + progress * width, particle.y, particle.z);
  });
  sugarParticles.forEach(particle => {
    const progress = (particle.phase + time * .09) % 1;
    particle.mesh.position.set(half - progress * width, particle.y, particle.z);
  });
  if (forceStoma) stomaAperture = targetStomaAperture;
  else stomaAperture = THREE.MathUtils.damp(stomaAperture, targetStomaAperture, 1.15, delta);
  const relativeFlux = apertureToRelativeFlux(stomaAperture);
  if (forceStoma || time - lastStomaUpdate > .12 || Math.abs(stomaAperture - targetStomaAperture) > .002) {
    stomaApis.forEach(api => api.setAperture(stomaAperture));
    lastStomaUpdate = time;
  }
  gasParticles.forEach(particle => {
    const shouldBeActive = gasParticleIsActive(relativeFlux, particle.activation);
    if (particle.active === undefined || forceStoma) particle.active = shouldBeActive;
    const movement = advanceGasParticleProgress(particle.progress, particleDelta, relativeFlux, interactionSpeed);
    particle.progress = movement.progress;
    // 通量变化只在粒子完成一次穿行后生效，避免中途突然出现或消失。
    if (movement.wrapped) particle.active = shouldBeActive;
    particle.mesh.visible = particle.active;
    if (!particle.active) return;
    const progress = particle.progress;
    const localX = poreLaneOffset(stomaAperture, particle.lane, particle.poreSpan);
    const cos = Math.cos(particle.slotRotation);
    const sin = Math.sin(particle.slotRotation);
    const x = particle.slotX + cos * localX + sin * particle.zOffset;
    const z = particle.slotZ - sin * localX + cos * particle.zOffset;
    particle.mesh.position.set(
      x,
      particle.inward
        ? THREE.MathUtils.lerp(particle.outsideY, particle.insideY, progress)
        : THREE.MathUtils.lerp(particle.insideY, particle.outsideY, progress),
      z,
    );
    particle.mesh.material.opacity = .5 + relativeFlux * .46;
  });
  const currentLabel = apertureLabel(stomaAperture);
  const displayedFlux = stomaAperture >= .99 ? 1 : relativeFlux;
  document.querySelector('#interaction-state').textContent = `${currentLabel} · 相对气体通量 ${Math.round(displayedFlux * 100)}%`;
}

function createLayer(spec, config, y, layerIndex) {
  const group = new THREE.Group();
  group.name = `MesophyllLayer_${layerIndex + 1}`;
  const cells = [];
  const depthStep = GRID.cellWidth * .84 + GRID.gap;
  const widthStep = GRID.cellWidth + GRID.gap;
  const random = seededRandom(spec.seed);
  for (let row = 0; row < GRID.rows; row += 1) {
    for (let column = 0; column < GRID.columns; column += 1) {
      if (spec.fillMode === 'sparse' && random() > spec.density) continue;
      const scale = spec.fillMode === 'sparse' ? .74 + random() * .18 : 1;
      const dimensions = fittedDimensions(spec.cell, scale);
      let x = (column - (GRID.columns - 1) / 2) * widthStep;
      let z = (row - (GRID.rows - 1) / 2) * depthStep;
      if (spec.fillMode === 'sparse') {
        x += (random() - .5) * .18 * widthStep;
        z += (random() - .5) * .18 * depthStep;
      }
      const surfaceHalfWidth = (GRID.columns * GRID.cellWidth + (GRID.columns - 1) * GRID.gap) * .5;
      const surfaceHalfDepth = (GRID.rows * GRID.cellWidth * .84 + (GRID.rows - 1) * GRID.gap) * .5;
      x = clamp(x, -surfaceHalfWidth + dimensions.width * .5 + .08, surfaceHalfWidth - dimensions.width * .5 - .08);
      z = clamp(z, -surfaceHalfDepth + dimensions.depth * .5 + .08, surfaceHalfDepth - dimensions.depth * .5 - .08);
      if (veinBlocksCell(config, x, y, z, dimensions)) continue;
      const cell = makeCell(spec.cell, scale);
      cell.root.position.set(x, 0, z);
      group.add(cell.root); cells.push(cell);
    }
  }
  group.position.y = y;
  assembly.add(group);
  tissueLayers.push({group, cells, spec: clone(spec)});
}

function rebuildAssembly(message = '模型已更新') {
  const config = configuration();
  tissueLayers.forEach(disposeLayer); tissueLayers = [];
  disposeVein();
  const layout = layoutFor(config, layerSpecs);
  rebuildSurfaces(config, layout.surfaceY);
  installVein(config);
  layerSpecs.forEach((spec, index) => createLayer(spec, config, layout.positions[index], index));
  updateState(message);
}

function installSurfacesOnly() {
  pushHistory();
  rebuildAssembly('表皮与叶脉参数已更新');
}

function draftLayerSpec(seed = randomSeed) {
  const config = configuration();
  return {cell: clone(config.cell), fillMode: config.fillMode, density: config.density, seed};
}

function addLayer(isFirst = false) {
  if (isFirst && layerSpecs.length) return updateState('第一层已经存在，请使用“纵向增加一层”', true);
  if (!isFirst && !layerSpecs.length) return updateState('请先铺设第一层', true);
  if (layerSpecs.length >= 6) return updateState('中间组织最多为 6 层', true);
  pushHistory();
  layerSpecs.push(draftLayerSpec());
  randomSeed += 7919;
  const spec = layerSpecs.at(-1);
  rebuildAssembly(`第 ${layerSpecs.length} 层已按${spec.fillMode === 'regular' ? '规律' : '随机'}方式铺设`);
}

function updateLastLayer() {
  if (!layerSpecs.length) return updateState('还没有可更新的中间组织层', true);
  pushHistory();
  layerSpecs[layerSpecs.length - 1] = draftLayerSpec(layerSpecs.at(-1).seed);
  rebuildAssembly('最下层已使用当前参数重新铺设');
}

function removeLayer() {
  if (!layerSpecs.length) return;
  pushHistory();
  layerSpecs.pop();
  rebuildAssembly('已减少最下方一层');
}

function rerandomizeLastLayer() {
  if (!layerSpecs.length || layerSpecs.at(-1).fillMode !== 'sparse') return updateState('最下层不是随机铺设层', true);
  pushHistory();
  layerSpecs.at(-1).seed += 7919;
  rebuildAssembly('最下方随机层已重新排列');
}

function stateRecord() {
  return {
    surfacesInstalled,
    randomSeed,
    upperCellCount: upperApi ? upperApi.getCells().length : 0,
    lowerOrdinaryCellCount: lowerApi ? lowerApi.getCells().length : 0,
    upperStomaCount: upperApi ? upperApi.getStomaSlots().length : 0,
    lowerStomaCount: lowerApi ? lowerApi.getStomaSlots().length : 0,
    surfaceWidth: GRID.columns * GRID.cellWidth + (GRID.columns - 1) * GRID.gap,
    veinRenderedLength: veinApi ? 5.2 * veinApi.getParameters().veinSize * veinApi.root.scale.x : 0,
    config: configuration(),
    layerSpecs: clone(layerSpecs),
  };
}
function setControl(id, value) { document.querySelector(`#${id}`).value = value; }

function applyRecord(record) {
  const c = record.config;
  setControl('upper-stoma-count', c.upperStomaCount ?? 1); setControl('lower-stoma-count', c.lowerStomaCount ?? c.stomaCount ?? 6);
  setControl('upper-layout-mode', c.upperLayoutMode ?? 'mosaic'); setControl('lower-layout-mode', c.lowerLayoutMode ?? 'mosaic');
  setControl('upper-chloroplast-count', c.upperChloroplastCount); setControl('lower-chloroplast-count', c.lowerChloroplastCount);
  setControl('fill-mode', c.fillMode); setControl('fill-density', Math.round(c.density * 100)); setControl('vein-size', c.veinSize);
  setControl('cell-shape', c.cell.shape); setControl('cell-width', c.cell.width); setControl('cell-height', c.cell.height); setControl('chloroplast-count', c.cell.chloroplastCount);
  randomSeed = record.randomSeed;
  layerSpecs = clone(record.layerSpecs || []);
  updateControlLabels(); rebuildPreview();
}

function pushHistory() {
  history.push(stateRecord());
  if (history.length > 20) history.shift();
  document.querySelector('#undo-action').disabled = false;
}

function restore(record) {
  tissueLayers.forEach(disposeLayer); tissueLayers = [];
  disposeVein(); disposeSurfaces(); surfacesInstalled = false;
  applyRecord(record);
  if (record.surfacesInstalled) rebuildAssembly('已撤销上一步操作');
  updateState('已撤销上一步操作');
}

function updateState(message, warning = false) {
  const messageNode = document.querySelector('#assembly-message');
  messageNode.textContent = message; messageNode.classList.toggle('is-warning', warning);
  const count = tissueLayers.reduce((sum, layer) => sum + layer.cells.length, 0);
  document.querySelector('#layer-summary').textContent = `中间组织 ${tissueLayers.length} 行 · ${count} 个细胞${veinApi ? ' · 含叶脉' : ''}`;
  document.querySelector('#current-layer-count').textContent = `当前 ${layerSpecs.length}/6 层`;
  document.querySelector('#fill-first-layer').disabled = layerSpecs.length > 0;
  document.querySelector('#add-layer').disabled = !layerSpecs.length || layerSpecs.length >= 6;
  document.querySelector('#update-last-layer').disabled = !layerSpecs.length;
  document.querySelector('#remove-layer').disabled = !layerSpecs.length;
  document.querySelector('#rerandomize').disabled = !layerSpecs.length || layerSpecs.at(-1).fillMode !== 'sparse';
  document.querySelector('#assembly-data').textContent = JSON.stringify({...stateRecord(), builtCellCount: count, surfaceY}, null, 2);
}

function setView(name) {
  const presets = {
    front: {yaw: 0, pitch: .03, distance: 25, target: new THREE.Vector3(0, 0, 0)},
    overall: {yaw: -.58, pitch: .38, distance: 25, target: new THREE.Vector3(0, 0, 0)},
    vein: {yaw: 0, pitch: .02, distance: 16, target: new THREE.Vector3(0, 0, 0)},
  };
  if (name === 'stoma') {
    const lowerSlot = lowerApi?.getStomaSlots()[0];
    const upperSlot = upperApi?.getStomaSlots()[0];
    const slot = lowerSlot || upperSlot;
    const y = lowerSlot ? -surfaceY : surfaceY;
    presets.stoma = {yaw: 0, pitch: lowerSlot ? 1.22 : -1.22, distance: 7.5, target: new THREE.Vector3(slot?.position.x || 0, y, slot?.position.z || 0)};
  }
  const isolateVein = name === 'vein', isolateStoma = name === 'stoma';
  if (upperApi) upperApi.root.visible = !isolateVein && !isolateStoma;
  if (lowerApi) lowerApi.root.visible = !isolateVein;
  if (veinApi) veinApi.root.visible = !isolateStoma;
  tissueLayers.forEach(layer => { layer.group.visible = !isolateVein && !isolateStoma; });
  waterParticles.forEach(particle => { particle.mesh.visible = !isolateStoma; });
  sugarParticles.forEach(particle => { particle.mesh.visible = !isolateStoma; });
  gasParticles.forEach(particle => { particle.mesh.visible = !isolateVein && particle.active !== false; });
  const preset = presets[name] || presets.overall;
  viewTransition = {yaw: preset.yaw, pitch: preset.pitch, distance: preset.distance, target: preset.target, progress: 0};
  document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('is-active', button.dataset.view === name));
}

function confirmModel() {
  if (!surfacesInstalled) return updateState('请先安装表皮或铺设第一层', true);
  if (!veinApi || !stomaApis.length) return updateState('同步交互需要模型中同时包含叶脉和至少一个气孔', true);
  appMode = 'confirmed';
  document.querySelector('#model-workshop').classList.add('is-locked');
  document.querySelector('#confirm-model').classList.add('is-hidden');
  document.querySelector('#start-interaction').classList.remove('is-hidden');
  document.querySelector('#back-to-edit').classList.remove('is-hidden');
  document.querySelector('#undo-action').disabled = true;
  document.querySelector('#clear-layers').disabled = true;
  setWorkflowStage('confirmed');
  updateState('模型已确认并锁定，请点击“开始交互”');
}

function startInteraction() {
  if (appMode !== 'confirmed') return;
  appMode = 'interacting'; interactionTime = 0; interactionPlaying = true; lastStomaUpdate = -1;
  stomaAperture = targetStomaAperture;
  buildInteractionEffects();
  document.querySelector('#model-workshop').classList.add('is-hidden');
  document.querySelector('#interaction-panel').classList.remove('is-hidden');
  document.querySelector('#interaction-panel').classList.add('is-open');
  document.querySelector('#start-interaction').classList.add('is-hidden');
  document.querySelector('#pause-interaction').textContent = '暂停';
  setWorkflowStage('interacting');
  setView('front');
  updateState('叶脉运输与气孔活动正在同步进行');
}

function backToEdit() {
  interactionPlaying = false; appMode = 'edit';
  clearInteractionEffects();
  stomaApis.forEach(api => api.setAperture(.5));
  document.querySelector('#interaction-panel').classList.add('is-hidden');
  document.querySelector('#interaction-panel').classList.remove('is-open');
  document.querySelector('#model-workshop').classList.remove('is-hidden', 'is-locked');
  document.querySelector('#confirm-model').classList.remove('is-hidden');
  document.querySelector('#start-interaction').classList.add('is-hidden');
  document.querySelector('#back-to-edit').classList.add('is-hidden');
  updateState('已返回模型搭建，可继续修改');
  document.querySelector('#undo-action').disabled = !history.length;
  document.querySelector('#clear-layers').disabled = !layerSpecs.length;
  setWorkflowStage('edit');
  setView('overall');
}

function toggleInteraction() {
  if (appMode !== 'interacting') return;
  interactionPlaying = !interactionPlaying;
  document.querySelector('#pause-interaction').textContent = interactionPlaying ? '暂停' : '继续';
  document.querySelector('#interaction-state').textContent = interactionPlaying ? '正在同步演示' : '演示已暂停';
}

function replayInteraction() {
  if (appMode !== 'interacting') return;
  interactionTime = 0; lastStomaUpdate = -1; interactionPlaying = true;
  gasParticles.forEach(particle => { particle.progress = particle.phase; particle.active = undefined; });
  updateInteractionEffects(0, true);
  document.querySelector('#pause-interaction').textContent = '暂停';
  document.querySelector('#interaction-state').textContent = '正在重新演示';
  setView('front');
}

const previewSvg = document.querySelector('#cell-preview-svg');
function rebuildPreview() {
  const p = cellParameters();
  const widthScale = THREE.MathUtils.mapLinear(p.width, .75, 1.35, .72, 1.08);
  let width = 188 * widthScale, height = THREE.MathUtils.mapLinear(p.height, .7, 2.2, 62, 145);
  if (p.shape === 'column') width = 96 * widthScale;
  if (p.shape === 'sphere') width = height = 124 * widthScale;
  if (p.shape === 'irregular') { width = 168 * widthScale; height *= .92; }
  const x = 160 - width / 2, y = 88 - height / 2;
  const visibleCount = Math.min(p.chloroplastCount, 28), green = clamp(p.chloroplastCount / 30, 0, 1), lightness = Math.round(218 - green * 105);
  const chloroplasts = Array.from({length: visibleCount}, (_, index) => {
    const margin = p.shape === 'irregular' ? .21 : .16;
    const px = x + width * (margin + ((index * 37) % Math.round((1 - margin * 2) * 100)) / 100);
    const py = y + height * (margin + ((index * 53) % Math.round((1 - margin * 2) * 100)) / 100);
    return `<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="5.5" ry="2.8" transform="rotate(${(index * 31) % 180} ${px} ${py})" fill="#247b39" opacity=".94"/>`;
  }).join('');
  const irregularOutline = `M ${x + width * .15} ${y + height * .1} C ${x + width * .34} ${y - height * .04}, ${x + width * .47} ${y + height * .12}, ${x + width * .61} ${y + height * .06} C ${x + width * .83} ${y - height * .01}, ${x + width * .96} ${y + height * .22}, ${x + width * .88} ${y + height * .39} C ${x + width * 1.02} ${y + height * .57}, ${x + width * .83} ${y + height * .72}, ${x + width * .76} ${y + height * .88} C ${x + width * .56} ${y + height * 1.03}, ${x + width * .45} ${y + height * .86}, ${x + width * .31} ${y + height * .96} C ${x + width * .08} ${y + height * 1.02}, ${x + width * .02} ${y + height * .74}, ${x + width * .11} ${y + height * .58} C ${x - width * .02} ${y + height * .42}, ${x + width * .01} ${y + height * .19}, ${x + width * .15} ${y + height * .1} Z`;
  const wall = p.shape === 'irregular'
    ? `<path d="${irregularOutline}" fill="url(#cellFill)" stroke="#d9f0d1" stroke-width="5" opacity=".94" filter="url(#cellShadow)"/><path d="${irregularOutline}" fill="#bce2c2" opacity=".16"/>`
    : `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${p.shape === 'sphere' ? width / 2 : Math.min(30, width * .22)}" fill="url(#cellFill)" stroke="#d9f0d1" stroke-width="5" opacity=".94" filter="url(#cellShadow)"/><rect x="${x + 9}" y="${y + 9}" width="${Math.max(10, width - 18)}" height="${Math.max(10, height - 18)}" rx="${p.shape === 'sphere' ? width / 2 : 20}" fill="#bce2c2" opacity=".2"/>`;
  previewSvg.innerHTML = `<defs><linearGradient id="cellFill" x1="0" y1="0" x2="1" y2="1"><stop stop-color="rgb(${lightness},${Math.min(242, lightness + 22)},${Math.max(80, lightness - 12)})"/><stop offset="1" stop-color="rgb(${Math.max(50, lightness - 48)},${Math.max(90, lightness + 8)},${Math.max(45, lightness - 55)})"/></linearGradient><filter id="cellShadow"><feDropShadow dx="0" dy="7" stdDeviation="6" flood-color="#02090b" flood-opacity=".55"/></filter></defs><ellipse cx="160" cy="165" rx="${Math.max(55, width * .48)}" ry="9" fill="#061216" opacity=".65"/>${wall}${chloroplasts}<ellipse cx="${x + width * .4}" cy="${y + height * .58}" rx="10" ry="9" fill="#e7b9cd" stroke="#f3d6e3" stroke-width="2"/><text x="160" y="176" text-anchor="middle" fill="#87b6a6" font-size="10">叶绿体 ${p.chloroplastCount} 个</text>`;
}

function updateControlLabels() {
  const shapes = {column: '柱状', flat: '扁平', sphere: '球形', irregular: '不规则形'};
  const veins = {none: '无', '0.72': '细', '1': '中', '1.32': '粗'};
  const fillMode = document.querySelector('#fill-mode').value;
  document.querySelector('#shape-value').textContent = shapes[document.querySelector('#cell-shape').value];
  document.querySelector('#width-value').textContent = Number(document.querySelector('#cell-width').value).toFixed(2);
  document.querySelector('#height-value').textContent = Number(document.querySelector('#cell-height').value).toFixed(2);
  document.querySelector('#chloroplast-value').textContent = document.querySelector('#chloroplast-count').value;
  document.querySelector('#upper-chloroplast-value').textContent = document.querySelector('#upper-chloroplast-count').value;
  document.querySelector('#lower-chloroplast-value').textContent = document.querySelector('#lower-chloroplast-count').value;
  document.querySelector('#upper-stoma-count-value').textContent = document.querySelector('#upper-stoma-count').value;
  document.querySelector('#lower-stoma-count-value').textContent = document.querySelector('#lower-stoma-count').value;
  document.querySelector('#upper-layout-value').textContent = document.querySelector('#upper-layout-mode').value === 'mosaic' ? '镶嵌状' : '规则砖状';
  document.querySelector('#lower-layout-value').textContent = document.querySelector('#lower-layout-mode').value === 'mosaic' ? '镶嵌状' : '规则砖状';
  document.querySelector('#fill-mode-value').textContent = fillMode === 'regular' ? '规则铺满' : '随机不铺满';
  document.querySelector('#density-value').textContent = `${document.querySelector('#fill-density').value}%`;
  document.querySelector('#vein-size-value').textContent = veins[document.querySelector('#vein-size').value];
  document.querySelector('#fill-density').disabled = fillMode !== 'sparse';
  document.querySelector('#density-control').classList.toggle('is-muted', fillMode !== 'sparse');
}

for (const id of ['cell-shape', 'cell-width', 'cell-height', 'chloroplast-count']) document.querySelector(`#${id}`).addEventListener('input', () => { updateControlLabels(); rebuildPreview(); });
for (const id of ['upper-layout-mode', 'lower-layout-mode', 'upper-chloroplast-count', 'lower-chloroplast-count', 'upper-stoma-count', 'lower-stoma-count', 'fill-mode', 'fill-density', 'vein-size']) document.querySelector(`#${id}`).addEventListener('input', updateControlLabels);
document.querySelector('#reset-cell').addEventListener('click', () => { setControl('cell-shape', 'column'); setControl('cell-width', 1.2); setControl('cell-height', 1.8); setControl('chloroplast-count', 18); updateControlLabels(); rebuildPreview(); });
document.querySelector('#install-surfaces').addEventListener('click', installSurfacesOnly);
document.querySelector('#fill-first-layer').addEventListener('click', () => addLayer(true));
document.querySelector('#add-layer').addEventListener('click', () => addLayer(false));
document.querySelector('#update-last-layer').addEventListener('click', updateLastLayer);
document.querySelector('#rerandomize').addEventListener('click', rerandomizeLastLayer);
document.querySelector('#remove-layer').addEventListener('click', removeLayer);
document.querySelector('#clear-layers').addEventListener('click', () => clearLayers());
document.querySelector('#undo-action').addEventListener('click', () => { if (!history.length) return; restore(history.pop()); document.querySelector('#undo-action').disabled = !history.length; });
document.querySelector('#reset-view').addEventListener('click', () => setView(appMode === 'interacting' ? 'front' : 'overall'));
document.querySelector('#confirm-model').addEventListener('click', confirmModel);
document.querySelector('#start-interaction').addEventListener('click', startInteraction);
document.querySelector('#back-to-edit').addEventListener('click', backToEdit);
document.querySelector('#pause-interaction').addEventListener('click', toggleInteraction);
document.querySelector('#replay-interaction').addEventListener('click', replayInteraction);
document.querySelector('#interaction-speed').addEventListener('change', event => {
  interactionSpeed = Number(event.target.value);
  document.querySelector('#interaction-speed-value').textContent = `${interactionSpeed}×`;
});
document.querySelector('#stoma-aperture').addEventListener('input', event => setTargetStomaAperture(event.target.value));
document.querySelectorAll('[data-aperture]').forEach(button => button.addEventListener('click', () => setTargetStomaAperture(button.dataset.aperture)));
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));

const fullscreenButton = document.querySelector('#toggle-fullscreen');
if (fullscreenButton) {
  fullscreenButton.addEventListener('click', async () => {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  });
  document.addEventListener('fullscreenchange', () => {
    fullscreenButton.textContent = document.fullscreenElement ? '退出全屏' : '全屏';
  });
}

renderer.domElement.addEventListener('pointerdown', event => { viewTransition = null; orbiting = true; previousX = event.clientX; previousY = event.clientY; renderer.domElement.setPointerCapture(event.pointerId); });
renderer.domElement.addEventListener('pointermove', event => { if (!orbiting) return; yaw -= (event.clientX - previousX) * .007; pitch = THREE.MathUtils.clamp(pitch + (event.clientY - previousY) * .005, -1.25, 1.25); previousX = event.clientX; previousY = event.clientY; });
renderer.domElement.addEventListener('pointerup', event => { orbiting = false; renderer.domElement.releasePointerCapture(event.pointerId); });
renderer.domElement.addEventListener('wheel', event => { event.preventDefault(); distance = THREE.MathUtils.clamp(distance * Math.exp(event.deltaY * .001), 10, 48); }, {passive: false});

const scrim = document.querySelector('#drawer-scrim');
function closeDrawers() { document.querySelectorAll('.panel.is-open').forEach(panel => panel.classList.remove('is-open')); scrim.classList.remove('is-open'); }
document.querySelectorAll('[data-open-drawer]').forEach(button => button.addEventListener('click', () => { closeDrawers(); document.querySelector(`#${button.dataset.openDrawer}`).classList.add('is-open'); scrim.classList.add('is-open'); }));
document.querySelectorAll('[data-close-drawer]').forEach(button => button.addEventListener('click', closeDrawers)); scrim.addEventListener('click', closeDrawers);
new ResizeObserver(() => { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }).observe(host);
let previousFrameTime = performance.now();
function animate(now = performance.now()) {
  requestAnimationFrame(animate);
  const delta = Math.min(.05, Math.max(0, (now - previousFrameTime) / 1000));
  previousFrameTime = now;
  if (viewTransition) {
    viewTransition.progress += delta;
    const amount = 1 - Math.exp(-delta * 7);
    yaw = THREE.MathUtils.lerp(yaw, viewTransition.yaw, amount);
    pitch = THREE.MathUtils.lerp(pitch, viewTransition.pitch, amount);
    distance = THREE.MathUtils.lerp(distance, viewTransition.distance, amount);
    lookTarget.lerp(viewTransition.target, amount);
    if (viewTransition.progress > 1.25) {
      yaw = viewTransition.yaw; pitch = viewTransition.pitch; distance = viewTransition.distance; lookTarget.copy(viewTransition.target); viewTransition = null;
    }
  }
  if (appMode === 'interacting' && interactionPlaying) {
    interactionTime += delta * interactionSpeed;
    updateInteractionEffects(interactionTime, false, delta, delta);
  } else if (appMode === 'interacting' && Math.abs(stomaAperture - targetStomaAperture) > .002) {
    updateInteractionEffects(interactionTime, false, delta);
  }
  camera.position.set(
    lookTarget.x + Math.sin(yaw) * Math.cos(pitch) * distance,
    lookTarget.y + Math.sin(pitch) * distance,
    lookTarget.z + Math.cos(yaw) * Math.cos(pitch) * distance,
  );
  camera.lookAt(lookTarget);
  renderer.render(scene, camera);
}

setWorkflowStage('edit'); updateControlLabels(); updateApertureReadout(); rebuildPreview(); updateState('请设置参数并逐层搭建模型'); requestAnimationFrame(animate);
