import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Gamepad2,
  Radio,
  RotateCcw,
  Send,
  ShieldAlert,
  Sliders,
  Truck,
} from 'lucide-react';
import {
  InfraredBand,
  LogisticsDirectiveLog,
  OpticalEdge,
  OpticalNode,
  RoutingAlgorithm,
} from '../types/network';

interface BottomControlDockProps {
  nodes: OpticalNode[];
  edges: OpticalEdge[];
  selectedNode: OpticalNode;
  algorithm: RoutingAlgorithm;
  infraredBand: InfraredBand;
  weatherDensity: number;
  totalThroughputGbps: number;
  averageAttenuationDb: number;
  kirchhoffResidualError: number;
  directiveLogs: LogisticsDirectiveLog[];
  routesByUnit: Record<string, string[]>;
  freeFlySpeed: number;
  isFreeFlyLocked: boolean;
  onChangeFreeFlySpeed: (speed: number) => void;
  onToggleFreeFlyLock: () => void;
  onSelectNode: (id: string) => void;
  onToggleNodeActive: (id: string) => void;
  onChangeAlgorithm: (alg: RoutingAlgorithm) => void;
  onChangeBand: (band: InfraredBand) => void;
  onChangeWeather: (density: number) => void;
  onDispatchTelemetry: (
    originUnitId: string,
    directiveText: string,
    priority: 'Crítica' | 'Alta' | 'Estándar'
  ) => void;
  onResetNetwork: () => void;
}

type DockTab =
  | 'node_theorem'
  | 'station_inspector'
  | 'command_logistics'
  | 'free_camera';

function triggerVirtualCamKey(code: string, pressed: boolean) {
  window.dispatchEvent(
    new CustomEvent('virtual-cam-key', { detail: { code, pressed } })
  );
}

export const BottomControlDock: React.FC<BottomControlDockProps> = ({
  nodes,
  edges,
  selectedNode,
  algorithm,
  infraredBand,
  weatherDensity,
  totalThroughputGbps,
  averageAttenuationDb,
  kirchhoffResidualError,
  directiveLogs,
  routesByUnit,
  freeFlySpeed,
  isFreeFlyLocked,
  onChangeFreeFlySpeed,
  onToggleFreeFlyLock,
  onSelectNode,
  onToggleNodeActive,
  onChangeAlgorithm,
  onChangeBand,
  onChangeWeather,
  onDispatchTelemetry,
  onResetNetwork,
}) => {
  const [collapsed, setCollapsed] = useState(true);
  const [activeTab, setActiveTab] = useState<DockTab>('node_theorem');
  const [selectedOriginUnit, setSelectedOriginUnit] = useState<
    'flag-zona-cero' | 'unit-alpha' | 'unit-bravo'
  >('flag-zona-cero');
  const [customDirective, setCustomDirective] = useState(
    'Punto de Extracción BZ-01: Evacuación Aeromédica + Suministro IR'
  );
  const [priority, setPriority] = useState<'Crítica' | 'Alta' | 'Estándar'>(
    'Crítica'
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'h' || e.key === 'H') {
        setCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const canToggleSelected =
    selectedNode.role === 'lifi_relay' ||
    selectedNode.role === 'uplink_gateway';

  const connectedEdges = edges.filter(
    (e) => e.sourceId === selectedNode.id || e.targetId === selectedNode.id
  );

  return (
    <footer className="relative z-10 border-t border-[rgba(228,224,231,0.1)] bg-[#0a0a0c] px-4 sm:px-8 py-4 flex flex-col items-center">
      {/* Expanded Technical Control Drawer above the status trigger */}
      {!collapsed && (
        <div className="w-full max-w-[1120px] mb-4 bg-[#0a0a0c] border border-[#e4e4e7] p-4 text-[#e4e4e7]">
          {/* Drawer Header: Technical Tabs + Kirchhoff Telemetry */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-3 mb-3 border-b border-[rgba(228,224,231,0.15)]">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('node_theorem')}
                className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'node_theorem'
                    ? 'bg-[#ff3b3b] text-[#0a0a0c] border-[#ff3b3b] font-bold'
                    : 'bg-transparent text-[rgba(228,224,231,0.65)] border-[rgba(228,224,231,0.2)] hover:text-[#e4e4e7]'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>01. Teorema de Nodos</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('station_inspector')}
                className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'station_inspector'
                    ? 'bg-[#ff3b3b] text-[#0a0a0c] border-[#ff3b3b] font-bold'
                    : 'bg-transparent text-[rgba(228,224,231,0.65)] border-[rgba(228,224,231,0.2)] hover:text-[#e4e4e7]'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>02. Estación ({selectedNode.code})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('command_logistics')}
                className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'command_logistics'
                    ? 'bg-[#ff3b3b] text-[#0a0a0c] border-[#ff3b3b] font-bold'
                    : 'bg-transparent text-[rgba(228,224,231,0.65)] border-[rgba(228,224,231,0.2)] hover:text-[#e4e4e7]'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>03. Puesto de Mando</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('free_camera')}
                className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'free_camera'
                    ? 'bg-[#ff3b3b] text-[#0a0a0c] border-[#ff3b3b] font-bold'
                    : 'bg-transparent text-[rgba(228,224,231,0.65)] border-[rgba(228,224,231,0.2)] hover:text-[#e4e4e7]'
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>04. Cámara Videojuego (WASD)</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-[rgba(228,224,231,0.75)]">
              <span>CAUDAL: {totalThroughputGbps} GBPS</span>
              <span aria-hidden="true">·</span>
              <span>ATENUACIÓN: {averageAttenuationDb} DB</span>
              <span aria-hidden="true">·</span>
              <span>KIRCHHOFF (ΣI_IN − ΣI_OUT): {kirchhoffResidualError} GBPS</span>
            </div>
          </div>

          {/* TAB 1: NODE THEOREM & INFRARED LIFI PARAMETERS */}
          {activeTab === 'node_theorem' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-4 space-y-1.5">
                <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[rgba(228,224,231,0.5)]">
                  Algoritmo del Teorema de Nodos (G = V, E)
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      ['dijkstra', 'Dijkstra IR'],
                      ['max_flow', 'Flujo Máx'],
                      ['kruskal_mst', 'Kruskal MST'],
                    ] as [RoutingAlgorithm, string][]
                  ).map(([algKey, label]) => (
                    <button
                      key={algKey}
                      type="button"
                      onClick={() => onChangeAlgorithm(algKey)}
                      className={`px-2 py-1.5 font-mono text-[11px] uppercase border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        algorithm === algKey
                          ? 'border-[#ff3b3b] text-[#ff3b3b] font-bold bg-[rgba(255,59,59,0.08)]'
                          : 'border-[rgba(228,224,231,0.2)] text-[rgba(228,224,231,0.6)] hover:text-[#e4e4e7]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-4 space-y-1.5">
                <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-[rgba(228,224,231,0.5)]">
                  Espectro Óptico LiFi Infrarrojo
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {(['850nm', '1310nm', '1550nm'] as InfraredBand[]).map(
                    (band) => (
                      <button
                        key={band}
                        type="button"
                        onClick={() => onChangeBand(band)}
                        className={`px-2 py-1.5 font-mono text-[11px] uppercase border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          infraredBand === band
                            ? 'bg-[#ff3b3b] text-[#0a0a0c] border-[#ff3b3b] font-bold'
                            : 'border-[rgba(228,224,231,0.2)] text-[rgba(228,224,231,0.6)] hover:text-[#e4e4e7]'
                        }`}
                      >
                        {band}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="md:col-span-4 flex items-center gap-3">
                <div className="flex-1 space-y-1.5">
                  <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.08em]">
                    <span className="text-[rgba(228,224,231,0.5)]">
                      Atenuación Atmosférica
                    </span>
                    <span className="text-[#e4e4e7]">
                      {Math.round(weatherDensity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.85}
                    step={0.05}
                    value={weatherDensity}
                    onChange={(e) =>
                      onChangeWeather(parseFloat(e.target.value))
                    }
                    className="w-full accent-[#ff3b3b] cursor-pointer h-1.5 bg-[rgba(228,224,231,0.15)]"
                  />
                </div>
                <button
                  type="button"
                  onClick={onResetNetwork}
                  className="px-3 py-2 font-mono text-[11px] uppercase tracking-[0.06em] text-[#e4e4e7] border border-[#e4e4e7] hover:bg-[#e4e4e7] hover:text-[#0a0a0c] transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar</span>
                </button>
              </div>

              <div className="md:col-span-12 pt-2 border-t border-[rgba(228,224,231,0.1)] flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[rgba(228,224,231,0.5)] mr-1">
                    Nodos:
                  </span>
                  {nodes.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => {
                        onSelectNode(n.id);
                        setActiveTab('station_inspector');
                      }}
                      className={`px-2 py-0.5 font-mono text-[11px] uppercase border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        selectedNode.id === n.id
                          ? 'bg-[#ff3b3b] text-[#0a0a0c] border-[#ff3b3b] font-bold'
                          : !n.active
                          ? 'border-[rgba(228,224,231,0.15)] text-[rgba(228,224,231,0.3)] line-through'
                          : 'border-[rgba(228,224,231,0.25)] text-[#e4e4e7] hover:border-[#e4e4e7]'
                      }`}
                    >
                      {n.code}
                    </button>
                  ))}
                </div>
                <span className="font-mono text-[11px] text-[rgba(228,224,231,0.65)]">
                  RUTA BZ-01:{' '}
                  {(routesByUnit['flag-zona-cero'] || [])
                    .map((id) => nodes.find((n) => n.id === id)?.code)
                    .join(' → ') || 'SIN ENLACE'}
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: STATION INSPECTOR */}
          {activeTab === 'station_inspector' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-5 space-y-1">
                <div className="flex items-center gap-2 font-mono text-[11px] text-[rgba(228,224,231,0.6)]">
                  <span className="text-[#ff3b3b] font-bold">
                    {selectedNode.code}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedNode.sectorLabel}</span>
                </div>
                <h3 className="text-sm font-semibold text-[#e4e4e7]">
                  {selectedNode.name}
                </h3>
                <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-[rgba(228,224,231,0.75)] pt-1">
                  <span>
                    ESTADO: {selectedNode.active ? 'OPERATIVA' : 'OBSTRUIDA'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>GRADO: {selectedNode.degree} ENLACES</span>
                  <span aria-hidden="true">·</span>
                  <span>TX: {selectedNode.txPowerDbm} DBM</span>
                </div>
              </div>

              <div className="md:col-span-4 border border-[rgba(228,224,231,0.2)] p-2.5 font-mono text-xs space-y-1">
                <div className="text-[rgba(228,224,231,0.5)] flex items-center justify-between text-[11px]">
                  <span>BALANCE NODAL KIRCHHOFF</span>
                  <span>λ = {selectedNode.wavelengthNm} NM</span>
                </div>
                <div className="flex items-center justify-between text-[#e4e4e7]">
                  <span>FLUJO ENTRADA (ΣI_IN):</span>
                  <span>
                    {(
                      selectedNode.kirchhoffInGbps + selectedNode.generatedGbps
                    ).toFixed(2)}{' '}
                    GBPS
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#e4e4e7]">
                  <span>FLUJO SALIDA (ΣI_OUT):</span>
                  <span>
                    {(
                      selectedNode.kirchhoffOutGbps + selectedNode.consumedGbps
                    ).toFixed(2)}{' '}
                    GBPS
                  </span>
                </div>
                <div className="text-[10px] text-[rgba(228,224,231,0.5)] pt-0.5 border-t border-[rgba(228,224,231,0.1)]">
                  ENLACES ACTIVOS ADYACENTES:{' '}
                  {connectedEdges.filter((e) => !e.blocked).length} /{' '}
                  {connectedEdges.length}
                </div>
              </div>

              <div className="md:col-span-3 flex flex-col gap-2">
                {canToggleSelected ? (
                  <button
                    type="button"
                    onClick={() => onToggleNodeActive(selectedNode.id)}
                    className="w-full py-2.5 px-4 font-mono text-xs font-bold uppercase tracking-[0.05em] bg-[#ff3b3b] text-[#0a0a0c] hover:opacity-90 transition-opacity flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>
                      {selectedNode.active
                        ? 'Simular Obstrucción IR'
                        : 'Reactivar Estación Óptica'}
                    </span>
                  </button>
                ) : (
                  <div className="font-mono text-[11px] text-[rgba(228,224,231,0.6)] border border-[rgba(228,224,231,0.2)] p-2.5">
                    NODO PRINCIPAL PROTEGIDO. SELECCIONE UNA ESTACIÓN LIFI-N1..N4 O GW PARA SIMULAR CORTE ÓPTICO.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: LOGISTICS COMMAND POST */}
          {activeTab === 'command_logistics' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-5 space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      ['flag-zona-cero', 'Baliza BZ-01'],
                      ['unit-alpha', 'ER-01 Alfa'],
                      ['unit-bravo', 'ER-02 Bravo'],
                    ] as const
                  ).map(([unitId, label]) => (
                    <button
                      key={unitId}
                      type="button"
                      onClick={() => setSelectedOriginUnit(unitId)}
                      className={`px-2.5 py-1 font-mono text-[11px] uppercase border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        selectedOriginUnit === unitId
                          ? 'bg-[#ff3b3b] text-[#0a0a0c] border-[#ff3b3b] font-bold'
                          : 'border-[rgba(228,224,231,0.25)] text-[rgba(228,224,231,0.65)] hover:text-[#e4e4e7]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  <select
                    value={priority}
                    onChange={(e) =>
                      setPriority(
                        e.target.value as 'Crítica' | 'Alta' | 'Estándar'
                      )
                    }
                    className="bg-[#0a0a0c] border border-[rgba(228,224,231,0.3)] font-mono text-[11px] uppercase text-[#e4e4e7] px-2 py-1"
                  >
                    <option value="Crítica">Prioridad Crítica</option>
                    <option value="Alta">Prioridad Alta</option>
                    <option value="Estándar">Prioridad Estándar</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customDirective}
                    onChange={(e) => setCustomDirective(e.target.value)}
                    placeholder="Directriz logística para el Puesto de Mando..."
                    className="flex-1 bg-[#0a0a0c] border border-[rgba(228,224,231,0.3)] px-3 py-1.5 text-xs text-[#e4e4e7] focus:outline-none focus:border-[#ff3b3b]"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onDispatchTelemetry(
                        selectedOriginUnit,
                        customDirective,
                        priority
                      )
                    }
                    className="px-4 py-1.5 bg-[#ff3b3b] text-[#0a0a0c] font-mono text-xs font-bold uppercase tracking-[0.05em] flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Transmitir</span>
                  </button>
                </div>
              </div>

              <div className="md:col-span-7 border border-[rgba(228,224,231,0.2)] p-2.5 max-h-28 overflow-y-auto space-y-2">
                {directiveLogs.map((log) => (
                  <div
                    key={log.id}
                    className="pb-2 last:pb-0 border-b last:border-b-0 border-[rgba(228,224,231,0.12)] text-xs"
                  >
                    <div className="flex items-center justify-between text-[rgba(228,224,231,0.55)] font-mono text-[10px] uppercase">
                      <span>
                        {log.timestamp} · {log.originUnit} · PRIORIDAD{' '}
                        {log.priority}
                      </span>
                      <span>
                        SNR: {log.opticalSnrDb} DB · ETA: {log.etaMinutes} MIN
                      </span>
                    </div>
                    <div className="font-medium text-[#e4e4e7] mt-0.5">
                      {log.commandCenterAction} —{' '}
                      <span className="text-[#ff3b3b] font-mono">
                        {log.supplyAllocation}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-[rgba(228,224,231,0.5)] truncate">
                      RUTA NODAL: {log.relayPath}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: FREE-FLY VIDEO GAME CAMERA CONTROLS */}
          {activeTab === 'free_camera' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-5 space-y-2">
                <div className="text-xs text-[rgba(228,224,231,0.8)] leading-relaxed">
                  Vuelo libre activo en todo momento con{' '}
                  <span className="font-mono text-[#e4e4e7] font-bold">
                    W A S D
                  </span>{' '}
                  o{' '}
                  <span className="font-mono text-[#e4e4e7] font-bold">
                    Flechas
                  </span>
                  , ascenso con{' '}
                  <span className="font-mono text-[#e4e4e7] font-bold">
                    Espacio / E
                  </span>
                  , descenso con{' '}
                  <span className="font-mono text-[#e4e4e7] font-bold">
                    Q / C
                  </span>{' '}
                  y turbo con{' '}
                  <span className="font-mono text-[#e4e4e7] font-bold">
                    Shift
                  </span>
                  .
                </div>
                <button
                  type="button"
                  onClick={onToggleFreeFlyLock}
                  className="px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.05em] bg-[#ff3b3b] text-[#0a0a0c] flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Gamepad2 className="w-4 h-4" />
                  <span>
                    {isFreeFlyLocked
                      ? 'Salir de Vista Ratón FPS (ESC o Tecla F)'
                      : 'Activar Vista Libre 1ª Persona con Ratón (Tecla F)'}
                  </span>
                </button>
              </div>

              <div className="md:col-span-4 flex items-center justify-center gap-3">
                <div className="grid grid-cols-3 gap-1">
                  <div />
                  <button
                    type="button"
                    onPointerDown={() => triggerVirtualCamKey('KeyW', true)}
                    onPointerUp={() => triggerVirtualCamKey('KeyW', false)}
                    onPointerLeave={() => triggerVirtualCamKey('KeyW', false)}
                    className="px-3 py-1.5 border border-[rgba(228,224,231,0.3)] hover:border-[#ff3b3b] active:bg-[#ff3b3b] active:text-[#0a0a0c] text-xs font-mono text-[#e4e4e7] cursor-pointer"
                  >
                    W ▲
                  </button>
                  <div />
                  <button
                    type="button"
                    onPointerDown={() => triggerVirtualCamKey('KeyA', true)}
                    onPointerUp={() => triggerVirtualCamKey('KeyA', false)}
                    onPointerLeave={() => triggerVirtualCamKey('KeyA', false)}
                    className="px-3 py-1.5 border border-[rgba(228,224,231,0.3)] hover:border-[#ff3b3b] active:bg-[#ff3b3b] active:text-[#0a0a0c] text-xs font-mono text-[#e4e4e7] cursor-pointer"
                  >
                    ◄ A
                  </button>
                  <button
                    type="button"
                    onPointerDown={() => triggerVirtualCamKey('KeyS', true)}
                    onPointerUp={() => triggerVirtualCamKey('KeyS', false)}
                    onPointerLeave={() => triggerVirtualCamKey('KeyS', false)}
                    className="px-3 py-1.5 border border-[rgba(228,224,231,0.3)] hover:border-[#ff3b3b] active:bg-[#ff3b3b] active:text-[#0a0a0c] text-xs font-mono text-[#e4e4e7] cursor-pointer"
                  >
                    S ▼
                  </button>
                  <button
                    type="button"
                    onPointerDown={() => triggerVirtualCamKey('KeyD', true)}
                    onPointerUp={() => triggerVirtualCamKey('KeyD', false)}
                    onPointerLeave={() => triggerVirtualCamKey('KeyD', false)}
                    className="px-3 py-1.5 border border-[rgba(228,224,231,0.3)] hover:border-[#ff3b3b] active:bg-[#ff3b3b] active:text-[#0a0a0c] text-xs font-mono text-[#e4e4e7] cursor-pointer"
                  >
                    D ►
                  </button>
                </div>

                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onPointerDown={() => triggerVirtualCamKey('KeyE', true)}
                    onPointerUp={() => triggerVirtualCamKey('KeyE', false)}
                    onPointerLeave={() => triggerVirtualCamKey('KeyE', false)}
                    className="px-3 py-1.5 border border-[rgba(228,224,231,0.3)] hover:border-[#ff3b3b] active:bg-[#ff3b3b] active:text-[#0a0a0c] text-xs font-mono text-[#e4e4e7] whitespace-nowrap cursor-pointer"
                  >
                    SUBIR (E)
                  </button>
                  <button
                    type="button"
                    onPointerDown={() => triggerVirtualCamKey('KeyQ', true)}
                    onPointerUp={() => triggerVirtualCamKey('KeyQ', false)}
                    onPointerLeave={() => triggerVirtualCamKey('KeyQ', false)}
                    className="px-3 py-1.5 border border-[rgba(228,224,231,0.3)] hover:border-[#ff3b3b] active:bg-[#ff3b3b] active:text-[#0a0a0c] text-xs font-mono text-[#e4e4e7] whitespace-nowrap cursor-pointer"
                  >
                    BAJAR (Q)
                  </button>
                </div>
              </div>

              <div className="md:col-span-3 space-y-1.5">
                <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.08em]">
                  <span className="text-[rgba(228,224,231,0.5)]">
                    Velocidad de Vuelo
                  </span>
                  <span className="text-[#e4e4e7]">
                    {freeFlySpeed.toFixed(1)}X
                  </span>
                </div>
                <input
                  type="range"
                  min={0.4}
                  max={3.0}
                  step={0.2}
                  value={freeFlySpeed}
                  onChange={(e) =>
                    onChangeFreeFlySpeed(parseFloat(e.target.value))
                  }
                  className="w-full accent-[#ff3b3b] cursor-pointer h-1.5 bg-[rgba(228,224,231,0.15)]"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Variation 2 Footer Status Pill Button */}
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        className="bg-[#0a0a0c] border border-[#e4e4e7] px-5 py-3 flex items-center gap-4 cursor-pointer hover:border-[#ff3b3b] transition-colors"
      >
        <div className="w-2 h-2 bg-[#ff3b3b] rounded-full shrink-0" />
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-[#e4e4e7]">
          {collapsed
            ? 'Mostrar Panel · Vuelo Libre Activo: WASD / Flechas / Espacio / Q / F (Tecla H)'
            : 'Ocultar Panel · Vuelo Libre Activo: WASD / Flechas / Espacio / Q / F (Tecla H)'}
        </span>
        {collapsed ? (
          <ChevronUp className="w-3.5 h-3.5 text-[#ff3b3b]" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-[#ff3b3b]" />
        )}
      </button>
    </footer>
  );
};
