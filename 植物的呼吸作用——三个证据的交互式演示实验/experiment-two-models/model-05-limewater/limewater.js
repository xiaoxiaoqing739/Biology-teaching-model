import * as THREE from '../../shared/vendor/three.module.js';

export const LIMEWATER_SPEC = Object.freeze({
  liquidHeight: 2.10,
  liquidDiameter: 0.42,
  bottomY: 0.05,
  initialColor: 0xddf7f5,
  initialOpacity: 0.30,
  refractiveIndex: 1.333,
  finalColor: 0xf1eee2,
  finalOpacity: 0.90,
  particleCount: 110,
  particleDiameterMin: 0.008,
  particleDiameterMax: 0.025,
  reactionDuration: 8000,
  bubbleCount: 22,
  bubbleDiameterMin: 0.035,
  bubbleDiameterMax: 0.080,
  bubbleRiseMin: 800,
  bubbleRiseMax: 1200,
  bubbleSpawnMin: 120,
  bubbleSpawnMax: 280,
  bubbleSway: 0.04,
  outletY: 0.30,
});

function seededRandom(seed = 20261008) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function createLiquidBody(spec) {
  const radius = spec.liquidDiameter / 2;
  const topY = spec.bottomY + spec.liquidHeight;
  const profile = [new THREE.Vector2(0, spec.bottomY)];
  for (let index = 1; index <= 10; index += 1) {
    const angle = index / 10 * Math.PI / 2;
    profile.push(new THREE.Vector2(radius * Math.sin(angle), spec.bottomY + radius * (1 - Math.cos(angle))));
  }
  profile.push(new THREE.Vector2(radius, topY), new THREE.Vector2(0, topY));
  const material = new THREE.MeshPhysicalMaterial({
    color: spec.initialColor,
    roughness: .06,
    transmission: .74,
    transparent: true,
    opacity: spec.initialOpacity,
    thickness: .22,
    ior: spec.refractiveIndex,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 96), material);
  body.name = 'limewater-liquid-body';
  return body;
}

function createParticles(spec, random) {
  const geometry = new THREE.SphereGeometry(1, 7, 5);
  const material = new THREE.MeshStandardMaterial({color: spec.finalColor, roughness: 1, transparent: true, opacity: 0, depthWrite: false});
  const particles = new THREE.InstancedMesh(geometry, material, spec.particleCount);
  particles.name = 'calcium-carbonate-suspended-particles';
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  const radius = spec.liquidDiameter / 2 - .018;
  for (let index = 0; index < spec.particleCount; index += 1) {
    const angle = random() * Math.PI * 2;
    const radial = Math.sqrt(random()) * radius;
    const diameter = THREE.MathUtils.lerp(spec.particleDiameterMin, spec.particleDiameterMax, random());
    position.set(Math.cos(angle) * radial, spec.bottomY + .10 + random() * (spec.liquidHeight - .13), Math.sin(angle) * radial);
    scale.setScalar(diameter / 2);
    matrix.compose(position, quaternion, scale);
    particles.setMatrixAt(index, matrix);
  }
  particles.instanceMatrix.needsUpdate = true;
  return particles;
}

function createSurface(spec) {
  const surface = new THREE.Mesh(
    new THREE.CircleGeometry(spec.liquidDiameter / 2, 96),
    new THREE.MeshPhysicalMaterial({color: spec.initialColor, roughness: .04, transmission: .72, transparent: true, opacity: .34, side: THREE.DoubleSide, depthWrite: false}),
  );
  surface.name = 'limewater-horizontal-surface';
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = spec.bottomY + spec.liquidHeight;
  return surface;
}

export function createLimewaterSystem() {
  const spec = LIMEWATER_SPEC;
  const root = new THREE.Group();
  root.name = 'experiment-two-limewater-system';
  const random = seededRandom();
  const body = createLiquidBody(spec);
  const surface = createSurface(spec);
  const particles = createParticles(spec, random);
  root.add(body, surface, particles);

  const rippleMaterial = new THREE.MeshBasicMaterial({color: 0xeaffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false});
  const ripples = Array.from({length: 3}, (_, index) => {
    const ripple = new THREE.Mesh(new THREE.RingGeometry(.025, .032, 40), rippleMaterial.clone());
    ripple.name = `surface-ripple-${index + 1}`;
    ripple.rotation.x = -Math.PI / 2;
    ripple.position.y = spec.bottomY + spec.liquidHeight + .003;
    ripple.visible = false;
    root.add(ripple);
    return ripple;
  });

  const bubbleMaterial = new THREE.MeshPhysicalMaterial({color: 0xf2ffff, roughness: .02, transmission: .9, transparent: true, opacity: .58, side: THREE.DoubleSide, depthWrite: false});
  const bubbles = Array.from({length: spec.bubbleCount}, (_, index) => {
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), bubbleMaterial);
    bubble.name = `gas-bubble-${index + 1}`;
    bubble.visible = false;
    root.add(bubble);
    return {mesh: bubble, active: false, start: 0, duration: 1000, radius: .025, phase: random() * Math.PI * 2};
  });

  const state = {mode: null, running: false, started: 0, nextSpawn: 0, bubbleCursor: 0, rippleCursor: 0};
  const initial = new THREE.Color(spec.initialColor);
  const final = new THREE.Color(spec.finalColor);

  function reset() {
    state.mode = null;
    state.running = false;
    body.material.color.copy(initial);
    body.material.opacity = spec.initialOpacity;
    body.material.transmission = .74;
    surface.material.color.copy(initial);
    surface.material.opacity = .34;
    particles.material.opacity = 0;
    bubbles.forEach(bubble => { bubble.active = false; bubble.mesh.visible = false; });
    ripples.forEach(ripple => { ripple.visible = false; ripple.material.opacity = 0; });
  }

  function start(mode, now = performance.now()) {
    reset();
    state.mode = mode === 'B' ? 'B' : 'A';
    state.running = true;
    state.started = now;
    state.nextSpawn = now;
  }

  function spawnBubble(now) {
    const bubble = bubbles[state.bubbleCursor % bubbles.length];
    state.bubbleCursor += 1;
    bubble.active = true;
    bubble.start = now;
    bubble.duration = THREE.MathUtils.lerp(spec.bubbleRiseMin, spec.bubbleRiseMax, random());
    bubble.radius = THREE.MathUtils.lerp(spec.bubbleDiameterMin, spec.bubbleDiameterMax, random()) / 2;
    bubble.phase = random() * Math.PI * 2;
    bubble.mesh.visible = true;
    state.nextSpawn = now + THREE.MathUtils.lerp(spec.bubbleSpawnMin, spec.bubbleSpawnMax, random());
  }

  function triggerRipple(now, x, z) {
    const ripple = ripples[state.rippleCursor % ripples.length];
    state.rippleCursor += 1;
    ripple.visible = true;
    ripple.position.x = x;
    ripple.position.z = z;
    ripple.userData.started = now;
  }

  function update(now = performance.now()) {
    if (!state.running) return;
    if (now >= state.nextSpawn) spawnBubble(now);
    const elapsed = now - state.started;
    const reaction = state.mode === 'A' ? THREE.MathUtils.smoothstep(elapsed, 1000, spec.reactionDuration) : 0;
    body.material.color.copy(initial).lerp(final, reaction);
    body.material.opacity = THREE.MathUtils.lerp(spec.initialOpacity, spec.finalOpacity, reaction);
    body.material.transmission = THREE.MathUtils.lerp(.74, .015, reaction);
    surface.material.color.copy(initial).lerp(final, reaction);
    surface.material.opacity = THREE.MathUtils.lerp(.34, .88, reaction);
    particles.material.opacity = reaction * .96;

    bubbles.forEach(bubble => {
      if (!bubble.active) return;
      const progress = (now - bubble.start) / bubble.duration;
      if (progress >= 1) {
        bubble.active = false;
        bubble.mesh.visible = false;
        triggerRipple(now, bubble.mesh.position.x, bubble.mesh.position.z);
        return;
      }
      const grow = Math.min(progress / .10, 1);
      const radius = bubble.radius * grow * (progress > .82 ? 1 + (progress - .82) * .8 : 1);
      bubble.mesh.scale.setScalar(radius);
      bubble.mesh.position.set(
        Math.sin(progress * Math.PI * 2 + bubble.phase) * spec.bubbleSway,
        THREE.MathUtils.lerp(spec.outletY, spec.bottomY + spec.liquidHeight, progress),
        Math.cos(progress * Math.PI * 1.7 + bubble.phase) * spec.bubbleSway * .55,
      );
    });
    ripples.forEach(ripple => {
      if (!ripple.visible) return;
      const progress = (now - ripple.userData.started) / 520;
      if (progress >= 1) { ripple.visible = false; return; }
      ripple.scale.setScalar(1 + progress * 3.2);
      ripple.material.opacity = (1 - progress) * .48;
    });
  }

  root.userData = {
    type: 'limewater-system',
    version: 'model-05-v1',
    dimensions: spec,
    state,
    start,
    reset,
    update,
    components: {body, surface, particles, bubbles, ripples},
  };
  reset();
  return root;
}
