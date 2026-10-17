/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BottomControlDock } from './components/BottomControlDock';
import { LiFiViewport3D } from './components/LiFiViewport3D';
import {
  CameraPreset,
  InfraredBand,
  LogisticsDirectiveLog,
  OpticalNode,
  RoutingAlgorithm,
  TelemetryPacket,
} from './types/network';
import {
  INITIAL_DIRECTIVE_LOGS,
  INITIAL_NODES,
  solveOpticalNodeTheorem,
} from './utils/graphTheorem';

export default function App() {
  const [baseNodes, setBaseNodes] = useState<OpticalNode[]>(INITIAL_NODES);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('flag-zona-cero');
  const [algorithm, setAlgorithm] = useState<RoutingAlgorithm>('dijkstra');
  const [infraredBand, setInfraredBand] = useState<InfraredBand>('1550nm');
  const [weatherDensity, setWeatherDensity] = useState<number>(0.15);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('overview');
  const [freeFlySpeed, setFreeFlySpeed] = useState<number>(1.2);
  const [isFreeFlyLocked, setIsFreeFlyLocked] = useState<boolean>(false);
  const [packets, setPackets] = useState<TelemetryPacket[]>([]);
  const [directiveLogs, setDirectiveLogs] = useState<LogisticsDirectiveLog[]>(
    INITIAL_DIRECTIVE_LOGS
  );

  // Solve Node-Theorem Graph (Kirchhoff conservation, Beer-Lambert IR attenuation, optimal routing)
  const networkSolution = useMemo(
    () =>
      solveOpticalNodeTheorem(
        baseNodes,
        algorithm,
        infraredBand,
        weatherDensity
      ),
    [baseNodes, algorithm, infraredBand, weatherDensity]
  );

  const selectedNode = useMemo(
    () =>
      networkSolution.nodes.find((n) => n.id === selectedNodeId) ||
      networkSolution.nodes[0],
    [networkSolution.nodes, selectedNodeId]
  );

  const handleToggleNodeActive = useCallback((nodeId: string) => {
    setBaseNodes((prev) =>
      prev.map((node) => {
        if (node.id !== nodeId) return node;
        if (node.role !== 'lifi_relay' && node.role !== 'uplink_gateway') {
          return node;
        }
        return { ...node, active: !node.active };
      })
    );
  }, []);

  const handleResetNetwork = useCallback(() => {
    setBaseNodes(INITIAL_NODES);
    setWeatherDensity(0.15);
    setInfraredBand('1550nm');
    setAlgorithm('dijkstra');
  }, []);

  const handleDispatchTelemetry = useCallback(
    (
      originUnitId: string,
      directiveText: string,
      priority: 'Crítica' | 'Alta' | 'Estándar'
    ) => {
      const route = networkSolution.routesByUnit[originUnitId];
      if (!route || route.length < 2) return;

      const cleanTitle =
        directiveText.trim() ||
        'Despliegue Táctico de Suministros y Unidades Médicas';

      const newPacket: TelemetryPacket = {
        id: `pkt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        originNodeId: originUnitId,
        destinationNodeId: 'command-hq',
        routeNodeIds: route,
        currentHopIndex: 0,
        progress: 0,
        payloadTitle: cleanTitle,
        priority,
        logisticsDirective: cleanTitle,
        timestamp: new Date().toISOString().slice(11, 19) + ' UTC',
        wavelengthNm: parseInt(infraredBand.replace('nm', ''), 10),
        throughputGbps:
          originUnitId === 'unit-alpha'
            ? 4.8
            : originUnitId === 'unit-bravo'
            ? 3.6
            : 2.4,
      };

      setPackets((prev) => [...prev, newPacket]);
    },
    [networkSolution.routesByUnit, infraredBand]
  );

  // Advance active optical packets along their Node-Theorem hops to Satellite and Command Post
  useEffect(() => {
    if (packets.length === 0) return;

    const interval = setInterval(() => {
      setPackets((prev) => {
        const remaining: TelemetryPacket[] = [];
        const completed: TelemetryPacket[] = [];

        for (const pkt of prev) {
          const nextProgress = pkt.progress + 0.085;
          if (nextProgress >= 1) {
            const nextHop = pkt.currentHopIndex + 1;
            if (nextHop >= pkt.routeNodeIds.length - 1) {
              completed.push(pkt);
            } else {
              remaining.push({
                ...pkt,
                currentHopIndex: nextHop,
                progress: nextProgress - 1,
              });
            }
          } else {
            remaining.push({
              ...pkt,
              progress: nextProgress,
            });
          }
        }

        if (completed.length > 0) {
          setDirectiveLogs((oldLogs) => {
            const additions: LogisticsDirectiveLog[] = completed.map((c) => {
              const codePath = c.routeNodeIds
                .map(
                  (id) =>
                    networkSolution.nodes.find((n) => n.id === id)?.code || id
                )
                .join(' → ');
              const originNode = networkSolution.nodes.find(
                (n) => n.id === c.originNodeId
              );
              return {
                id: `log-${c.id}`,
                timestamp: c.timestamp,
                originUnit: originNode
                  ? `${originNode.code} · ${originNode.name}`
                  : c.originNodeId,
                relayPath: codePath,
                satelliteId: `SAT-AETHER-01 (${c.wavelengthNm} nm)`,
                commandCenterAction: c.logisticsDirective,
                supplyAllocation:
                  c.priority === 'Crítica'
                    ? '18.0 Toneladas · Convoy Prioritario + Soporte Aéreo'
                    : '11.5 Toneladas · Reabastecimiento Logístico',
                etaMinutes: c.priority === 'Crítica' ? 14 : 22,
                opticalSnrDb: Number(
                  Math.max(
                    18.5,
                    33.0 - networkSolution.averageAttenuationDb
                  ).toFixed(1)
                ),
                priority: c.priority,
              };
            });
            return [...additions, ...oldLogs].slice(0, 12);
          });
        }

        return remaining;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [
    packets.length,
    networkSolution.nodes,
    networkSolution.averageAttenuationDb,
  ]);

  const navItems: Array<{ preset: CameraPreset; label: string }> = [
    { preset: 'overview', label: 'Vista General' },
    { preset: 'lifi_mesh', label: 'Malla de Nodos LiFi' },
    { preset: 'satellite_orbit', label: 'Satélite Óptico' },
    { preset: 'command_post', label: 'Puesto de Mando' },
    { preset: 'response_team', label: 'Equipo de Respuesta' },
  ];

  return (
    <div className="w-screen h-screen overflow-hidden grid grid-rows-[80px_1fr_auto] bg-[#0a0a0c] text-[#e4e4e7] select-none">
      {/* Variation 2 Header */}
      <header className="relative z-10 grid grid-cols-[auto_1fr_auto] lg:grid-cols-[300px_1fr_auto] items-center gap-4 px-4 sm:px-8 h-[80px] border-b-2 border-[#e4e4e7] bg-[#0a0a0c]">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setCameraPreset('overview');
          }}
          className="font-brand text-[1.5rem] font-extrabold tracking-[-0.04em] uppercase text-[#e4e4e7] whitespace-nowrap shrink-0"
        >
          AetherIR
        </a>

        <nav className="flex items-center justify-center gap-4 lg:gap-8 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = cameraPreset === item.preset;
            return (
              <button
                key={item.preset}
                type="button"
                onClick={() => setCameraPreset(item.preset)}
                className={`relative py-2 font-mono text-[0.75rem] uppercase tracking-[0.1em] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'text-[#e4e4e7]'
                    : 'text-[rgba(228,224,231,0.5)] hover:text-[#e4e4e7]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#ff3b3b]" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() =>
              handleDispatchTelemetry(
                'flag-zona-cero',
                'Baliza Bandera BZ-01: Solicitud Táctica de Extracción y Convoy Logístico',
                'Crítica'
              )
            }
            className="bg-[#ff3b3b] text-[#0a0a0c] px-4 sm:px-6 py-3 font-mono text-[0.7rem] font-bold uppercase tracking-[0.05em] rounded-[2px] hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
          >
            Transmitir Paquete Logístico
          </button>
        </div>
      </header>

      {/* Variation 2 Main Viewport with Corner Technical Telemetry Labels */}
      <main className="relative z-[1] bg-black overflow-hidden w-full h-full">
        <div className="absolute top-4 left-6 z-10 pointer-events-none flex flex-col font-mono text-[0.6rem] text-[rgba(228,224,231,0.5)] leading-relaxed">
          <span>[ SYSTEM.ACTIVE ]</span>
          <span>COORD: 40.7128° N, 74.0060° W</span>
        </div>

        <LiFiViewport3D
          nodes={networkSolution.nodes}
          edges={networkSolution.edges}
          packets={packets}
          selectedNodeId={selectedNode.id}
          cameraPreset={cameraPreset}
          infraredBand={infraredBand}
          weatherDensity={weatherDensity}
          freeFlySpeed={freeFlySpeed}
          isFreeFlyLocked={isFreeFlyLocked}
          onFreeFlyLockChange={setIsFreeFlyLocked}
          onSelectNode={setSelectedNodeId}
          onToggleNodeActive={handleToggleNodeActive}
        />

        <div className="absolute bottom-4 right-6 z-10 pointer-events-none font-mono text-[0.6rem] text-[rgba(228,224,231,0.5)]">
          AETHER_INFRARED_CORE_V.2.04
        </div>
      </main>

      {/* Variation 2 Footer & Expandable Control Panel */}
      <BottomControlDock
        nodes={networkSolution.nodes}
        edges={networkSolution.edges}
        selectedNode={selectedNode}
        algorithm={algorithm}
        infraredBand={infraredBand}
        weatherDensity={weatherDensity}
        totalThroughputGbps={networkSolution.totalSystemThroughputGbps}
        averageAttenuationDb={networkSolution.averageAttenuationDb}
        kirchhoffResidualError={networkSolution.kirchhoffResidualError}
        directiveLogs={directiveLogs}
        routesByUnit={networkSolution.routesByUnit}
        freeFlySpeed={freeFlySpeed}
        isFreeFlyLocked={isFreeFlyLocked}
        onChangeFreeFlySpeed={setFreeFlySpeed}
        onToggleFreeFlyLock={() => setIsFreeFlyLocked((prev) => !prev)}
        onSelectNode={setSelectedNodeId}
        onToggleNodeActive={handleToggleNodeActive}
        onChangeAlgorithm={setAlgorithm}
        onChangeBand={setInfraredBand}
        onChangeWeather={setWeatherDensity}
        onDispatchTelemetry={handleDispatchTelemetry}
        onResetNetwork={handleResetNetwork}
      />
    </div>
  );
}
