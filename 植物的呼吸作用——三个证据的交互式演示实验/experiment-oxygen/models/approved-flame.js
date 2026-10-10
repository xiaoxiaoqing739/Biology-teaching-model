import * as THREE from '../../shared/vendor/three.module.js';

// 复用来源：shared/equipment/approved-equipment-factory.js 中已验证的 matchFlame。
// 保留双层渐变精灵结构，仅开放统一的显隐、强度和缩放接口。
function createTexture(colors) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  context.beginPath();
  context.moveTo(64, 250);
  context.bezierCurveTo(13, 210, 24, 120, 69, 10);
  context.bezierCurveTo(96, 73, 124, 178, 64, 250);
  context.closePath();
  const gradient = context.createRadialGradient(64, 210, 5, 64, 145, 112);
  colors.forEach(([position, color]) => gradient.addColorStop(position, color));
  context.fillStyle = gradient;
  context.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createApprovedFlame(options = {}) {
  const group = new THREE.Group();
  group.name = 'approved-reused-flame';
  const outerMaterial = new THREE.SpriteMaterial({
    map: createTexture([[0, 'rgba(255,232,110,.98)'], [.35, 'rgba(255,153,25,.9)'], [1, 'rgba(255,50,0,0)']]),
    transparent: true,
    opacity: .86,
    depthWrite: false,
    depthTest: false
  });
  const coreMaterial = new THREE.SpriteMaterial({
    map: createTexture([[0, 'rgba(220,248,255,.92)'], [.58, 'rgba(55,145,255,.72)'], [1, 'rgba(25,80,255,0)']]),
    transparent: true,
    opacity: .70,
    depthWrite: false,
    depthTest: false
  });
  const outer = new THREE.Sprite(outerMaterial);
  const core = new THREE.Sprite(coreMaterial);
  outer.renderOrder = 180;
  core.renderOrder = 181;
  const width = options.width ?? .19;
  const height = options.height ?? .34;
  outer.position.y = height * .18;
  outer.scale.set(width, height, 1);
  core.position.y = height * .02;
  core.scale.set(width * .32, height * .32, 1);
  group.add(outer, core);
  const glow = new THREE.PointLight(0xffa743, options.glow ?? 1.7, options.distance ?? 2.6);
  glow.position.y = height * .12;
  group.add(glow);
  group.visible = false;
  group.userData = {
    outer,
    core,
    glow,
    baseWidth: width,
    baseHeight: height,
    setStrength(value) {
      const strength = THREE.MathUtils.clamp(value, 0, 1);
      outerMaterial.opacity = .86 * strength;
      coreMaterial.opacity = .70 * strength;
      outer.scale.set(width * (.72 + strength * .28), height * (.22 + strength * .78), 1);
      core.scale.set(width * .32 * strength, height * .32 * strength, 1);
      glow.intensity = (options.glow ?? 1.7) * strength;
      group.visible = strength > .01;
    }
  };
  return group;
}
