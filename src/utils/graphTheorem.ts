import {
  InfraredBand,
  LogisticsDirectiveLog,
  OpticalEdge,
  OpticalNode,
  RoutingAlgorithm,
} from '../types/network';

/**
 * Deterministic terrain height function shared between 3D terrain mesh and node grounding
 */
export function groundHeightAt(x: number, z: number): number {
  const r2 = x * x + z * z;
  // Gentle valley in center with surrounding hills and ridges
  const baseWaves =
    Math.sin(x * 0.045) * Math.cos(z * 0.045) * 2.6 +
    Math.sin(x * 0.11 + z * 0.08) * 0.85;
  const rimElevation = Math.max(0, (r2 - 1800) * 0.0022);
  return baseWaves + rimElevation;
}

export const INITIAL_NODES: OpticalNode[] = [
  // Baliza Bandera de Zona Cero / Punto de Señalización del Equipo de Respuesta
  {
    id: 'flag-zona-cero',
    code: 'BZ-01',
    name: 'Baliza Bandera de Zona Cero & Punto de Reunión IR',
    role: 'flag_beacon',
    position: [-46, groundHeightAt(-46, 16), 16],
    active: true,
    wavelengthNm: 1550,
    txPowerDbm: 23,
    rxSensitivityDbm: -38,
    kirchhoffInGbps: 0,
    kirchhoffOutGbps: 2.4,
    generatedGbps: 2.4,
    consumedGbps: 0,
    degree: 2,
    sectorLabel: 'Sector Sur-Oeste · Punto de Señalización Táctica',
    assignedUnit: 'Baliza Óptica de Extracción y Marcaje de Campo',
  },

  // Equipo de Respuesta en Terreno (Emisores LiFi IR Móviles)
  {
    id: 'unit-alpha',
    code: 'ER-01',
    name: 'Unidad de Respuesta Táctica Alfa',
    role: 'response_unit',
    position: [-38, groundHeightAt(-38, 22), 22],
    active: true,
    wavelengthNm: 1550,
    txPowerDbm: 24,
    rxSensitivityDbm: -38,
    kirchhoffInGbps: 0,
    kirchhoffOutGbps: 4.8,
    generatedGbps: 4.8,
    consumedGbps: 0,
    degree: 3,
    sectorLabel: 'Sector Sur-Oeste · Zona de Impacto',
    assignedUnit: 'Convoy Médico & Rescate Pesado A-1',
  },
  {
    id: 'unit-bravo',
    code: 'ER-02',
    name: 'Escuadrón Logístico Avanzado Bravo',
    role: 'response_unit',
    position: [-34, groundHeightAt(-34, -20), -20],
    active: true,
    wavelengthNm: 1550,
    txPowerDbm: 24,
    rxSensitivityDbm: -38,
    kirchhoffInGbps: 0,
    kirchhoffOutGbps: 3.6,
    generatedGbps: 3.6,
    consumedGbps: 0,
    degree: 2,
    sectorLabel: 'Sector Nor-Oeste · Corredor Vial',
    assignedUnit: 'Brigada de Ingeniería & Puentes B-4',
  },

  // Estaciones Terrestres LiFi Infrarrojo (Estructura de Teorema de Nodos)
  {
    id: 'node-n1',
    code: 'LIFI-N1',
    name: 'Estación Óptica IR Nodo 1 (Cresta Sur)',
    role: 'lifi_relay',
    position: [-16, groundHeightAt(-16, 24), 24],
    active: true,
    wavelengthNm: 1550,
    txPowerDbm: 27,
    rxSensitivityDbm: -42,
    kirchhoffInGbps: 0,
    kirchhoffOutGbps: 0,
    generatedGbps: 0,
    consumedGbps: 0,
    degree: 4,
    sectorLabel: 'Nodo de Distribución Sur',
  },
  {
    id: 'node-n2',
    code: 'LIFI-N2',
    name: 'Estación Óptica IR Nodo 2 (Vaguada Central)',
    role: 'lifi_relay',
    position: [-14, groundHeightAt(-14, 0), 0],
    active: true,
    wavelengthNm: 1550,
    txPowerDbm: 28,
    rxSensitivityDbm: -42,
    kirchhoffInGbps: 0,
    kirchhoffOutGbps: 0,
    generatedGbps: 0,
    consumedGbps: 0,
    degree: 5,
    sectorLabel: 'Nodo Conmutador Central (Pivote Kirchhoff)',
  },
  {
    id: 'node-n3',
    code: 'LIFI-N3',
    name: 'Estación Óptica IR Nodo 3 (Meseta Norte)',
    role: 'lifi_relay',
    position: [-15, groundHeightAt(-15, -24), -24],
    active: true,
    wavelengthNm: 1550,
    txPowerDbm: 27,
    rxSensitivityDbm: -42,
    kirchhoffInGbps: 0,
    kirchhoffOutGbps: 0,
    generatedGbps: 0,
    consumedGbps: 0,
    degree: 4,
    sectorLabel: 'Nodo de Distribución Norte',
  },
  {
    id: 'node-n4',
    code: 'LIFI-N4',
    name: 'Estación Óptica IR Nodo 4 (Enlace Este)',
    role: 'lifi_relay',
    position: [4, groundHeightAt(4, 15), 15],
    active: true,
    wavelengthNm: 1550,
    txPowerDbm: 29,
    rxSensitivityDbm: -44,
    kirchhoffInGbps: 0,
    kirchhoffOutGbps: 0,
    generatedGbps: 0,
    consumedGbps: 0,
    degree: 4,
    sectorLabel: 'Repetidor Óptico de Alta Capacidad',
  },

  // Estaciones Gateway de Subida Láser al Satélite
  {
    id: 'gateway-g1',
    code: 'GW-IR1',
    name: 'Estación Maestra de Subida FSO-IR Primaria',
    role: 'uplink_gateway',
    position: [8, groundHeightAt(8, -12), -12],
    active: true,
    wavelengthNm: 1550,
    txPowerDbm: 36,
    rxSensitivityDbm: -48,
    kirchhoffInGbps: 0,
    kirchhoffOutGbps: 0,
    generatedGbps: 0,
    consumedGbps: 0,
    degree: 4,
    sectorLabel: 'Terminal Telescópico de Subida Satelital 1',
  },
  {
    id: 'gateway-g2',
    code: 'GW-IR2',
    name: 'Estación de Subida FSO-IR Redundante',
    role: 'uplink_gateway',
    position: [18, groundHeightAt(18, 22), 22],
    active: true,
    wavelengthNm: 1550,
    txPowerDbm: 35,
    rxSensitivityDbm: -48,
    kirchhoffInGbps: 0,
    kirchhoffOutGbps: 0,
    generatedGbps: 0,
    consumedGbps: 0,
    degree: 3,
    sectorLabel: 'Terminal Telescópico de Respaldo Sur',
  },

  // Satélite en Órbita Baja (LEO) con Relé Láser Infrarrojo
  {
    id: 'sat-leo-1',
    code: 'SAT-AETHER-01',
    name: 'Satélite Óptico LEO Aether-IR IV',
    role: 'leo_satellite',
    position: [6, 46, -2],
    active: true,
    wavelengthNm: 1550,
    txPowerDbm: 40,
    rxSensitivityDbm: -52,
    kirchhoffInGbps: 0,
    kirchhoffOutGbps: 0,
    generatedGbps: 0,
    consumedGbps: 0,
    degree: 3,
    sectorLabel: 'Órbita polar LEO · Altitud 550 km (Escala Táctica)',
  },

  // Puesto de Mando de la Organización Líder en Dirección Logística
  {
    id: 'command-hq',
    code: 'PM-LOG-01',
    name: 'Puesto de Mando — Dirección Logística de Respuesta',
    role: 'command_post',
    position: [38, groundHeightAt(38, -4), -4],
    active: true,
    wavelengthNm: 1550,
    txPowerDbm: 38,
    rxSensitivityDbm: -50,
    kirchhoffInGbps: 8.4,
    kirchhoffOutGbps: 0,
    generatedGbps: 0,
    consumedGbps: 8.4,
    degree: 1,
    sectorLabel: 'Centro Estratégico de Coordinación y Despacho',
    assignedUnit: 'Dirección General de Operaciones y Suministros',
  },
];

export const INITIAL_EDGE_PAIRS: Array<{
  id: string;
  sourceId: string;
  targetId: string;
  medium: OpticalEdge['medium'];
  baseCapacityGbps: number;
}> = [
  // Enlaces LiFi IR desde la Baliza Bandera de Zona Cero
  { id: 'e-bz-ua', sourceId: 'flag-zona-cero', targetId: 'unit-alpha', medium: 'infrared_lifi', baseCapacityGbps: 8 },
  { id: 'e-bz-n1', sourceId: 'flag-zona-cero', targetId: 'node-n1', medium: 'infrared_lifi', baseCapacityGbps: 9 },

  // Conexiones desde Equipos de Respuesta a Nodos LiFi IR
  { id: 'e-ua-n1', sourceId: 'unit-alpha', targetId: 'node-n1', medium: 'infrared_lifi', baseCapacityGbps: 10 },
  { id: 'e-ua-n2', sourceId: 'unit-alpha', targetId: 'node-n2', medium: 'infrared_lifi', baseCapacityGbps: 8 },
  { id: 'e-ub-n2', sourceId: 'unit-bravo', targetId: 'node-n2', medium: 'infrared_lifi', baseCapacityGbps: 9 },
  { id: 'e-ub-n3', sourceId: 'unit-bravo', targetId: 'node-n3', medium: 'infrared_lifi', baseCapacityGbps: 10 },

  // Malla Teorema de Nodos entre Estaciones Terrestres LiFi IR
  { id: 'e-n1-n2', sourceId: 'node-n1', targetId: 'node-n2', medium: 'infrared_lifi', baseCapacityGbps: 12 },
  { id: 'e-n2-n3', sourceId: 'node-n2', targetId: 'node-n3', medium: 'infrared_lifi', baseCapacityGbps: 12 },
  { id: 'e-n1-n4', sourceId: 'node-n1', targetId: 'node-n4', medium: 'infrared_lifi', baseCapacityGbps: 14 },
  { id: 'e-n2-n4', sourceId: 'node-n2', targetId: 'node-n4', medium: 'infrared_lifi', baseCapacityGbps: 15 },
  { id: 'e-n2-g1', sourceId: 'node-n2', targetId: 'gateway-g1', medium: 'infrared_lifi', baseCapacityGbps: 16 },
  { id: 'e-n3-g1', sourceId: 'node-n3', targetId: 'gateway-g1', medium: 'infrared_lifi', baseCapacityGbps: 15 },
  { id: 'e-n4-g1', sourceId: 'node-n4', targetId: 'gateway-g1', medium: 'infrared_lifi', baseCapacityGbps: 18 },
  { id: 'e-n4-g2', sourceId: 'node-n4', targetId: 'gateway-g2', medium: 'infrared_lifi', baseCapacityGbps: 16 },
  { id: 'e-n1-g2', sourceId: 'node-n1', targetId: 'gateway-g2', medium: 'infrared_lifi', baseCapacityGbps: 11 },

  // Enlaces de Subida Óptica en Espacio Libre (FSO IR) hacia el Satélite
  { id: 'e-g1-sat', sourceId: 'gateway-g1', targetId: 'sat-leo-1', medium: 'fso_uplink', baseCapacityGbps: 25 },
  { id: 'e-g2-sat', sourceId: 'gateway-g2', targetId: 'sat-leo-1', medium: 'fso_uplink', baseCapacityGbps: 22 },

  // Enlace Descendente del Satélite al Puesto de Mando Logístico
  { id: 'e-sat-hq', sourceId: 'sat-leo-1', targetId: 'command-hq', medium: 'ka_optical_downlink', baseCapacityGbps: 40 },
];

export const INITIAL_DIRECTIVE_LOGS: LogisticsDirectiveLog[] = [
  {
    id: 'dir-101',
    timestamp: '16:41:12 UTC',
    originUnit: 'ER-01 · Unidad Táctica Alfa',
    relayPath: 'ER-01 → LIFI-N1 → LIFI-N4 → GW-IR1 → SAT-AETHER-01 → PM-LOG-01',
    satelliteId: 'SAT-AETHER-01 (1550 nm)',
    commandCenterAction: 'Despliegue de Convoy Hidráulico y Planta Potabilizadora Móvil',
    supplyAllocation: '14.5 Toneladas · Kit Quirúrgico + Generadores 400kW',
    etaMinutes: 18,
    opticalSnrDb: 29.4,
    priority: 'Crítica',
  },
  {
    id: 'dir-102',
    timestamp: '16:42:45 UTC',
    originUnit: 'ER-02 · Escuadrón Bravo',
    relayPath: 'ER-02 → LIFI-N3 → GW-IR1 → SAT-AETHER-01 → PM-LOG-01',
    satelliteId: 'SAT-AETHER-01 (1550 nm)',
    commandCenterAction: 'Autorización de Puente Modular Táctico en Sector Nor-Oeste',
    supplyAllocation: '22.0 Toneladas · Vigas Reticulares + Drones de Reconocimiento IR',
    etaMinutes: 24,
    opticalSnrDb: 31.2,
    priority: 'Alta',
  },
];

/**
 * Beer-Lambert atmospheric IR attenuation factor based on wavelength (850nm, 1310nm, 1550nm)
 * 1550nm has the lowest atmospheric scattering in haze/fog and highest eye-safe transmit power.
 */
export function getWavelengthAlpha(band: InfraredBand, weatherDensity: number): number {
  const baseCoeff =
    band === '1550nm' ? 0.042 : band === '1310nm' ? 0.068 : 0.105;
  return baseCoeff * (1 + weatherDensity * 1.8);
}

/**
 * Computes the complete Node-Theorem graph state (distances, Beer-Lambert optical attenuation,
 * Dijkstra / Max-Flow / Kruskal optimal routing paths, and Kirchhoff Node Law conservation).
 */
export function solveOpticalNodeTheorem(
  nodes: OpticalNode[],
  algorithm: RoutingAlgorithm,
  band: InfraredBand,
  weatherDensity: number
): {
  nodes: OpticalNode[];
  edges: OpticalEdge[];
  routesByUnit: Record<string, string[]>;
  totalSystemThroughputGbps: number;
  averageAttenuationDb: number;
  kirchhoffResidualError: number;
} {
  const wavelengthNum = parseInt(band.replace('nm', ''), 10);
  const alpha = getWavelengthAlpha(band, weatherDensity);

  const nodeMap = new Map<string, OpticalNode>();
  const updatedNodes: OpticalNode[] = nodes.map((n) => ({
    ...n,
    wavelengthNm: wavelengthNum,
    kirchhoffInGbps: 0,
    kirchhoffOutGbps: 0,
    generatedGbps:
      n.active && (n.role === 'response_unit' || n.role === 'flag_beacon')
        ? n.id === 'unit-alpha'
          ? 4.8
          : n.id === 'unit-bravo'
          ? 3.6
          : 2.4
        : 0,
    consumedGbps: 0,
    degree: 0,
  }));

  updatedNodes.forEach((n) => nodeMap.set(n.id, n));

  // Build edges with physical Euclidean distance and Beer-Lambert IR attenuation
  const edges: OpticalEdge[] = INITIAL_EDGE_PAIRS.map((pair) => {
    const s = nodeMap.get(pair.sourceId)!;
    const t = nodeMap.get(pair.targetId)!;
    const dx = s.position[0] - t.position[0];
    const dy = s.position[1] - t.position[1];
    const dz = s.position[2] - t.position[2];
    const distScene = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const distanceMeters = Math.round(distScene * 45); // Tactical scale: 1 unit = 45m

    // Beer-Lambert + geometric beam divergence loss (dB)
    const geoLossDb = pair.medium === 'infrared_lifi' ? 1.8 : 3.2;
    const attenuationDb = Number(
      (geoLossDb + distScene * alpha * 1.35).toFixed(2)
    );

    // Wavelength & weather impact on optical link capacity (Shannon-Hartley optical approximation)
    const bandMultiplier =
      band === '1550nm' ? 1.0 : band === '1310nm' ? 0.88 : 0.76;
    const weatherFactor = Math.max(0.45, 1 - weatherDensity * 0.35);
    const capacityGbps = Number(
      (pair.baseCapacityGbps * bandMultiplier * weatherFactor).toFixed(1)
    );

    const blocked = !s.active || !t.active;

    if (!blocked) {
      s.degree += 1;
      t.degree += 1;
    }

    return {
      id: pair.id,
      sourceId: pair.sourceId,
      targetId: pair.targetId,
      medium: pair.medium,
      distanceMeters,
      attenuationDb,
      capacityGbps,
      currentFlowGbps: 0,
      activeInRoute: false,
      blocked,
      wavelengthNm: wavelengthNum,
    };
  });

  // Helper to find optimal path from a source node to 'command-hq'
  const findPathToCommand = (startId: string): string[] => {
    const startNode = nodeMap.get(startId);
    const endNode = nodeMap.get('command-hq');
    if (!startNode?.active || !endNode?.active) return [];

    // Adjacency list (directed forward along tactical hierarchy, bidirectional between lifi_relay nodes)
    const adj = new Map<string, Array<{ to: string; edge: OpticalEdge; weight: number }>>();
    updatedNodes.forEach((n) => adj.set(n.id, []));

    edges.forEach((edge) => {
      if (edge.blocked) return;
      const sNode = nodeMap.get(edge.sourceId)!;
      const tNode = nodeMap.get(edge.targetId)!;

      let weight = edge.attenuationDb;
      if (algorithm === 'max_flow') {
        // Favor highest residual capacity
        weight = 100 / Math.max(0.5, edge.capacityGbps - edge.currentFlowGbps);
      } else if (algorithm === 'kruskal_mst') {
        // Favor minimum physical distance backbone
        weight = edge.distanceMeters * 0.01;
      }

      adj.get(edge.sourceId)!.push({ to: edge.targetId, edge, weight });
      // Allow bidirectional mesh routing between terrestrial LiFi relay stations
      if (sNode.role === 'lifi_relay' && tNode.role === 'lifi_relay') {
        adj.get(edge.targetId)!.push({ to: edge.sourceId, edge, weight });
      }
    });

    const dist = new Map<string, number>();
    const prev = new Map<string, string | null>();
    const visited = new Set<string>();

    updatedNodes.forEach((n) => {
      dist.set(n.id, Infinity);
      prev.set(n.id, null);
    });
    dist.set(startId, 0);

    while (visited.size < updatedNodes.length) {
      let u: string | null = null;
      let bestDist = Infinity;
      for (const [id, d] of dist.entries()) {
        if (!visited.has(id) && d < bestDist) {
          bestDist = d;
          u = id;
        }
      }
      if (!u || u === 'command-hq') break;
      visited.add(u);

      const neighbors = adj.get(u) || [];
      for (const { to, weight } of neighbors) {
        if (visited.has(to)) continue;
        const alt = bestDist + weight;
        if (alt < (dist.get(to) ?? Infinity)) {
          dist.set(to, alt);
          prev.set(to, u);
        }
      }
    }

    if ((dist.get('command-hq') ?? Infinity) === Infinity) return [];
    const path: string[] = [];
    let curr: string | null = 'command-hq';
    while (curr) {
      path.unshift(curr);
      curr = prev.get(curr) ?? null;
    }
    return path;
  };

  const routesByUnit: Record<string, string[]> = {};
  const responseUnits = updatedNodes.filter(
    (n) => n.role === 'response_unit' || n.role === 'flag_beacon'
  );

  for (const unit of responseUnits) {
    const path = findPathToCommand(unit.id);
    routesByUnit[unit.id] = path;

    if (path.length > 1) {
      const flow = unit.generatedGbps;
      for (let i = 0; i < path.length - 1; i++) {
        const u = path[i];
        const v = path[i + 1];
        const edge = edges.find(
          (e) =>
            (e.sourceId === u && e.targetId === v) ||
            (e.sourceId === v && e.targetId === u)
        );
        if (edge) {
          edge.activeInRoute = true;
          edge.currentFlowGbps = Number((edge.currentFlowGbps + flow).toFixed(2));
        }
        const uNode = nodeMap.get(u)!;
        const vNode = nodeMap.get(v)!;
        uNode.kirchhoffOutGbps = Number((uNode.kirchhoffOutGbps + flow).toFixed(2));
        vNode.kirchhoffInGbps = Number((vNode.kirchhoffInGbps + flow).toFixed(2));
      }
    } else {
      unit.generatedGbps = 0;
    }
  }

  const hqNode = nodeMap.get('command-hq')!;
  hqNode.consumedGbps = hqNode.kirchhoffInGbps;

  const activeEdges = edges.filter((e) => e.activeInRoute);
  const averageAttenuationDb =
    activeEdges.length > 0
      ? Number(
          (
            activeEdges.reduce((acc, e) => acc + e.attenuationDb, 0) /
            activeEdges.length
          ).toFixed(2)
        )
      : 0;

  // Verify Kirchhoff's Current/Flow Conservation Law across all intermediate relay/satellite nodes:
  // sum(I_in) - sum(I_out) == 0
  let kirchhoffResidualError = 0;
  for (const n of updatedNodes) {
    if (
      n.role !== 'response_unit' &&
      n.role !== 'flag_beacon' &&
      n.role !== 'command_post'
    ) {
      kirchhoffResidualError += Math.abs(n.kirchhoffInGbps - n.kirchhoffOutGbps);
    }
  }

  return {
    nodes: updatedNodes,
    edges,
    routesByUnit,
    totalSystemThroughputGbps: Number(hqNode.consumedGbps.toFixed(2)),
    averageAttenuationDb,
    kirchhoffResidualError: Number(kirchhoffResidualError.toFixed(4)),
  };
}
