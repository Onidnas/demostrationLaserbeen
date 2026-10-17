import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  createCompositeNodeModel,
  createContactShadowTexture,
  createOutdoorTerrainAndPerimeters,
  createSolarPanelTexture,
} from '../three/proceduralModels';
import {
  CameraPreset,
  InfraredBand,
  OpticalEdge,
  OpticalNode,
  TelemetryPacket,
} from '../types/network';

interface LiFiViewport3DProps {
  nodes: OpticalNode[];
  edges: OpticalEdge[];
  packets: TelemetryPacket[];
  selectedNodeId: string;
  cameraPreset: CameraPreset;
  infraredBand: InfraredBand;
  weatherDensity: number;
  freeFlySpeed: number;
  isFreeFlyLocked: boolean;
  onFreeFlyLockChange: (locked: boolean) => void;
  onSelectNode: (nodeId: string) => void;
  onToggleNodeActive: (nodeId: string) => void;
}

// Pre-allocated scratch math objects at module scope (Zero GC in render loop)
const _camTargetPos = new THREE.Vector3();
const _camLookAt = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3(0, 8, 0);
const _startVec = new THREE.Vector3();
const _endVec = new THREE.Vector3();
const _midVec = new THREE.Vector3();
const _dirVec = new THREE.Vector3();
const _upVec = new THREE.Vector3(0, 1, 0);
const _quat = new THREE.Quaternion();
const _color = new THREE.Color();
const _forwardVec = new THREE.Vector3();
const _rightVec = new THREE.Vector3();
const _moveDelta = new THREE.Vector3();
const _velocityVec = new THREE.Vector3();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');

function getBeamPortPosition(node: OpticalNode, target: THREE.Vector3): THREE.Vector3 {
  const [x, y, z] = node.position;
  if (node.role === 'leo_satellite') {
    return target.set(x, y - 2.0, z);
  }
  if (node.role === 'command_post') {
    return target.set(x - 1.4, y + 5.45, z - 0.6);
  }
  if (node.role === 'uplink_gateway') {
    return target.set(x, y + 5.1, z);
  }
  if (node.role === 'flag_beacon') {
    return target.set(x - 1.6, y + 6.78, z);
  }
  if (node.role === 'response_unit') {
    return target.set(x - 0.75, y + 3.55, z);
  }
  return target.set(x, y + 5.5, z);
}

const CAMERA_PRESETS: Record<
  CameraPreset,
  { pos: [number, number, number]; look: [number, number, number] }
> = {
  overview: { pos: [0, 44, 78], look: [0, 10, 0] },
  lifi_mesh: { pos: [-12, 24, 42], look: [-10, 4, 2] },
  satellite_orbit: { pos: [-18, 56, 28], look: [6, 42, -2] },
  command_post: { pos: [54, 18, 22], look: [36, 4, -4] },
  response_team: { pos: [-54, 16, 36], look: [-35, 4, 12] },
};

export const LiFiViewport3D: React.FC<LiFiViewport3DProps> = ({
  nodes,
  edges,
  packets,
  selectedNodeId,
  cameraPreset,
  infraredBand,
  weatherDensity,
  freeFlySpeed,
  isFreeFlyLocked,
  onFreeFlyLockChange,
  onSelectNode,
  onToggleNodeActive,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [webglLost, setWebglLost] = useState(false);

  // Store latest props in refs so WebGL animation loop reads live state without re-creating scene
  const stateRef = useRef({
    nodes,
    edges,
    packets,
    selectedNodeId,
    cameraPreset,
    infraredBand,
    weatherDensity,
    freeFlySpeed,
    isFreeFlyLocked,
    onFreeFlyLockChange,
    onSelectNode,
    onToggleNodeActive,
  });

  useEffect(() => {
    stateRef.current = {
      nodes,
      edges,
      packets,
      selectedNodeId,
      cameraPreset,
      infraredBand,
      weatherDensity,
      freeFlySpeed,
      isFreeFlyLocked,
      onFreeFlyLockChange,
      onSelectNode,
      onToggleNodeActive,
    };
  }, [
    nodes,
    edges,
    packets,
    selectedNodeId,
    cameraPreset,
    infraredBand,
    weatherDensity,
    freeFlySpeed,
    isFreeFlyLocked,
    onFreeFlyLockChange,
    onSelectNode,
    onToggleNodeActive,
  ]);

  const presetOverrideActiveRef = useRef<boolean>(false);
  const lastPresetRef = useRef<CameraPreset>(cameraPreset);
  const activeKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (lastPresetRef.current !== cameraPreset) {
      lastPresetRef.current = cameraPreset;
      presetOverrideActiveRef.current = true;
      _velocityVec.set(0, 0, 0);
    }
  }, [cameraPreset]);

  // Trigger Pointer Lock when user toggles Modo Videojuego button
  useEffect(() => {
    const canvas = canvasMountRef.current?.querySelector('canvas');
    if (!canvas) return;
    if (isFreeFlyLocked && document.pointerLockElement !== canvas) {
      canvas.requestPointerLock?.();
    } else if (!isFreeFlyLocked && document.pointerLockElement === canvas) {
      document.exitPointerLock?.();
    }
  }, [isFreeFlyLocked]);

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const isHeadless =
      navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);

    const scene = new THREE.Scene();
    const skyColor = new THREE.Color(0x070b12);
    scene.background = skyColor;
    scene.fog = new THREE.FogExp2(0x070b12, 0.0045);

    const camera = new THREE.PerspectiveCamera(
      48,
      mount.clientWidth / Math.max(1, mount.clientHeight),
      0.5,
      450
    );
    camera.position.set(0, 44, 78);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = !isHeadless;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglLost(true);
    };
    const handleContextRestored = () => {
      setWebglLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    // Studio Environment Map (RoomEnvironment + PMREMGenerator)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3-Point Balanced Studio + Outdoor Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.65);
    hemiLight.position.set(0, 65, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff3e0, 2.2);
    keyLight.position.set(42, 68, 38);
    keyLight.castShadow = !isHeadless;
    keyLight.shadow.mapSize.set(2048, 2048);
    const d = 62;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.camera.near = 5;
    keyLight.shadow.camera.far = 160;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xf43f5e, 1.15);
    rimLight.position.set(-48, 35, -42);
    scene.add(rimLight);

    // OrbitControls with exponential damping + full pan freedom
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.screenSpacePanning = true;
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.minDistance = 2;
    controls.maxDistance = 220;
    controls.target.set(0, 10, 0);

    const stopPresetOverride = () => {
      presetOverrideActiveRef.current = false;
    };
    controls.addEventListener('start', stopPresetOverride);

    // Video-game Keyboard & PointerLock First-Person Look Handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.code === 'KeyF') {
        e.preventDefault();
        if (document.pointerLockElement === renderer.domElement) {
          document.exitPointerLock?.();
        } else {
          renderer.domElement.requestPointerLock?.();
        }
        return;
      }

      const gameCodes = [
        'KeyW',
        'KeyA',
        'KeyS',
        'KeyD',
        'KeyE',
        'KeyQ',
        'KeyC',
        'Space',
        'ShiftLeft',
        'ShiftRight',
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
      ];
      if (gameCodes.includes(e.code)) {
        if (e.code.startsWith('Arrow') || e.code === 'Space') {
          e.preventDefault();
        }
        presetOverrideActiveRef.current = false;
        activeKeysRef.current.add(e.code);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      activeKeysRef.current.delete(e.code);
    };

    const handleWindowBlur = () => {
      activeKeysRef.current.clear();
      _velocityVec.set(0, 0, 0);
    };

    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === renderer.domElement;
      controls.enabled = !locked;
      stateRef.current.onFreeFlyLockChange(locked);
      if (!locked) {
        // Sync OrbitControls target 18 units in front of camera view direction when exiting FPS mouse-look
        camera.getWorldDirection(_forwardVec);
        controls.target.copy(camera.position).addScaledVector(_forwardVec, 18);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== renderer.domElement) return;
      const sensitivity = 0.0022;
      _euler.setFromQuaternion(camera.quaternion);
      _euler.y -= e.movementX * sensitivity;
      _euler.x -= e.movementY * sensitivity;
      _euler.x = Math.max(-Math.PI * 0.47, Math.min(Math.PI * 0.47, _euler.x));
      camera.quaternion.setFromEuler(_euler);

      camera.getWorldDirection(_forwardVec);
      controls.target.copy(camera.position).addScaledVector(_forwardVec, 18);
    };

    const handleVirtualKey = (e: Event) => {
      const customEvent = e as CustomEvent<{ code: string; pressed: boolean }>;
      if (!customEvent.detail) return;
      presetOverrideActiveRef.current = false;
      if (customEvent.detail.pressed) {
        activeKeysRef.current.add(customEvent.detail.code);
      } else {
        activeKeysRef.current.delete(customEvent.detail.code);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('virtual-cam-key', handleVirtualKey);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('mousemove', handleMouseMove);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const { terrainMesh, rocksInstanced } = createOutdoorTerrainAndPerimeters(maxAnisotropy);
    scene.add(terrainMesh);
    scene.add(rocksInstanced);

    // Orbital trajectory ring for the LEO Satellite
    const orbitTrackGeo = new THREE.RingGeometry(42, 42.35, 96);
    orbitTrackGeo.rotateX(Math.PI / 2);
    const orbitTrackMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
    });
    const orbitTrackMesh = new THREE.Mesh(orbitTrackGeo, orbitTrackMat);
    orbitTrackMesh.position.set(6, 46, -2);
    scene.add(orbitTrackMesh);

    const shadowTex = createContactShadowTexture();
    const solarTex = createSolarPanelTexture(maxAnisotropy);

    // Build Composite 3–12 Part Node Models
    const nodeObjectsMap = new Map<
      string,
      {
        group: THREE.Group;
        beaconMesh: THREE.Mesh;
        turretGroup: THREE.Group;
        hitboxMesh: THREE.Mesh;
        selectionRing: THREE.Mesh;
      }
    >();

    const hitboxes: THREE.Object3D[] = [];

    stateRef.current.nodes.forEach((node) => {
      const { group, beaconMesh, turretGroup, hitboxMesh } = createCompositeNodeModel(
        node.role,
        shadowTex,
        solarTex
      );
      group.position.set(node.position[0], node.position[1], node.position[2]);
      hitboxMesh.userData = { nodeId: node.id };
      hitboxes.push(hitboxMesh);

      // Selection ring around node base
      const ringGeo = new THREE.RingGeometry(2.3, 2.65, 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xf43f5e,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const selectionRing = new THREE.Mesh(ringGeo, ringMat);
      selectionRing.position.y = node.role === 'leo_satellite' ? -2.2 : 0.08;
      selectionRing.visible = node.id === stateRef.current.selectedNodeId;
      group.add(selectionRing);

      scene.add(group);
      nodeObjectsMap.set(node.id, {
        group,
        beaconMesh,
        turretGroup,
        hitboxMesh,
        selectionRing,
      });
    });

    // Build Optical Link Beam Cylinders for each Edge
    const edgeMeshesMap = new Map<
      string,
      {
        coreBeam: THREE.Mesh;
        haloBeam: THREE.Mesh;
      }
    >();

    const unitCylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 12, 1, true);

    stateRef.current.edges.forEach((edge) => {
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xf43f5e,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xfb7185,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const coreBeam = new THREE.Mesh(unitCylinderGeo, coreMat);
      const haloBeam = new THREE.Mesh(unitCylinderGeo, haloMat);
      scene.add(coreBeam);
      scene.add(haloBeam);
      edgeMeshesMap.set(edge.id, { coreBeam, haloBeam });
    });

    // Pool of Optical Telemetry Pulse Spheres (for active packet hops)
    const pulsePoolSize = 24;
    const pulseGeo = new THREE.SphereGeometry(0.42, 16, 16);
    const pulseMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
    });
    const pulseMeshes: THREE.Mesh[] = [];
    for (let i = 0; i < pulsePoolSize; i++) {
      const mesh = new THREE.Mesh(pulseGeo, pulseMat.clone());
      mesh.visible = false;
      scene.add(mesh);
      pulseMeshes.push(mesh);
    }

    // Pre-warm shaders
    renderer.compile(scene, camera);

    // High-Performance Raycasting restricted to Layer 1
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointer = new THREE.Vector2();

    let pointerDownPos = { x: 0, y: 0 };

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: PointerEvent) => {
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      if (dx * dx + dy * dy > 36) return; // Ignore drag gestures

      const rect = renderer.domElement.getBoundingClientRect();
      if (document.pointerLockElement === renderer.domElement) {
        pointer.set(0, 0); // Center crosshair pick when in FPS PointerLock mode
      } else {
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      }

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(hitboxes, false);
      if (hits.length > 0) {
        const hitNodeId = hits[0].object.userData?.nodeId;
        if (hitNodeId) {
          stateRef.current.onSelectNode(hitNodeId);
        }
      }
    };

    const handleDoubleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (document.pointerLockElement === renderer.domElement) {
        pointer.set(0, 0);
      } else {
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      }

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(hitboxes, false);
      if (hits.length > 0) {
        const hitNodeId = hits[0].object.userData?.nodeId;
        if (hitNodeId) {
          stateRef.current.onToggleNodeActive(hitNodeId);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('dblclick', handleDoubleClick);

    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = Math.max(1, mount.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    const clock = new THREE.Clock();
    let animFrameId = 0;

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      const {
        nodes: liveNodes,
        edges: liveEdges,
        packets: livePackets,
        selectedNodeId: liveSelectedId,
        cameraPreset: livePreset,
        infraredBand: liveBand,
        weatherDensity: liveWeather,
        freeFlySpeed: liveSpeedMultiplier,
      } = stateRef.current;

      // Update atmospheric fog density smoothly
      if (scene.fog instanceof THREE.FogExp2) {
        const targetFog = 0.0038 + liveWeather * 0.0065;
        scene.fog.density = THREE.MathUtils.damp(scene.fog.density, targetFog, 4, dt);
      }

      // 6-DOF Video-Game Free-Fly Movement (WASD / Arrows / Space-E / Q-C / Shift Turbo)
      const keys = activeKeysRef.current;
      const moveForward =
        (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) -
        (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
      const moveRight =
        (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) -
        (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      const moveUp =
        (keys.has('Space') || keys.has('KeyE') ? 1 : 0) -
        (keys.has('KeyQ') || keys.has('KeyC') ? 1 : 0);
      const sprintBoost =
        keys.has('ShiftLeft') || keys.has('ShiftRight') ? 2.4 : 1.0;

      camera.getWorldDirection(_forwardVec);
      // In PointerLock FPS mode, W/S flies directly along look vector; in Orbit mode, W/S glides horizontally/along view
      if (document.pointerLockElement !== renderer.domElement) {
        _forwardVec.y = 0;
        if (_forwardVec.lengthSq() > 0.0001) _forwardVec.normalize();
      } else {
        _forwardVec.normalize();
      }
      _rightVec.crossVectors(_forwardVec, _upVec).normalize();

      _moveDelta.set(0, 0, 0);
      if (moveForward !== 0) _moveDelta.addScaledVector(_forwardVec, moveForward);
      if (moveRight !== 0) _moveDelta.addScaledVector(_rightVec, moveRight);
      if (moveUp !== 0) _moveDelta.addScaledVector(_upVec, moveUp);

      if (_moveDelta.lengthSq() > 0) {
        _moveDelta.normalize();
      }

      const targetSpeed = 32 * liveSpeedMultiplier * sprintBoost;
      _velocityVec.x = THREE.MathUtils.damp(
        _velocityVec.x,
        _moveDelta.x * targetSpeed,
        10,
        dt
      );
      _velocityVec.y = THREE.MathUtils.damp(
        _velocityVec.y,
        _moveDelta.y * targetSpeed,
        10,
        dt
      );
      _velocityVec.z = THREE.MathUtils.damp(
        _velocityVec.z,
        _moveDelta.z * targetSpeed,
        10,
        dt
      );

      if (_velocityVec.lengthSq() > 0.001) {
        camera.position.addScaledVector(_velocityVec, dt);
        controls.target.addScaledVector(_velocityVec, dt);
        // Prevent camera from clipping below terrain surface
        camera.position.y = Math.max(2.2, Math.min(140, camera.position.y));
      }

      // Smoothly damp camera when preset is selected
      if (presetOverrideActiveRef.current) {
        const target = CAMERA_PRESETS[livePreset];
        _camTargetPos.set(target.pos[0], target.pos[1], target.pos[2]);
        _camLookAt.set(target.look[0], target.look[1], target.look[2]);

        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camTargetPos.x, 4.2, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camTargetPos.y, 4.2, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camTargetPos.z, 4.2, dt);

        _currentLookAt.x = THREE.MathUtils.damp(controls.target.x, _camLookAt.x, 4.8, dt);
        _currentLookAt.y = THREE.MathUtils.damp(controls.target.y, _camLookAt.y, 4.8, dt);
        _currentLookAt.z = THREE.MathUtils.damp(controls.target.z, _camLookAt.z, 4.8, dt);
        controls.target.copy(_currentLookAt);

        if (camera.position.distanceToSquared(_camTargetPos) < 0.25) {
          presetOverrideActiveRef.current = false;
        }
      }

      if (controls.enabled) {
        controls.update();
      }

      // Determine primary infrared spectral color
      const irHex =
        liveBand === '1550nm'
          ? 0xf43f5e // Deep eye-safe C-band Laser IR crimson
          : liveBand === '1310nm'
          ? 0xf97316 // O-band amber-infrared
          : 0xec4899; // 850nm near-IR magenta-red

      const nodeById = new Map<string, OpticalNode>();
      liveNodes.forEach((n) => nodeById.set(n.id, n));

      // Update Node 3D Groups & Beacons
      liveNodes.forEach((node) => {
        const entry = nodeObjectsMap.get(node.id);
        if (!entry) return;

        // Subtle orbital hover for LEO satellite
        if (node.role === 'leo_satellite') {
          const hoverY = node.position[1] + Math.sin(elapsed * 1.1) * 0.45;
          entry.group.position.set(node.position[0], hoverY, node.position[2]);
          entry.group.rotation.y = Math.sin(elapsed * 0.35) * 0.12;
        }

        entry.selectionRing.visible = node.id === liveSelectedId;
        if (entry.selectionRing.visible) {
          entry.selectionRing.rotation.z = elapsed * 0.8;
        }

        const beaconMat = entry.beaconMesh.material as THREE.MeshPhysicalMaterial;
        if (!node.active) {
          beaconMat.color.setHex(0x475569);
          beaconMat.emissive.setHex(0x1e293b);
          beaconMat.emissiveIntensity = 0.2;
        } else if (node.role === 'command_post') {
          beaconMat.color.setHex(0x38bdf8);
          beaconMat.emissive.setHex(0x0284c7);
          beaconMat.emissiveIntensity = 1.1;
        } else {
          beaconMat.color.setHex(irHex);
          beaconMat.emissive.setHex(irHex);
          beaconMat.emissiveIntensity = 0.95;
        }
      });

      // Update Optical Edge Laser Beams
      liveEdges.forEach((edge) => {
        const meshPair = edgeMeshesMap.get(edge.id);
        const sNode = nodeById.get(edge.sourceId);
        const tNode = nodeById.get(edge.targetId);
        if (!meshPair || !sNode || !tNode) return;

        if (edge.blocked) {
          meshPair.coreBeam.visible = false;
          meshPair.haloBeam.visible = false;
          return;
        }

        meshPair.coreBeam.visible = true;
        meshPair.haloBeam.visible = edge.activeInRoute;

        getBeamPortPosition(sNode, _startVec);
        getBeamPortPosition(tNode, _endVec);

        const dist = _startVec.distanceTo(_endVec);
        _midVec.addVectors(_startVec, _endVec).multiplyScalar(0.5);
        _dirVec.subVectors(_endVec, _startVec).normalize();
        _quat.setFromUnitVectors(_upVec, _dirVec);

        const isDownlink = edge.medium === 'ka_optical_downlink';
        const isUplink = edge.medium === 'fso_uplink';

        const coreRadius = edge.activeInRoute
          ? isUplink || isDownlink
            ? 0.14
            : 0.095
          : 0.032;
        const haloRadius = isUplink || isDownlink ? 0.42 : 0.28;

        meshPair.coreBeam.position.copy(_midVec);
        meshPair.coreBeam.quaternion.copy(_quat);
        meshPair.coreBeam.scale.set(coreRadius, dist, coreRadius);

        meshPair.haloBeam.position.copy(_midVec);
        meshPair.haloBeam.quaternion.copy(_quat);
        meshPair.haloBeam.scale.set(haloRadius, dist, haloRadius);

        const coreMat = meshPair.coreBeam.material as THREE.MeshBasicMaterial;
        const haloMat = meshPair.haloBeam.material as THREE.MeshBasicMaterial;

        if (isDownlink) {
          coreMat.color.setHex(0x38bdf8);
          haloMat.color.setHex(0x0ea5e9);
        } else {
          coreMat.color.setHex(irHex);
          haloMat.color.setHex(irHex);
        }

        coreMat.opacity = edge.activeInRoute ? 0.92 : 0.22;
        haloMat.opacity = edge.activeInRoute ? 0.24 : 0.0;
      });

      // Update Continuous Optical Photon Pulses along active edges + custom user-dispatched packets
      let pulseIdx = 0;

      // 1. User-dispatched telemetry packets
      for (const pkt of livePackets) {
        if (pulseIdx >= pulsePoolSize) break;
        const uId = pkt.routeNodeIds[pkt.currentHopIndex];
        const vId = pkt.routeNodeIds[pkt.currentHopIndex + 1];
        const uNode = uId ? nodeById.get(uId) : undefined;
        const vNode = vId ? nodeById.get(vId) : undefined;
        if (uNode && vNode) {
          getBeamPortPosition(uNode, _startVec);
          getBeamPortPosition(vNode, _endVec);
          _midVec.lerpVectors(_startVec, _endVec, pkt.progress);

          const pMesh = pulseMeshes[pulseIdx++];
          pMesh.visible = true;
          pMesh.position.copy(_midVec);
          pMesh.scale.setScalar(1.35);
          (pMesh.material as THREE.MeshBasicMaterial).color.setHex(0xfef08a);
        }
      }

      // 2. Continuous background optical carrier pulses on active edges
      liveEdges.forEach((edge, idx) => {
        if (!edge.activeInRoute || edge.blocked || pulseIdx >= pulsePoolSize) return;
        const sNode = nodeById.get(edge.sourceId);
        const tNode = nodeById.get(edge.targetId);
        if (!sNode || !tNode) return;

        getBeamPortPosition(sNode, _startVec);
        getBeamPortPosition(tNode, _endVec);

        const t = (elapsed * 0.85 + idx * 0.23) % 1;
        _midVec.lerpVectors(_startVec, _endVec, t);

        const pMesh = pulseMeshes[pulseIdx++];
        pMesh.visible = true;
        pMesh.position.copy(_midVec);
        pMesh.scale.setScalar(0.85);
        _color.setHex(edge.medium === 'ka_optical_downlink' ? 0x7dd3fc : 0xfda4af);
        (pMesh.material as THREE.MeshBasicMaterial).color.copy(_color);
      });

      for (let i = pulseIdx; i < pulsePoolSize; i++) {
        pulseMeshes[i].visible = false;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('virtual-cam-key', handleVirtualKey);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('dblclick', handleDoubleClick);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={canvasMountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      {/* Center reticle when in FPS Free-Fly PointerLock mode */}
      {isFreeFlyLocked && (
        <div className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center">
          <div className="w-5 h-5 border border-sky-400/70 rounded-full flex items-center justify-center">
            <div className="w-1 h-1 bg-rose-500 rounded-full" />
          </div>
        </div>
      )}
      {webglLost && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 text-slate-200 p-6 text-center">
          <div>
            <p className="text-lg font-semibold mb-1">Contexto WebGL pausado</p>
            <p className="text-sm text-slate-400">
              Restaurando simulación óptica 3D de la red LiFi infrarroja...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
