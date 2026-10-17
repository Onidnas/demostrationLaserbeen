export type NodeRole =
  | 'flag_beacon'
  | 'response_unit'
  | 'lifi_relay'
  | 'uplink_gateway'
  | 'leo_satellite'
  | 'command_post';

export type RoutingAlgorithm = 'dijkstra' | 'max_flow' | 'kruskal_mst';

export type InfraredBand = '850nm' | '1310nm' | '1550nm';

export type CameraPreset =
  | 'overview'
  | 'lifi_mesh'
  | 'satellite_orbit'
  | 'command_post'
  | 'response_team';

export interface OpticalNode {
  id: string;
  code: string;
  name: string;
  role: NodeRole;
  position: [number, number, number]; // x, y, z in world space
  active: boolean;
  wavelengthNm: number;
  txPowerDbm: number;
  rxSensitivityDbm: number;
  kirchhoffInGbps: number;
  kirchhoffOutGbps: number;
  generatedGbps: number;
  consumedGbps: number;
  degree: number;
  sectorLabel: string;
  assignedUnit?: string;
}

export interface OpticalEdge {
  id: string;
  sourceId: string;
  targetId: string;
  medium: 'infrared_lifi' | 'fso_uplink' | 'ka_optical_downlink';
  distanceMeters: number;
  attenuationDb: number;
  capacityGbps: number;
  currentFlowGbps: number;
  activeInRoute: boolean;
  blocked: boolean;
  wavelengthNm: number;
}

export interface TelemetryPacket {
  id: string;
  originNodeId: string;
  destinationNodeId: string;
  routeNodeIds: string[];
  currentHopIndex: number;
  progress: number; // 0..1 along current hop
  payloadTitle: string;
  priority: 'Crítica' | 'Alta' | 'Estándar';
  logisticsDirective: string;
  timestamp: string;
  wavelengthNm: number;
  throughputGbps: number;
}

export interface LogisticsDirectiveLog {
  id: string;
  timestamp: string;
  originUnit: string;
  relayPath: string;
  satelliteId: string;
  commandCenterAction: string;
  supplyAllocation: string;
  etaMinutes: number;
  opticalSnrDb: number;
  priority: 'Crítica' | 'Alta' | 'Estándar';
}
