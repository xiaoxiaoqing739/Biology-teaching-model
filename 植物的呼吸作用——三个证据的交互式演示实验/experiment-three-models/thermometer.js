import * as THREE from '../shared/vendor/three.module.js';

function labelSprite(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  context.fillStyle = '#173239';
  context.font = '700 34px Inter, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 64, 32);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({map: texture, transparent: true, depthWrite: false}));
  sprite.scale.set(.52, .26, 1);
  return sprite;
}

/** 温度计原点位于液泡中心，因此插入目标就是温度计 root 的目标位置。 */
export function createThermometer({temperature = 20} = {}) {
  const root = new THREE.Group();
  root.name = 'experiment-three-thermometer';

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xdaf7f4,
    roughness: .05,
    transmission: .86,
    transparent: true,
    opacity: .58,
    ior: 1.46,
    thickness: .10,
    clearcoat: .7,
    depthWrite: false,
  });
  const backing = new THREE.MeshStandardMaterial({color: 0xf2eee1, roughness: .68, side: THREE.DoubleSide});
  const mercury = new THREE.MeshBasicMaterial({
    color: 0xff321f,
    transparent: true,
    opacity: 1,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const marks = new THREE.MeshBasicMaterial({color: 0x31555c});

  const tube = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, 6.40, 32, 1, false), glass);
  tube.position.y = 3.18;
  root.add(tube);

  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.25, 32, 20), glass);
  bulb.scale.y = 1.30;
  bulb.position.y = 0;
  root.add(bulb);
  const redBulb = new THREE.Mesh(new THREE.SphereGeometry(.15, 28, 18), mercury);
  redBulb.scale.y = 1.24;
  redBulb.position.z = .24;
  redBulb.renderOrder = 100;
  root.add(redBulb);

  const scaleBoard = new THREE.Mesh(new THREE.PlaneGeometry(.62, 5.68), backing);
  scaleBoard.position.set(0, 3.20, -.095);
  root.add(scaleBoard);

  for (let tick = 0; tick <= 30; tick += 1) {
    const major = tick % 10 === 0;
    const line = new THREE.Mesh(new THREE.BoxGeometry(major ? .24 : .13, .014, .012), marks);
    line.position.set(.15, .48 + tick * .17, .015);
    root.add(line);
    if (major) {
      const sprite = labelSprite(String(10 + tick));
      sprite.position.set(-.35, line.position.y, .01);
      root.add(sprite);
    }
  }

  const column = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, 1, 20), mercury);
  column.position.z = .26;
  column.renderOrder = 100;
  root.add(column);
  const frontColumn = new THREE.Mesh(
    new THREE.PlaneGeometry(.11, 1),
    mercury.clone(),
  );
  frontColumn.material.side = THREE.DoubleSide;
  frontColumn.position.z = .42;
  frontColumn.renderOrder = 110;
  root.add(frontColumn);

  const hit = new THREE.Mesh(
    new THREE.CylinderGeometry(.42, .42, 6.75, 16),
    new THREE.MeshBasicMaterial({transparent: true, opacity: .001, depthWrite: false}),
  );
  hit.position.y = 3.15;
  root.add(hit);

  const setTemperature = value => {
    const safe = THREE.MathUtils.clamp(value, 10, 40);
    const bottom = .22;
    const top = .48 + ((safe - 10) / 30) * 5.10;
    const height = Math.max(.04, top - bottom);
    column.scale.y = height;
    column.position.y = bottom + height / 2;
    column.position.z = .26;
    frontColumn.scale.y = height;
    frontColumn.position.set(0, bottom + height / 2, .42);
    root.userData.temperature = safe;
  };
  root.userData = {type: 'thermometer', hit, column, frontColumn, setTemperature, temperature};
  setTemperature(temperature);
  return root;
}
