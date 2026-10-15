/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { BabylonScene } from './game/babylon/BabylonScene';
import { GameHUD } from './components/GameHUD';
import { RedAlertSidebar, SidebarToolMode } from './components/RedAlertSidebar';
import { TileInspector } from './components/TileInspector';
import { TechTreeModal } from './components/TechTreeModal';
import { ScenarioModal } from './components/ScenarioModal';
import { EnergyCodexModal } from './components/EnergyCodexModal';
import { EventNotification } from './components/EventNotification';

import {
  GridTile,
  WeatherState,
  TechUpgrade,
  Scenario,
  BuildingType,
  GameEvent,
  VRHudData,
} from './game/types';
import { SCENARIOS } from './game/scenarios';
import { TECH_UPGRADES } from './game/techTree';
import { BUILDING_DEFS } from './game/buildingDefs';
import { generateScenarioGrid } from './game/mapGenerator';
import { evaluateObjectives } from './game/objectiveEvaluator';
import {
  createInitialWeather,
  updateWeather,
  stepSimulation,
} from './game/simulation';
import { sound } from './game/audio';

const SHORTCUT_BUILDINGS: Record<string, BuildingType> = {
  '1': 'solar_farm',
  '2': 'wind_turbine',
  '3': 'offshore_wind',
  '4': 'hydro_dam',
  '5': 'geothermal',
  '6': 'battery_bess',
  '7': 'substation',
  '8': 'remediated_park',
};

export default function App() {
  // Scenario & Grid Setup
  const [currentScenario, setCurrentScenario] = useState<Scenario>(SCENARIOS[0]);
  const [tiles, setTiles] = useState<GridTile[]>([]);
  const [weather, setWeather] = useState<WeatherState>(createInitialWeather());
  const [funds, setFunds] = useState<number>(SCENARIOS[0].startingFunds);
  const [techs, setTechs] = useState<TechUpgrade[]>(TECH_UPGRADES);

  // Simulation Pace & Grid State (Slower, deliberate RTS time progression)
  const [simSpeed, setSimSpeed] = useState<number>(1); // 0 (pause), 0.5 (slow), 1 (normal), 2 (fast), 4 (ultra)
  const [totalDemandMW, setTotalDemandMW] = useState<number>(0);
  const [totalCleanMW, setTotalCleanMW] = useState<number>(0);
  const [totalFossilMW, setTotalFossilMW] = useState<number>(0);
  const [cleanPercentage, setCleanPercentage] = useState<number>(0);
  const [co2PerDay, setCo2PerDay] = useState<number>(0);
  const [gridStabilityPct, setGridStabilityPct] = useState<number>(100);
  const [storageMWh, setStorageMWh] = useState<number>(0);
  const [storageCapacityMWh, setStorageCapacityMWh] = useState<number>(0);
  const [cashDelta, setCashDelta] = useState<number>(0);
  const [hasBlackout, setHasBlackout] = useState<boolean>(false);
  const [hasWon, setHasWon] = useState<boolean>(false);

  // Red Alert RTS Tool & Selection State
  const [selectedTileCoords, setSelectedTileCoords] = useState<{ x: number; z: number } | null>(null);
  const [selectedBuildType, setSelectedBuildType] = useState<BuildingType | null>(null);
  const [toolMode, setToolMode] = useState<SidebarToolMode>('select');

  // Modals & Events
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState<boolean>(false);
  const [isTechTreeOpen, setIsTechTreeOpen] = useState<boolean>(false);
  const [isCodexOpen, setIsCodexOpen] = useState<boolean>(false);
  const [isObjectivesOpen, setIsObjectivesOpen] = useState<boolean>(true);
  const [events, setEvents] = useState<GameEvent[]>([]);

  // Initialize Map from Scenario with Procedural Randomization
  const initScenario = useCallback((scenario: Scenario) => {
    setCurrentScenario(scenario);
    setFunds(scenario.startingFunds);
    setWeather(createInitialWeather());
    setHasWon(false);
    setSelectedTileCoords(null);
    setSelectedBuildType(null);
    setToolMode('select');
    setIsObjectivesOpen(true); // Display specific scenario objectives on reload/scenario start, disappearing only by closing manually

    // Procedurally generate randomized grid every reload and scenario
    const newTiles = generateScenarioGrid(scenario);

    setTiles(newTiles);
    setEvents([
      {
        id: `start_${Date.now()}`,
        title: `Mission: ${scenario.name}`,
        description: `${scenario.tagline} (Procedurally generated terrain layout)`,
        type: 'info',
        timestamp: Date.now(),
        persistent: true,
      },
    ]);
  }, []);

  // Randomize grid for current scenario
  const handleRandomizeGrid = useCallback(() => {
    sound.playClick();
    initScenario(currentScenario);
  }, [currentScenario, initScenario]);

  // Run on mount
  useEffect(() => {
    initScenario(SCENARIOS[0]);
  }, [initScenario]);

  // Simulation Tick Loop with Slower Time
  const simSpeedRef = useRef(simSpeed);
  simSpeedRef.current = simSpeed;

  const weatherRef = useRef(weather);
  weatherRef.current = weather;

  const tilesRef = useRef(tiles);
  tilesRef.current = tiles;

  const techsRef = useRef(techs);
  techsRef.current = techs;

  const fundsRef = useRef(funds);
  fundsRef.current = funds;

  const selectedBuildTypeRef = useRef(selectedBuildType);
  selectedBuildTypeRef.current = selectedBuildType;

  const toolModeRef = useRef(toolMode);
  toolModeRef.current = toolMode;

  const fundsFractionRef = useRef<number>(0);

  useEffect(() => {
    const intervalMs = 250;
    const timer = setInterval(() => {
      const speed = simSpeedRef.current;
      if (speed === 0) return; // Paused

      const deltaSeconds = (intervalMs / 1000) * speed;
      // Exact time scale requested: 1 in-game minute = 2 real seconds at 1x speed
      // 1 hour = 60 in-game minutes = 120 real seconds
      const deltaHours = deltaSeconds / 120;

      // Update weather
      const nextWeather = updateWeather(weatherRef.current, deltaHours);
      setWeather(nextWeather);

      // Run simulation step
      const result = stepSimulation(
        tilesRef.current,
        nextWeather,
        techsRef.current.filter((t) => t.unlocked),
        fundsRef.current,
        deltaSeconds
      );

      setTiles(result.updatedTiles);
      setTotalDemandMW(result.totalDemandMW);
      setTotalCleanMW(result.totalCleanMW);
      setTotalFossilMW(result.totalFossilMW);
      setCleanPercentage(result.cleanPercentage);
      setCo2PerDay(result.co2PerDay);
      setGridStabilityPct(result.gridStabilityPct);
      setStorageMWh(result.totalStorageAvailableMWh);
      setStorageCapacityMWh(result.totalStorageCapacityMWh);
      setCashDelta(result.cashDelta);
      setHasBlackout(result.hasBlackout);

      // Update treasury using accurate hourly rate and time elapsed
      const cashEarnedThisTick = result.cashDelta * deltaHours;
      fundsFractionRef.current += cashEarnedThisTick;
      const wholePesos = Math.trunc(fundsFractionRef.current);
      if (wholePesos !== 0) {
        fundsFractionRef.current -= wholePesos;
        setFunds((prev) => Math.max(0, prev + wholePesos));
      }

      // Add new events
      if (result.newEvents.length > 0) {
        setEvents((prev) => [...prev, ...result.newEvents]);
      }

      // Check Victory Condition against Specific Scenario Directives
      const evalResult = evaluateObjectives(
        currentScenario,
        result.updatedTiles,
        result,
        fundsRef.current,
        techsRef.current
      );

      if (!hasWon && evalResult.isWon) {
        setHasWon(true);
        sound.playVictory();
        confetti({
          particleCount: 140,
          spread: 80,
          origin: { y: 0.6 },
        });
        setEvents((prev) => [
          ...prev,
          {
            id: `win_${Date.now()}`,
            title: `${currentScenario.name} Completed!`,
            description: `All ${evalResult.totalCount} specific mission directives achieved! Clean Net Zero transition successful!`,
            type: 'positive',
            timestamp: Date.now(),
          },
        ]);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [currentScenario, hasWon]);

  // Live Scenario Evaluation for HUD & Modals
  const scenarioEvaluation = useMemo(() => {
    return evaluateObjectives(
      currentScenario,
      tiles,
      {
        cleanPercentage,
        totalCleanMW,
        co2PerDay,
      },
      funds,
      techs
    );
  }, [
    currentScenario,
    tiles,
    cleanPercentage,
    totalCleanMW,
    co2PerDay,
    funds,
    techs,
  ]);

  // Live 3D VR Holographic HUD Data
  const vrHudData: VRHudData = useMemo(() => {
    const hours = Math.floor(weather.timeOfDay) % 24;
    const minutes = Math.floor((weather.timeOfDay - Math.floor(weather.timeOfDay)) * 60 + 0.0001);
    const timeFormatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    const topObjective = scenarioEvaluation.objectives[0];
    const topDirectiveTitle = topObjective ? topObjective.title : 'Decarbonize Regional Grid';
    const topDirectiveProgress = topObjective
      ? `${topObjective.formattedCurrent} / ${topObjective.formattedTarget}`
      : `${cleanPercentage}% Clean`;

    return {
      funds,
      cashDelta,
      totalDemandMW,
      totalCleanMW,
      totalFossilMW,
      cleanPercentage,
      co2PerDay,
      gridStabilityPct,
      storageMWh,
      storageCapacityMWh,
      activeScenarioName: currentScenario.name,
      directivesCount: `${scenarioEvaluation.completedCount} of ${scenarioEvaluation.totalCount}`,
      topDirectiveTitle,
      topDirectiveProgress,
      hasBlackout,
      timeFormatted,
      windSpeedMs: weather.windSpeedMs,
      solarIrradiancePct: weather.solarIrradiancePct,
    };
  }, [
    funds,
    cashDelta,
    totalDemandMW,
    totalCleanMW,
    totalFossilMW,
    cleanPercentage,
    co2PerDay,
    gridStabilityPct,
    storageMWh,
    storageCapacityMWh,
    currentScenario.name,
    scenarioEvaluation,
    hasBlackout,
    weather.timeOfDay,
    weather.windSpeedMs,
    weather.solarIrradiancePct,
  ]);

  // Red Alert Building Placement Validity Check
  const checkPlacementValidity = useCallback(
    (x: number, z: number, bldgType: BuildingType): { valid: boolean; reason?: string } => {
      const currentTiles = tilesRef.current;
      const currentFunds = fundsRef.current;

      const tile = currentTiles.find((t) => t.x === x && t.z === z);
      if (!tile) return { valid: false, reason: 'Target out of grid bounds' };

      if (tile.building !== 'empty') {
        const existingName = BUILDING_DEFS[tile.building]?.name || 'structure';
        return { valid: false, reason: `Tile occupied by ${existingName}` };
      }

      const def = BUILDING_DEFS[bldgType];
      if (!def) return { valid: false, reason: 'Unknown structure' };

      if (!def.allowedTerrains.includes(tile.terrain)) {
        return {
          valid: false,
          reason: `${def.name} requires ${def.allowedTerrains.join(' or ')} (tile is ${tile.terrain})`,
        };
      }

      if (currentFunds < def.cost) {
        return { valid: false, reason: `Insufficient funds (Requires ₱${def.cost.toLocaleString()})` };
      }

      return { valid: true };
    },
    []
  );

  // Red Alert Deploy Building Handler
  const handleDeployBuilding = useCallback(
    (x: number, z: number) => {
      const bldgType = selectedBuildTypeRef.current;
      if (!bldgType) return;
      const validity = checkPlacementValidity(x, z, bldgType);

      if (!validity.valid) {
        sound.playCannotDeploy();
        setEvents((prev) => [
          ...prev,
          {
            id: `deploy_fail_${Date.now()}`,
            title: 'Cannot Deploy Here',
            description: validity.reason || 'Invalid placement zone',
            type: 'warning',
            timestamp: Date.now(),
          },
        ]);
        return;
      }

      const def = BUILDING_DEFS[bldgType];

      // Deploy structure with Red Alert pneumatic sound
      sound.playDeploy();
      setFunds((prev) => Math.max(0, prev - def.cost));

      setTiles((prev) =>
        prev.map((t) =>
          t.x === x && t.z === z
            ? {
                ...t,
                building: bldgType,
                level: 1,
                health: 100,
                powerOutputMW: 0,
                storedMWh: bldgType === 'battery_bess' ? 100 : 0,
                decommissioning: false,
                decommissionProgress: 0,
              }
            : t
        )
      );

      setSelectedTileCoords({ x, z });

      setEvents((prev) => [
        ...prev,
        {
          id: `deploy_${Date.now()}`,
          title: 'Construction Complete',
          description: `${def.name} deployed at (${x}, ${z}). Online and feeding grid.`,
          type: 'positive',
          timestamp: Date.now(),
        },
      ]);
    },
    [checkPlacementValidity]
  );

  // Quick Build directly from TileInspector
  const handleQuickBuild = (tile: GridTile, bldgType: BuildingType) => {
    const validity = checkPlacementValidity(tile.x, tile.z, bldgType);
    if (!validity.valid) {
      sound.playCannotDeploy();
      setEvents((prev) => [
        ...prev,
        {
          id: `deploy_fail_${Date.now()}`,
          title: 'Cannot Deploy Here',
          description: validity.reason || 'Invalid placement zone',
          type: 'warning',
          timestamp: Date.now(),
        },
      ]);
      return;
    }

    const def = BUILDING_DEFS[bldgType];
    sound.playDeploy();
    setFunds((prev) => Math.max(0, prev - def.cost));

    setTiles((prev) =>
      prev.map((t) =>
        t.x === tile.x && t.z === tile.z
          ? {
              ...t,
              building: bldgType,
              level: 1,
              health: 100,
              powerOutputMW: 0,
              storedMWh: bldgType === 'battery_bess' ? 100 : 0,
              decommissioning: false,
              decommissionProgress: 0,
            }
          : t
      )
    );

    setSelectedTileCoords({ x: tile.x, z: tile.z });

    setEvents((prev) => [
      ...prev,
      {
        id: `quick_deploy_${Date.now()}`,
        title: 'Construction Complete',
        description: `${def.name} constructed at (${tile.x}, ${tile.z}).`,
        type: 'positive',
        timestamp: Date.now(),
      },
    ]);
  };

  // Red Alert Cancel Placement Mode (Right Click or ESC)
  const handleCancelPlacement = useCallback(() => {
    sound.playCancel();
    setSelectedBuildType(null);
    setToolMode('select');
  }, []);

  // Handle Tile Click in 3D Scene (Select / Sell / Repair mode)
  const handleTileSelect = useCallback(
    (x: number, z: number) => {
      const tile = tiles.find((t) => t.x === x && t.z === z);
      if (!tile) return;

      if (toolMode === 'sell') {
        // Red Alert Sell Tool: Decommission or dismantle clicked structure
        if (tile.building === 'empty' || tile.building === 'city_center') {
          sound.playCannotDeploy();
          return;
        }

        const def = BUILDING_DEFS[tile.building];
        sound.playSell();

        if (def.category === 'fossil') {
          // Decommission fossil plant
          setTiles((prev) =>
            prev.map((t) =>
              t.x === x && t.z === z
                ? { ...t, decommissioning: true, decommissionProgress: 1 }
                : t
            )
          );
          setEvents((prev) => [
            ...prev,
            {
              id: `sell_${Date.now()}`,
              title: 'Decommissioning Initiated',
              description: `Retiring ${def.name}. Emissions terminating.`,
              type: 'positive',
              timestamp: Date.now(),
            },
          ]);
        } else {
          // Dismantle renewable/infrastructure and refund 50%
          const refund = Math.round(def.cost * 0.5);
          setFunds((prev) => prev + refund);
          setTiles((prev) =>
            prev.map((t) =>
              t.x === x && t.z === z
                ? { ...t, building: 'empty', level: 1, powerOutputMW: 0, storedMWh: 0 }
                : t
            )
          );
          setEvents((prev) => [
            ...prev,
            {
              id: `sold_${Date.now()}`,
              title: 'Structure Sold',
              description: `Dismantled ${def.name}. Recouped $${refund.toLocaleString()} in salvage capital.`,
              type: 'info',
              timestamp: Date.now(),
            },
          ]);
        }
      } else if (toolMode === 'repair') {
        // Red Alert Repair / Upgrade Tool
        const def = BUILDING_DEFS[tile.building];
        if ((def.category === 'renewable' || def.category === 'storage') && tile.level < 2) {
          const cost = def.upgradeCost || 25000;
          if (funds >= cost) {
            sound.playUpgrade();
            setFunds((prev) => prev - cost);
            setTiles((prev) =>
              prev.map((t) => (t.x === x && t.z === z ? { ...t, level: 2 } : t))
            );
            setEvents((prev) => [
              ...prev,
              {
                id: `upg_${Date.now()}`,
                title: 'Upgrade Complete',
                description: `${def.name} upgraded to Level 2 (+35% efficiency).`,
                type: 'positive',
                timestamp: Date.now(),
              },
            ]);
          } else {
            sound.playCannotDeploy();
          }
        } else {
          sound.playCannotDeploy();
        }
      } else {
        // Select tool: inspect tile
        sound.playClick();
        setSelectedTileCoords({ x, z });
      }
    },
    [tiles, toolMode, funds]
  );

  // Keyboard Shortcuts (Red Alert style)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Escape') {
        handleCancelPlacement();
      } else if (e.key === 's' || e.key === 'S') {
        sound.playClick();
        setSelectedBuildType(null);
        setToolMode((prev) => (prev === 'sell' ? 'select' : 'sell'));
      } else if (e.key === 'r' || e.key === 'R') {
        sound.playClick();
        setSelectedBuildType(null);
        setToolMode((prev) => (prev === 'repair' ? 'select' : 'repair'));
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setSimSpeed((prev) => (prev === 0 ? 1 : 0));
      } else if (SHORTCUT_BUILDINGS[e.key]) {
        const bldg = SHORTCUT_BUILDINGS[e.key];
        sound.playClick();
        setSelectedBuildType(bldg);
        setToolMode('build');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCancelPlacement]);

  // Tile Actions from Inspector
  const handleUpgradeTile = (tile: GridTile) => {
    const def = BUILDING_DEFS[tile.building];
    const cost = def.upgradeCost || 25000;
    if (funds < cost) return;

    sound.playUpgrade();
    setFunds((prev) => prev - cost);
    setTiles((prev) =>
      prev.map((t) => (t.x === tile.x && t.z === tile.z ? { ...t, level: 2 } : t))
    );
  };

  const handleDecommissionTile = (tile: GridTile) => {
    sound.playDecommission();
    setTiles((prev) =>
      prev.map((t) =>
        t.x === tile.x && t.z === tile.z
          ? { ...t, decommissioning: true, decommissionProgress: 1 }
          : t
      )
    );
  };

  const handleDemolishTile = (tile: GridTile) => {
    sound.playClick();
    setFunds((prev) => Math.max(0, prev - 2000));
    setTiles((prev) =>
      prev.map((t) =>
        t.x === tile.x && t.z === tile.z
          ? {
              ...t,
              building: 'empty',
              level: 1,
              powerOutputMW: 0,
              storedMWh: 0,
              decommissioning: false,
            }
          : t
      )
    );
  };

  // Tech Unlock
  const handleUnlockTech = (techId: string) => {
    const tech = techs.find((t) => t.id === techId);
    if (!tech || tech.unlocked || funds < tech.cost) return;

    sound.playUpgrade();
    setFunds((prev) => prev - tech.cost);
    setTechs((prev) =>
      prev.map((t) => (t.id === techId ? { ...t, unlocked: true } : t))
    );
    setEvents((prev) => [
      ...prev,
      {
        id: `tech_${Date.now()}`,
        title: 'Technology Deployed',
        description: `${tech.name}: ${tech.effectDescription}`,
        type: 'positive',
        timestamp: Date.now(),
      },
    ]);
  };

  // Dismiss Toast Event Notification
  const handleDismissEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const selectedTile = tiles.find(
    (t) =>
      selectedTileCoords &&
      t.x === selectedTileCoords.x &&
      t.z === selectedTileCoords.z
  ) || null;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#070b12] text-slate-100 font-sans">
      {/* 1. Babylon.js 3D WebGL Canvas with Red Alert Ghost Blueprinting */}
      <BabylonScene
        tiles={tiles}
        weather={weather}
        cleanPercentage={cleanPercentage}
        selectedTileCoords={selectedTileCoords}
        onTileSelect={handleTileSelect}
        placementBuilding={toolMode === 'build' ? selectedBuildType : null}
        onDeployBuilding={handleDeployBuilding}
        onCancelPlacement={handleCancelPlacement}
        validityChecker={checkPlacementValidity}
        vrHudData={vrHudData}
      />

      {/* 2. Top Navigation & Telemetry HUD */}
      <GameHUD
        totalDemandMW={totalDemandMW}
        totalCleanMW={totalCleanMW}
        totalFossilMW={totalFossilMW}
        cleanPercentage={cleanPercentage}
        co2PerDay={co2PerDay}
        gridStabilityPct={gridStabilityPct}
        funds={funds}
        cashDelta={cashDelta}
        weather={weather}
        storageMWh={storageMWh}
        storageCapacityMWh={storageCapacityMWh}
        simSpeed={simSpeed}
        hasBlackout={hasBlackout}
        onSpeedChange={setSimSpeed}
        onOpenScenarios={() => setIsScenarioModalOpen(true)}
        onOpenTechTree={() => setIsTechTreeOpen(true)}
        onOpenCodex={() => setIsCodexOpen(true)}
        onRandomizeGrid={handleRandomizeGrid}
        activeScenarioName={currentScenario.name}
        scenarioEvaluation={scenarioEvaluation}
        isObjectivesOpen={isObjectivesOpen}
        onToggleObjectives={setIsObjectivesOpen}
      />

      {/* 3. Red Alert Right Construction Sidebar */}
      <RedAlertSidebar
        funds={funds}
        selectedBuildType={selectedBuildType}
        toolMode={toolMode}
        onSelectBuild={(type) => {
          setSelectedBuildType(type);
          if (type) setToolMode('build');
        }}
        onSetToolMode={setToolMode}
        totalGenerationMW={totalCleanMW + totalFossilMW}
        totalDemandMW={totalDemandMW}
      />

      {/* 4. Left Tile Inspector */}
      {selectedTile && toolMode === 'select' && (
        <TileInspector
          tile={selectedTile}
          funds={funds}
          onClose={() => setSelectedTileCoords(null)}
          onUpgrade={handleUpgradeTile}
          onDecommission={handleDecommissionTile}
          onDemolish={handleDemolishTile}
          onQuickBuild={handleQuickBuild}
        />
      )}

      {/* 5. In-Game Toast Notifications */}
      <EventNotification
        events={events}
        onDismiss={handleDismissEvent}
      />

      {/* 6. Scenario & Victory Modal */}
      <ScenarioModal
        isOpen={isScenarioModalOpen}
        onClose={() => setIsScenarioModalOpen(false)}
        currentScenario={currentScenario}
        onSelectScenario={(sc) => {
          initScenario(sc);
          setIsScenarioModalOpen(false);
        }}
        cleanPercentage={cleanPercentage}
        co2PerDay={co2PerDay}
        hasWon={hasWon}
        onResetScenario={() => {
          initScenario(currentScenario);
          setIsScenarioModalOpen(false);
        }}
        evaluation={scenarioEvaluation}
      />

      {/* 7. Tech & Policy Research Modal */}
      <TechTreeModal
        isOpen={isTechTreeOpen}
        onClose={() => setIsTechTreeOpen(false)}
        techs={techs}
        funds={funds}
        onUnlockTech={handleUnlockTech}
      />

      {/* 8. Energy Codex Modal */}
      <EnergyCodexModal
        isOpen={isCodexOpen}
        onClose={() => setIsCodexOpen(false)}
      />
    </div>
  );
}
