import * as THREE from '../vendor/three.module.js';
import { createDayNightWindow } from './day-night-window.js';

// 统一实验台的分区依据是“独立操作物位”。实验二包含排气、注水和石灰水观察，
// 因此占用最大区域；实验一包含燃烧检验物位；实验三以两只保温瓶为主，物位集中。
export const RESPIRATION_BENCH_PLAN = [
  {
    id: 'oxygen',
    title: '实验一 · 吸收氧气',
    subtitle: '种子萌发时吸收氧气',
    width: 7.1,
    color: 0x75d8d2,
    slots: [
      ['萌发种子', '甲组材料', -2.35, -1.82, 1.45, 1.18],
      ['煮熟种子', '乙组材料', -.76, -1.82, 1.45, 1.18],
      ['瓶塞 × 2', '密封用', 1.06, -1.82, 1.38, 1.18],
      ['甲瓶', '萌发种子瓶', -2.32, .42, 1.45, 1.52],
      ['乙瓶', '煮熟种子瓶', -.67, .42, 1.45, 1.52],
      ['蜡烛 × 2', '燃烧检验', 1.02, .42, 1.48, 1.52],
      ['火柴盒', '点燃蜡烛', 2.46, .42, .95, 1.52]
    ]
  },
  {
    id: 'carbon-dioxide',
    title: '实验二 · 释放二氧化碳',
    subtitle: '排气法检验石灰水',
    width: 9.75,
    color: 0xf0c575,
    slots: [
      ['萌发种子', '甲组材料', -3.78, -1.82, 1.40, 1.18],
      ['煮熟种子', '乙组材料', -2.24, -1.82, 1.40, 1.18],
      ['双孔塞 × 2', '导气与注水', -.58, -1.82, 1.55, 1.18],
      ['导管 × 2', '瓶内气体导出', 1.28, -1.82, 2.02, 1.18],
      ['注水容器', '加水排气', 3.66, -1.82, 1.38, 1.18],
      ['甲瓶', '萌发种子装置', -3.45, .42, 1.52, 1.52],
      ['乙瓶', '煮熟种子装置', -1.70, .42, 1.52, 1.52],
      ['甲试管', '澄清石灰水', .62, .42, 1.48, 1.52],
      ['乙试管', '澄清石灰水', 2.28, .42, 1.48, 1.52],
      ['注水漏斗', '连接注水口', 3.94, .42, 1.16, 1.52]
    ]
  },
  {
    id: 'energy',
    title: '实验三 · 释放能量',
    subtitle: '温度计显示温差',
    width: 6.8,
    color: 0x9ca7f3,
    slots: [
      ['萌发种子', '甲组材料', -2.16, -1.82, 1.38, 1.18],
      ['煮熟种子', '乙组材料', -.63, -1.82, 1.38, 1.18],
      ['温度计 × 2', '插入保温瓶', 1.08, -1.82, 1.62, 1.18],
      ['密封塞 × 2', '保温瓶密封', 2.47, -1.82, .92, 1.18],
      ['甲保温瓶', '萌发种子', -1.80, .42, 1.68, 1.52],
      ['乙保温瓶', '煮熟种子', .08, .42, 1.68, 1.52],
      ['读数观察区', '温差示意', 2.12, .42, 1.44, 1.52]
    ]
  }
];

const TABLE_DEPTH = 8.4;
const TABLE_WIDTH = 25.8;
const OPERATION_BENCH = { width: 14.4, depth: 5.8, centerZ: 11.3 };

function box(scene, width, height, depth, material, position, castShadow = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(...position);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function makeTextTexture(title, subtitle, color, compact = false) {
  const canvas = document.createElement('canvas');
  canvas.width = compact ? 512 : 768;
  canvas.height = compact ? 192 : 224;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(9, 27, 33, .90)';
  context.fillRect(8, 8, canvas.width - 16, canvas.height - 16);
  context.strokeStyle = color;
  context.globalAlpha = .72;
  context.lineWidth = 7;
  context.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
  context.globalAlpha = 1;
  context.textAlign = 'center';
  context.fillStyle = '#f2fcf8';
  context.font = compact ? '700 68px "PingFang SC", sans-serif' : '700 64px "PingFang SC", sans-serif';
  context.fillText(title, canvas.width / 2, subtitle ? (compact ? 88 : 94) : (compact ? 118 : 120));
  if (subtitle) {
    context.fillStyle = '#bdd3cb';
    context.font = compact ? '500 32px "PingFang SC", sans-serif' : '500 35px "PingFang SC", sans-serif';
    context.fillText(subtitle, canvas.width / 2, compact ? 151 : 160);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

function placeTopLabel(scene, title, subtitle, color, width, x, z) {
  const texture = makeTextTexture(title, subtitle, color, true);
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(width, width * .28),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide })
  );
  panel.rotation.x = -Math.PI / 2;
  panel.position.set(x, .058, z);
  panel.renderOrder = 4;
  scene.add(panel);
  return panel;
}

function createOperationBench(scene) {
  const top = new THREE.MeshStandardMaterial({ color: 0x31474b, roughness: .65, metalness: .20 });
  const edge = new THREE.MeshStandardMaterial({ color: 0x9bbcb5, roughness: .34, metalness: .58 });
  const fascia = new THREE.MeshStandardMaterial({ color: 0x1a2b31, roughness: .72, metalness: .24 });
  const leg = new THREE.MeshStandardMaterial({ color: 0x15272d, roughness: .78, metalness: .22 });
  const { width, depth, centerZ } = OPERATION_BENCH;
  box(scene, width, .28, depth, top, [0, -.14, centerZ]);
  box(scene, width, .06, .08, edge, [0, -.055, centerZ + depth / 2 + .015]);
  box(scene, width - .35, .52, .16, fascia, [0, -.52, centerZ + depth / 2 - .24]);
  for (const x of [-6.25, 6.25]) {
    for (const z of [centerZ - 2.30, centerZ + 2.30]) box(scene, .30, 2.62, .30, leg, [x, -1.61, z]);
  }

  const zones = [
    { id: 'group-a', title: '甲组操作区', subtitle: '实验组装与现象观察', centerX: -4.55, width: 5.05, color: 0x70d6d0 },
    { id: 'shared', title: '共用操作区', subtitle: '火柴、注水及计时操作', centerX: 0, width: 3.35, color: 0xe4c273 },
    { id: 'group-b', title: '乙组操作区', subtitle: '对照组装与现象观察', centerX: 4.55, width: 5.05, color: 0x9ca7f3 }
  ];
  for (const zone of zones) {
    const tint = new THREE.Mesh(
      new THREE.BoxGeometry(zone.width, .022, depth - .40),
      new THREE.MeshBasicMaterial({ color: zone.color, transparent: true, opacity: .11, depthWrite: false })
    );
    tint.position.set(zone.centerX, .021, centerZ);
    scene.add(tint);
    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(zone.width, .045, depth - .40)),
      new THREE.LineBasicMaterial({ color: zone.color, transparent: true, opacity: .82 })
    );
    outline.position.copy(tint.position);
    scene.add(outline);
  }
  return { ...OPERATION_BENCH, zones };
}

export function createRespirationBench(scene) {
  const table = new THREE.MeshStandardMaterial({ color: 0x30494d, roughness: .68, metalness: .22 });
  const edge = new THREE.MeshStandardMaterial({ color: 0x92bbb3, roughness: .34, metalness: .64 });
  const fascia = new THREE.MeshStandardMaterial({ color: 0x1b3036, roughness: .70, metalness: .28 });
  const leg = new THREE.MeshStandardMaterial({ color: 0x173038, roughness: .76, metalness: .22 });
  const wall = new THREE.MeshStandardMaterial({ color: 0x24383e, roughness: .94, metalness: 0 });
  const slotMaterialCache = new Map();

  const wallPanel = box(scene, 44, 15, .16, wall, [0, 4.25, -5.02], false);
  wallPanel.receiveShadow = false;
  box(scene, TABLE_WIDTH, .28, TABLE_DEPTH, table, [0, -.14, 0]);
  box(scene, TABLE_WIDTH, .055, .07, edge, [0, -.06, TABLE_DEPTH / 2 + .015]);
  box(scene, TABLE_WIDTH - .4, .45, .15, fascia, [0, -.48, TABLE_DEPTH / 2 - .30]);
  for (const x of [-11.35, 11.35]) {
    for (const z of [-3.30, 3.30]) box(scene, .30, 2.60, .30, leg, [x, -1.60, z]);
  }

  const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: .22 }));
  shadowFloor.rotation.x = -Math.PI / 2;
  shadowFloor.position.y = -2.91;
  shadowFloor.receiveShadow = true;
  scene.add(shadowFloor);

  let cursor = -TABLE_WIDTH / 2 + .72;
  const zones = [];
  for (const definition of RESPIRATION_BENCH_PLAN) {
    const center = cursor + definition.width / 2;
    const zoneTint = new THREE.Mesh(
      new THREE.BoxGeometry(definition.width, .018, TABLE_DEPTH - .42),
      new THREE.MeshBasicMaterial({ color: definition.color, transparent: true, opacity: .09, depthWrite: false })
    );
    zoneTint.position.set(center, .018, 0);
    scene.add(zoneTint);
    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(definition.width, .035, TABLE_DEPTH - .42)),
      new THREE.LineBasicMaterial({ color: definition.color, transparent: true, opacity: .66 })
    );
    outline.position.set(center, .026, 0);
    scene.add(outline);

    const slotMaterial = new THREE.MeshBasicMaterial({ color: definition.color, transparent: true, opacity: .18, depthWrite: false });
    slotMaterialCache.set(definition.id, slotMaterial);
    for (const [title, subtitle, localX, z, width, depth] of definition.slots) {
      const slot = new THREE.Mesh(new THREE.BoxGeometry(width, .022, depth), slotMaterial);
      slot.position.set(center + localX, .026, z);
      slot.receiveShadow = true;
      scene.add(slot);
      const slotOutline = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(width, .04, depth)),
        new THREE.LineBasicMaterial({ color: definition.color, transparent: true, opacity: .86 })
      );
      slotOutline.position.copy(slot.position);
      scene.add(slotOutline);
      placeTopLabel(scene, title, '', `#${definition.color.toString(16).padStart(6, '0')}`, Math.min(width * .94, 1.50), center + localX, z);
    }
    zones.push({ ...definition, center, start: cursor, end: cursor + definition.width });
    cursor += definition.width + .25;
  }

  const operationBench = createOperationBench(scene);
  const dayNightWindow = createDayNightWindow(scene);
  return { zones, tableWidth: TABLE_WIDTH, tableDepth: TABLE_DEPTH, operationBench, dayNightWindow };
}
