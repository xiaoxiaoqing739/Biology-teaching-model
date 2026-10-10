import * as THREE from '../vendor/three.module.js';

function localBox(group, width, height, depth, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  group.add(mesh);
  return mesh;
}

function colorAtHour(hour) {
  const stops = [
    [0, 0x071428, 0x172642],
    [5, 0x182b48, 0xca6f68],
    [7, 0x65afd1, 0xf5c99a],
    [12, 0x62bee7, 0xd8f0f2],
    [17, 0x6aa6c4, 0xf2b276],
    [19, 0x253552, 0xc56360],
    [22, 0x09172e, 0x1d2946],
    [24, 0x071428, 0x172642]
  ];
  let lower = stops[0];
  let upper = stops.at(-1);
  for (let index = 0; index < stops.length - 1; index += 1) {
    if (hour >= stops[index][0] && hour <= stops[index + 1][0]) {
      lower = stops[index];
      upper = stops[index + 1];
      break;
    }
  }
  const amount = THREE.MathUtils.clamp((hour - lower[0]) / Math.max(.001, upper[0] - lower[0]), 0, 1);
  return {
    top: new THREE.Color(lower[1]).lerp(new THREE.Color(upper[1]), amount),
    bottom: new THREE.Color(lower[2]).lerp(new THREE.Color(upper[2]), amount)
  };
}

function createSkyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 576;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  return { canvas, texture, context: canvas.getContext('2d') };
}

function createGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(128, 128, 8, 128, 128, 120);
  gradient.addColorStop(0, 'rgba(255,238,162,.95)');
  gradient.addColorStop(.26, 'rgba(255,212,102,.55)');
  gradient.addColorStop(1, 'rgba(255,192,64,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createDayNightWindow(scene, options = {}) {
  const group = new THREE.Group();
  group.position.set(options.x ?? 15.3, options.y ?? 6.35, options.z ?? -4.72);
  scene.add(group);

  const recess = new THREE.MeshStandardMaterial({ color: 0x17262b, roughness: .82, metalness: .08 });
  const frame = new THREE.MeshStandardMaterial({ color: 0xc7d1ca, roughness: .48, metalness: .12 });
  const frameEdge = new THREE.MeshStandardMaterial({ color: 0x73827e, roughness: .42, metalness: .32 });
  const sill = new THREE.MeshStandardMaterial({ color: 0xaebbb4, roughness: .62, metalness: .08 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xd9f0ef, roughness: .05, transmission: .64, transparent: true, opacity: .18, ior: 1.46, thickness: .035, depthWrite: false, side: THREE.DoubleSide });

  localBox(group, 5.45, 4.36, .28, recess, 0, 0, -.18);
  const sky = createSkyTexture();
  const skyPanel = new THREE.Mesh(new THREE.PlaneGeometry(4.72, 3.62), new THREE.MeshBasicMaterial({ map: sky.texture, side: THREE.DoubleSide }));
  skyPanel.position.z = .01;
  group.add(skyPanel);

  const celestial = new THREE.Group();
  celestial.position.z = .08;
  group.add(celestial);
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: createGlowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sunGlow.scale.set(1.18, 1.18, 1);
  celestial.add(sunGlow);
  const sun = new THREE.Mesh(new THREE.CircleGeometry(.29, 64), new THREE.MeshBasicMaterial({ color: 0xffe39a, depthWrite: false }));
  celestial.add(sun);

  const moon = new THREE.Group();
  const moonDisk = new THREE.Mesh(new THREE.CircleGeometry(.27, 64), new THREE.MeshBasicMaterial({ color: 0xe6ecdc, depthWrite: false }));
  moon.add(moonDisk);
  const craterMaterial = new THREE.MeshBasicMaterial({ color: 0xb7c0b8, transparent: true, opacity: .45, depthWrite: false });
  for (const [x, y, radius] of [[-.08, .08, .055], [.09, .02, .042], [.01, -.11, .033]]) {
    const crater = new THREE.Mesh(new THREE.CircleGeometry(radius, 24), craterMaterial);
    crater.position.set(x, y, .01);
    moon.add(crater);
  }
  celestial.add(moon);

  const glassPanel = new THREE.Mesh(new THREE.PlaneGeometry(4.72, 3.62), glass);
  glassPanel.position.z = .19;
  group.add(glassPanel);
  const reflectionMaterial = new THREE.MeshBasicMaterial({ color: 0xeaffff, transparent: true, opacity: .10, depthWrite: false });
  for (const offset of [-1.25, .72]) {
    const reflection = new THREE.Mesh(new THREE.PlaneGeometry(.28, 3.18), reflectionMaterial);
    reflection.position.set(offset, .05, .22);
    reflection.rotation.z = -.25;
    group.add(reflection);
  }

  for (const x of [-2.50, 0, 2.50]) localBox(group, .14, 3.96, .22, frame, x, 0, .28);
  for (const y of [-1.96, 0, 1.96]) localBox(group, 5.12, .14, .22, frame, 0, y, .28);
  localBox(group, 5.52, .10, .34, frameEdge, 0, 2.15, .09);
  localBox(group, 5.52, .20, .62, sill, 0, -2.18, .34);
  localBox(group, .12, 4.38, .42, frameEdge, -2.72, 0, .02);
  localBox(group, .12, 4.38, .42, frameEdge, 2.72, 0, .02);

  const windowLight = new THREE.PointLight(0xffd9a1, 2.5, 14, 1.6);
  windowLight.position.set(0, .8, 2.8);
  group.add(windowLight);

  let currentHour = 12;
  function redrawSky(hour) {
    const { context, canvas } = sky;
    const colors = colorAtHour(hour);
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `#${colors.top.getHexString()}`);
    gradient.addColorStop(1, `#${colors.bottom.getHexString()}`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    const night = THREE.MathUtils.clamp(Math.max((6 - hour) / 3, (hour - 18) / 3), 0, 1);
    if (night > .02) {
      context.fillStyle = `rgba(238,247,255,${.78 * night})`;
      for (let index = 0; index < 54; index += 1) {
        const x = (index * 137 + 43) % canvas.width;
        const y = (index * 83 + 29) % Math.floor(canvas.height * .70);
        const radius = .7 + (index % 4) * .38;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      }
    }
    const cloudOpacity = .05 + (1 - night) * .09;
    context.fillStyle = `rgba(245,252,250,${cloudOpacity})`;
    for (const [x, y, width, height] of [[95, 220, 230, 34], [410, 160, 260, 42], [250, 355, 300, 36]]) {
      context.beginPath();
      context.ellipse(x, y, width / 2, height / 2, 0, 0, Math.PI * 2);
      context.fill();
    }
    sky.texture.needsUpdate = true;
  }

  function setHour(value) {
    currentHour = ((Number(value) % 24) + 24) % 24;
    redrawSky(currentHour);
    const sunVisible = currentHour >= 5.5 && currentHour <= 18.5;
    const sunProgress = THREE.MathUtils.clamp((currentHour - 5.5) / 13, 0, 1);
    const sunX = THREE.MathUtils.lerp(-1.85, 1.85, sunProgress);
    const sunY = -.98 + Math.sin(Math.PI * sunProgress) * 2.66;
    sun.position.set(sunX, sunY, .01);
    sunGlow.position.set(sunX, sunY, 0);
    sun.visible = sunVisible;
    sunGlow.visible = sunVisible;

    const moonHour = currentHour < 6.5 ? currentHour + 24 : currentHour;
    const moonVisible = moonHour >= 18 && moonHour <= 30.5;
    const moonProgress = THREE.MathUtils.clamp((moonHour - 18) / 12.5, 0, 1);
    moon.position.set(THREE.MathUtils.lerp(-1.85, 1.85, moonProgress), -.98 + Math.sin(Math.PI * moonProgress) * 2.55, .01);
    moon.visible = moonVisible;

    const daylight = sunVisible ? Math.sin(Math.PI * sunProgress) : 0;
    windowLight.intensity = .18 + daylight * 3.1;
    windowLight.color.set(currentHour < 8 || currentHour > 16.5 ? 0xffba82 : 0xdaf4ff);
  }

  function setProgress(progress) {
    setHour(THREE.MathUtils.clamp(progress, 0, 1) * 24);
  }

  setHour(currentHour);
  return { group, skyTexture: sky.texture, sun, moon, windowLight, setHour, setProgress, get hour() { return currentHour; } };
}
