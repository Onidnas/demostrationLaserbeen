import * as THREE from 'three';
import { NodeRole } from '../types/network';
import { groundHeightAt } from '../utils/graphTheorem';

/**
 * Generates a high-sharpness procedural topographic & tactical grid CanvasTexture
 */
export function createTerrainGridTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Deep obsidian-slate terrain base
  ctx.fillStyle = '#0b121e';
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle sub-grid
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
  ctx.lineWidth = 1;
  const step = 32;
  for (let i = 0; i <= 1024; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 1024);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(1024, i);
    ctx.stroke();
  }

  // Primary major tactical grid lines
  ctx.strokeStyle = 'rgba(244, 63, 94, 0.14)';
  ctx.lineWidth = 2;
  const majorStep = 128;
  for (let i = 0; i <= 1024; i += majorStep) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 1024);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(1024, i);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(14, 14);
  texture.anisotropy = maxAnisotropy;
  return texture;
}

/**
 * Generates a soft radial contact shadow texture to ground all 3D models flush on the terrain
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 120);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.28)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Generates a procedural solar panel cell texture for the LEO satellite and stations
 */
export function createSolarPanelTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#091936';
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  for (let x = 0; x <= 512; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  for (let y = 0; y <= 256; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

/**
 * Builds the procedural outdoor terrain mesh and an InstancedMesh of natural rock/ridge formations
 * (>20 instances with computeBoundingSphere and varied tint/scale)
 */
export function createOutdoorTerrainAndPerimeters(
  maxAnisotropy: number
): {
  terrainMesh: THREE.Mesh;
  rocksInstanced: THREE.InstancedMesh;
} {
  const geo = new THREE.PlaneGeometry(240, 240, 128, 128);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, groundHeightAt(x, z));
  }
  geo.computeVertexNormals();

  const gridTex = createTerrainGridTexture(maxAnisotropy);
  const mat = new THREE.MeshStandardMaterial({
    map: gridTex,
    roughness: 0.84,
    metalness: 0.14,
  });

  const terrainMesh = new THREE.Mesh(geo, mat);
  terrainMesh.receiveShadow = true;

  // Natural perimeter rock outcrops using InstancedMesh (72 instances around the valley perimeter)
  const rockGeo = new THREE.DodecahedronGeometry(1.6, 1);
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.88,
    metalness: 0.12,
  });

  const instanceCount = 72;
  const rocksInstanced = new THREE.InstancedMesh(rockGeo, rockMat, instanceCount);
  rocksInstanced.castShadow = true;
  rocksInstanced.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  for (let i = 0; i < instanceCount; i++) {
    const angle = (i / instanceCount) * Math.PI * 2;
    const radius = 58 + (i % 5) * 6.5;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = groundHeightAt(x, z);

    const scaleXZ = 0.85 + ((i * 17) % 30) * 0.03;
    const scaleY = 0.75 + ((i * 23) % 40) * 0.04;

    dummy.position.set(x, y + scaleY * 0.6, z);
    dummy.rotation.set((i * 0.3) % 1, angle, (i * 0.7) % 1);
    dummy.scale.set(scaleXZ, scaleY, scaleXZ);
    dummy.updateMatrix();
    rocksInstanced.setMatrixAt(i, dummy.matrix);

    const shade = 0.14 + ((i * 13) % 15) * 0.008;
    color.setRGB(shade, shade * 1.15, shade * 1.35);
    rocksInstanced.setColorAt(i, color);
  }

  rocksInstanced.instanceMatrix.needsUpdate = true;
  if (rocksInstanced.instanceColor) rocksInstanced.instanceColor.needsUpdate = true;
  rocksInstanced.computeBoundingSphere();

  return { terrainMesh, rocksInstanced };
}

/**
 * Creates a composite 3–12 part procedural 3D model (`THREE.Group`) pivoted at bottom-center (y=0)
 * for each node role in the LiFi Infrared / Satellite / Command Post architecture.
 */
export function createCompositeNodeModel(
  role: NodeRole,
  shadowTex: THREE.CanvasTexture,
  solarTex: THREE.CanvasTexture
): {
  group: THREE.Group;
  beaconMesh: THREE.Mesh;
  turretGroup: THREE.Group;
  hitboxMesh: THREE.Mesh;
} {
  const group = new THREE.Group();
  const turretGroup = new THREE.Group();

  // Shared PBR Materials with varied roughness (>= 0.25 delta) and metalness
  const darkAlloyMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.82,
    roughness: 0.28,
  });
  const brushedTitaniumMat = new THREE.MeshPhysicalMaterial({
    color: 0x94a3b8,
    metalness: 0.92,
    roughness: 0.18,
    anisotropy: 0.75,
    clearcoat: 0.4,
  });
  const matteCompositeMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.18,
    roughness: 0.74,
  });
  const goldFoilMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.94,
    roughness: 0.22,
  });
  const infraredOpticGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0xf43f5e,
    emissive: 0xbe123c,
    emissiveIntensity: 0.85,
    metalness: 0.05,
    roughness: 0.08,
    transmission: 0.92,
    ior: 1.75,
    thickness: 1.2,
    clearcoat: 1.0,
  });
  const solarMat = new THREE.MeshStandardMaterial({
    map: solarTex,
    roughness: 0.24,
    metalness: 0.65,
  });

  // 1. Contact shadow plane at y = 0.03 (except for orbital satellite)
  if (role !== 'leo_satellite') {
    const shadowSize = role === 'command_post' ? 11 : role === 'uplink_gateway' ? 7.5 : 5.8;
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(shadowSize, shadowSize),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.65,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.03;
    group.add(shadowPlane);
  }

  let beaconMesh: THREE.Mesh;

  if (role === 'flag_beacon') {
    // 7-Part Tactical Flag Beacon & Zona Cero Waypoint (Matches the stepped flag-on-pole sketch)
    const blueBannerMat = new THREE.MeshPhysicalMaterial({
      color: 0x60a5fa,
      emissive: 0x2563eb,
      emissiveIntensity: 0.55,
      metalness: 0.25,
      roughness: 0.22,
      clearcoat: 0.85,
      side: THREE.DoubleSide,
    });

    const blueFrameMat = new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      emissive: 0x3b82f6,
      emissiveIntensity: 0.4,
      metalness: 0.8,
      roughness: 0.2,
    });

    // Part 1: Anchor Base Plinth under the flagpole
    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 1.1, 0.36, 16),
      darkAlloyMat
    );
    plinth.position.set(-1.6, 0.18, 0);
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    group.add(plinth);

    // Part 2: Tall Vertical Flagpole Mast on the left (`|`)
    const mastHeight = 6.2;
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.18, mastHeight, 20),
      blueFrameMat
    );
    mast.position.set(-1.6, mastHeight * 0.5 + 0.2, 0);
    mast.castShadow = true;
    group.add(mast);

    // Part 3: Stepped Flag / Banner Silhouette (`ExtrudeGeometry` matching the user's blue sketch)
    // Starts at x=0 (attached to mast at y=2.6..5.4), steps down at mid-span (x=2.2, y=4.35), extends to x=4.5, bottom edge flat at y=2.6
    const flagShape = new THREE.Shape();
    flagShape.moveTo(0, 2.6);
    flagShape.lineTo(0, 5.45);
    flagShape.lineTo(2.25, 5.45);
    flagShape.lineTo(2.25, 4.35);
    flagShape.lineTo(4.55, 4.35);
    flagShape.lineTo(4.55, 2.6);
    flagShape.closePath();

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 3,
    };
    const bannerGeo = new THREE.ExtrudeGeometry(flagShape, extrudeSettings);
    const bannerMesh = new THREE.Mesh(bannerGeo, blueBannerMat);
    bannerMesh.position.set(-1.52, 0, -0.08);
    bannerMesh.castShadow = true;
    group.add(bannerMesh);

    // Part 4 & 5: Structural Metallic Reinforcement Bars along the stepped banner edges
    const bottomBar = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 0.12, 0.24),
      brushedTitaniumMat
    );
    bottomBar.position.set(0.75, 2.6, 0);
    group.add(bottomBar);

    const upperLeftBar = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 0.12, 0.24),
      brushedTitaniumMat
    );
    upperLeftBar.position.set(-0.4, 5.45, 0);
    group.add(upperLeftBar);

    const stepRightBar = new THREE.Mesh(
      new THREE.BoxGeometry(2.35, 0.12, 0.24),
      brushedTitaniumMat
    );
    stepRightBar.position.set(1.9, 4.35, 0);
    group.add(stepRightBar);

    // Part 6 & 7: Infrared LiFi Transceiver Collar & Optical Dome on top of the Flagpole Mast
    turretGroup.position.set(-1.6, 6.5, 0);
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.4, 0.35, 20),
      goldFoilMat
    );
    turretGroup.add(collar);

    beaconMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 24, 24),
      infraredOpticGlassMat
    );
    beaconMesh.position.y = 0.28;
    turretGroup.add(beaconMesh);
    group.add(turretGroup);
  } else if (role === 'response_unit') {
    // 8-Part Tactical Field Response Vehicle with Mobile LiFi Infrared Mast
    // Part 1: Armored Lower Chassis
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.75, 1.8), darkAlloyMat);
    chassis.position.y = 0.65;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    group.add(chassis);

    // Part 2: Sloped Crew Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.68, 1.65), matteCompositeMat);
    cabin.position.set(0.65, 1.32, 0);
    cabin.castShadow = true;
    group.add(cabin);

    // Part 3: Optical Telemetry Rear Module
    const rearPod = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.85, 1.68), brushedTitaniumMat);
    rearPod.position.set(-0.75, 1.4, 0);
    rearPod.castShadow = true;
    group.add(rearPod);

    // Part 4–7: 4 Heavy Off-Road Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.36, 20);
    wheelGeo.rotateX(Math.PI / 2);
    const wheelPositions: [number, number, number][] = [
      [1.05, 0.45, 0.95],
      [1.05, 0.45, -0.95],
      [-1.05, 0.45, 0.95],
      [-1.05, 0.45, -0.95],
    ];
    wheelPositions.forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, matteCompositeMat);
      wheel.position.set(wx, wy, wz);
      wheel.castShadow = true;
      group.add(wheel);
    });

    // Part 8: Telescopic LiFi IR Gimbal Mast + Optical Emitter Lens
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.6, 16), brushedTitaniumMat);
    mast.position.set(-0.75, 2.5, 0);
    mast.castShadow = true;
    group.add(mast);

    turretGroup.position.set(-0.75, 3.4, 0);
    const emitterHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.55, 20), darkAlloyMat);
    emitterHousing.rotation.z = Math.PI / 2;
    turretGroup.add(emitterHousing);

    beaconMesh = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 24), infraredOpticGlassMat);
    beaconMesh.position.set(0, 0.15, 0);
    turretGroup.add(beaconMesh);
    group.add(turretGroup);
  } else if (role === 'lifi_relay') {
    // 7-Part Terrestrial LiFi Infrared Node-Theorem Relay Tower
    // Part 1: Octagonal Concrete/Alloy Foundation Plinth
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.95, 0.55, 8), matteCompositeMat);
    plinth.position.y = 0.275;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    group.add(plinth);

    // Part 2: Tapered Lattice/Core Pylon (LatheGeometry profile)
    const lathePoints = [
      new THREE.Vector2(0.95, 0),
      new THREE.Vector2(0.65, 1.8),
      new THREE.Vector2(0.45, 3.8),
      new THREE.Vector2(0.72, 4.4),
    ];
    const pylonGeo = new THREE.LatheGeometry(lathePoints, 12);
    const pylon = new THREE.Mesh(pylonGeo, darkAlloyMat);
    pylon.position.y = 0.55;
    pylon.castShadow = true;
    group.add(pylon);

    // Part 3 & 4: Dual Solar Power Wings
    const wingGeo = new THREE.BoxGeometry(2.6, 0.08, 0.9);
    const leftWing = new THREE.Mesh(wingGeo, solarMat);
    leftWing.position.set(-1.5, 2.8, 0);
    leftWing.rotation.x = 0.25;
    leftWing.castShadow = true;
    group.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, solarMat);
    rightWing.position.set(1.5, 2.8, 0);
    rightWing.rotation.x = 0.25;
    rightWing.castShadow = true;
    group.add(rightWing);

    // Part 5: 360-Degree Multi-Port Optical Switching Ring (Kirchhoff Node Ring)
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.14, 16, 32), brushedTitaniumMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 4.6;
    ring.castShadow = true;
    group.add(ring);

    // Part 6 & 7: Infrared Optical Transceiver Dome + Laser Collimator
    turretGroup.position.set(0, 5.15, 0);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.65, 0.45, 20), goldFoilMat);
    turretGroup.add(collar);

    beaconMesh = new THREE.Mesh(new THREE.SphereGeometry(0.48, 24, 24), infraredOpticGlassMat);
    beaconMesh.position.y = 0.35;
    turretGroup.add(beaconMesh);
    group.add(turretGroup);
  } else if (role === 'uplink_gateway') {
    // 8-Part Free-Space Optical (FSO) Satellite Uplink Gateway Station
    // Part 1: Reinforced Circular Base Pad
    const basePad = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.7, 0.6, 16), matteCompositeMat);
    basePad.position.y = 0.3;
    basePad.castShadow = true;
    basePad.receiveShadow = true;
    group.add(basePad);

    // Part 2: Cryogenic Laser Amplifier Pedestal
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.45, 2.4, 16), darkAlloyMat);
    pedestal.position.y = 1.8;
    pedestal.castShadow = true;
    group.add(pedestal);

    // Part 3: Azimuth Gimbal Yoke
    turretGroup.position.set(0, 3.4, 0);
    const yokeBase = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 1.4), brushedTitaniumMat);
    turretGroup.add(yokeBase);

    // Part 4 & 5: Parabolic Optical Director Dish (LatheGeometry) + Telescope Barrel
    const dishPoints = [
      new THREE.Vector2(0.1, 0),
      new THREE.Vector2(0.8, 0.25),
      new THREE.Vector2(1.55, 0.72),
      new THREE.Vector2(1.85, 1.15),
    ];
    const dishGeo = new THREE.LatheGeometry(dishPoints, 28);
    const dish = new THREE.Mesh(dishGeo, brushedTitaniumMat);
    dish.position.y = 0.35;
    dish.rotation.x = -0.25;
    dish.castShadow = true;
    turretGroup.add(dish);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, 1.6, 20), goldFoilMat);
    barrel.position.set(0, 1.1, -0.2);
    barrel.rotation.x = -0.25;
    turretGroup.add(barrel);

    // Part 6: High-Power 1550nm Uplink Collimator Crystal
    beaconMesh = new THREE.Mesh(new THREE.SphereGeometry(0.46, 24, 24), infraredOpticGlassMat);
    beaconMesh.position.set(0, 1.85, -0.38);
    turretGroup.add(beaconMesh);
    group.add(turretGroup);
  } else if (role === 'leo_satellite') {
    // 9-Part LEO Optical Relay Satellite (`SAT-AETHER-01`)
    // Part 1: Gold MLI Thermal Foil Octagonal Bus
    const bus = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 2.8, 8), goldFoilMat);
    bus.rotation.z = Math.PI / 2;
    bus.castShadow = true;
    group.add(bus);

    // Part 2: Forward Avionics & Optical Crosslink Module
    const avionics = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.25, 1.2, 16), brushedTitaniumMat);
    avionics.rotation.z = Math.PI / 2;
    avionics.position.x = 1.9;
    group.add(avionics);

    // Part 3 & 4: Expansive Dual Solar Array Wings (Left & Right)
    const panelGeo = new THREE.BoxGeometry(1.8, 0.08, 7.6);
    const solarWingA = new THREE.Mesh(panelGeo, solarMat);
    solarWingA.position.set(0, 0, 5.2);
    group.add(solarWingA);

    const solarWingB = new THREE.Mesh(panelGeo, solarMat);
    solarWingB.position.set(0, 0, -5.2);
    group.add(solarWingB);

    // Part 5 & 6: Solar Boom Struts
    const boomGeo = new THREE.CylinderGeometry(0.1, 0.1, 11.5, 12);
    boomGeo.rotateX(Math.PI / 2);
    const boom = new THREE.Mesh(boomGeo, brushedTitaniumMat);
    group.add(boom);

    // Part 7, 8, 9: Nadir-Pointing Lasercom Optical Telescope Assembly & Ka-Band Downlink Dish
    turretGroup.position.set(0, -1.4, 0);
    const nadirGimbal = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.55, 1.1, 20), darkAlloyMat);
    turretGroup.add(nadirGimbal);

    beaconMesh = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 24), infraredOpticGlassMat);
    beaconMesh.position.y = -0.65;
    turretGroup.add(beaconMesh);
    group.add(turretGroup);
  } else {
    // 'command_post': 9-Part Logistics Command Center (Puesto de Mando de la Organización Líder)
    // Part 1: Command Fortress Terrace Platform
    const platform = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.6, 6.8), matteCompositeMat);
    platform.position.y = 0.3;
    platform.receiveShadow = true;
    platform.castShadow = true;
    group.add(platform);

    // Part 2: Main Operations & Logistics Coordination Hall
    const mainHall = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.2, 4.2), darkAlloyMat);
    mainHall.position.set(-0.8, 1.7, 0);
    mainHall.castShadow = true;
    mainHall.receiveShadow = true;
    group.add(mainHall);

    // Part 3: Logistics Dispatch Wing
    const wing = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.6, 4.8), brushedTitaniumMat);
    wing.position.set(2.2, 1.4, 0.3);
    wing.castShadow = true;
    group.add(wing);

    // Part 4: Geodesic Satellite Telemetry Radome
    const radome = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.35, 2),
      new THREE.MeshPhysicalMaterial({
        color: 0xe2e8f0,
        roughness: 0.25,
        metalness: 0.15,
        clearcoat: 0.8,
      })
    );
    radome.position.set(2.2, 3.1, 1.1);
    radome.castShadow = true;
    group.add(radome);

    // Part 5 & 6: Optical/Ka-Band Downlink Receiver Tower & Collector Lens
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 2.6, 16), goldFoilMat);
    tower.position.set(-1.4, 3.8, -0.6);
    tower.castShadow = true;
    group.add(tower);

    turretGroup.position.set(-1.4, 5.2, -0.6);
    const dishRing = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.14, 16, 28), brushedTitaniumMat);
    dishRing.rotation.x = Math.PI / 2;
    turretGroup.add(dishRing);

    beaconMesh = new THREE.Mesh(new THREE.SphereGeometry(0.56, 24, 24), infraredOpticGlassMat);
    beaconMesh.position.y = 0.25;
    turretGroup.add(beaconMesh);
    group.add(turretGroup);
  }

  // Dedicated invisible Raycast proxy hitbox on Layer 1 for zero-lag pointer interaction
  const hitboxGeo = new THREE.CylinderGeometry(2.8, 2.8, 7.2, 12);
  const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });
  const hitboxMesh = new THREE.Mesh(hitboxGeo, hitboxMat);
  hitboxMesh.position.y = role === 'leo_satellite' ? 0 : 3.2;
  hitboxMesh.layers.set(1);
  group.add(hitboxMesh);

  return { group, beaconMesh, turretGroup, hitboxMesh };
}
