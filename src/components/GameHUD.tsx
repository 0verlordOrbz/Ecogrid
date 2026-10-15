import React from 'react';
import {
  Zap,
  Leaf,
  Coins,
  BatteryCharging,
  Wind,
  Sun,
  Clock,
  Play,
  Pause,
  FastForward,
  BookOpen,
  Award,
  Layers,
  Volume2,
  VolumeX,
  Dices,
  Target,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  X,
} from 'lucide-react';
import { WeatherState } from '../game/types';
import { sound } from '../game/audio';
import { ScenarioEvaluation } from '../game/objectiveEvaluator';

interface GameHUDProps {
  totalDemandMW: number;
  totalCleanMW: number;
  totalFossilMW: number;
  cleanPercentage: number;
  co2PerDay: number;
  gridStabilityPct: number;
  funds: number;
  cashDelta: number;
  weather: WeatherState;
  storageMWh: number;
  storageCapacityMWh: number;
  simSpeed: number; // 0 = pause, 1 = normal, 2 = fast, 3 = hyper
  hasBlackout: boolean;
  onSpeedChange: (speed: number) => void;
  onOpenScenarios: () => void;
  onOpenTechTree: () => void;
  onOpenCodex: () => void;
  onRandomizeGrid?: () => void;
  activeScenarioName: string;
  scenarioEvaluation?: ScenarioEvaluation;
  isObjectivesOpen?: boolean;
  onToggleObjectives?: (open: boolean) => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  totalDemandMW,
  totalCleanMW,
  totalFossilMW,
  cleanPercentage,
  co2PerDay,
  gridStabilityPct,
  funds,
  cashDelta,
  weather,
  storageMWh,
  storageCapacityMWh,
  simSpeed,
  hasBlackout,
  onSpeedChange,
  onOpenScenarios,
  onOpenTechTree,
  onOpenCodex,
  onRandomizeGrid,
  activeScenarioName,
  scenarioEvaluation,
  isObjectivesOpen,
  onToggleObjectives,
}) => {
  const [soundEnabled, setSoundEnabled] = React.useState(sound.enabled);
  const [internalDirectivesOpen, setInternalDirectivesOpen] = React.useState(true);

  const isDirectivesOpen = isObjectivesOpen !== undefined ? isObjectivesOpen : internalDirectivesOpen;

  const setDirectivesOpen = (open: boolean) => {
    setInternalDirectivesOpen(open);
    if (onToggleObjectives) {
      onToggleObjectives(open);
    }
  };

  const toggleSound = () => {
    sound.enabled = !sound.enabled;
    setSoundEnabled(sound.enabled);
  };

  const totalGenerationMW = totalCleanMW + totalFossilMW;
  const supplyRatio = totalDemandMW > 0 ? totalGenerationMW / totalDemandMW : 1;

  // Format time of day
  const hours = Math.floor(weather.timeOfDay) % 24;
  const minutes = Math.floor((weather.timeOfDay - Math.floor(weather.timeOfDay)) * 60 + 0.0001);
  const timeFormatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  return (
    <header className="absolute top-0 left-0 right-0 z-30 flex flex-col pointer-events-none select-none">
      {/* Top Bar Zone Contract: Brand — Links/Navigation — Actions */}
      <div className="w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 py-2 flex items-center justify-between gap-6 pointer-events-auto">
        {/* Brand Zone */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white font-display whitespace-nowrap">
              EcoGrid
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline ml-2">
              Clean Energy Transition
            </span>
          </div>
        </div>

        {/* Navigation & Management Modals */}
        <nav className="flex items-center gap-2 md:gap-4 text-xs font-medium text-slate-300 shrink-0">
          <button
            onClick={() => {
              sound.playClick();
              onOpenScenarios();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-slate-800 text-slate-200 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Scenario: {activeScenarioName}</span>
          </button>

          {/* Specific Directives Quick-View Badge */}
          {scenarioEvaluation && (
            <button
              onClick={() => {
                sound.playClick();
                setDirectivesOpen(!isDirectivesOpen);
              }}
              title={isDirectivesOpen ? 'Hide Scenario Objectives' : 'Show Scenario Objectives'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer border ${
                isDirectivesOpen
                  ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200 shadow-sm'
                  : 'bg-slate-900/80 hover:bg-slate-800 border-slate-700/60 text-slate-200 hover:text-white'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                Objectives:{' '}
                <strong className="text-emerald-400 font-mono">
                  {scenarioEvaluation.completedCount}/{scenarioEvaluation.totalCount}
                </strong>
              </span>
              {isDirectivesOpen ? (
                <ChevronUp className="w-3 h-3 text-slate-400" />
              ) : (
                <ChevronDown className="w-3 h-3 text-slate-400" />
              )}
            </button>
          )}

          <button
            onClick={() => {
              sound.playClick();
              onOpenTechTree();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-slate-800 text-slate-200 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Research & Policy</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onOpenCodex();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-slate-800 text-slate-200 transition-colors whitespace-nowrap cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>Energy Codex</span>
          </button>

          {onRandomizeGrid && (
            <button
              onClick={() => {
                sound.playClick();
                onRandomizeGrid();
              }}
              title="Generate a fresh randomized procedural terrain layout for this scenario"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-purple-900/40 text-purple-200 border border-purple-500/30 hover:border-purple-400/50 bg-purple-950/20 transition-all whitespace-nowrap cursor-pointer shadow-sm"
            >
              <Dices className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span className="font-semibold text-xs">Randomize Grid</span>
            </button>
          )}
        </nav>

        {/* Sound & Speed Control Zone */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggleSound}
            title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
          </button>

          {/* Simulation Speed Segmented Bar */}
          <div className="flex items-center bg-slate-900 border border-slate-700/70 rounded-md p-0.5">
            <button
              onClick={() => onSpeedChange(0)}
              title="Pause Simulation"
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                simSpeed === 0 ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onSpeedChange(0.5)}
              title="Slow Pace (0.5x) · 1 min = 4s"
              className={`px-2 py-1 text-xs font-mono font-medium rounded transition-colors cursor-pointer ${
                simSpeed === 0.5 ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              0.5x
            </button>
            <button
              onClick={() => onSpeedChange(1)}
              title="Normal Pace (1x) · 1 min = 2s"
              className={`px-2 py-1 text-xs font-mono font-medium rounded transition-colors cursor-pointer ${
                simSpeed === 1 ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1x
            </button>
            <button
              onClick={() => onSpeedChange(2)}
              title="Fast Pace (2x) · 1 min = 1s"
              className={`px-2 py-1 text-xs font-mono font-medium rounded transition-colors cursor-pointer ${
                simSpeed === 2 ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2x
            </button>
            <button
              onClick={() => onSpeedChange(4)}
              title="Ultra Pace (4x) · 2 min = 1s"
              className={`px-2 py-1 text-xs font-mono font-medium rounded transition-colors cursor-pointer ${
                simSpeed === 4 ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              4x
            </button>
          </div>
        </div>
      </div>

      {/* Floating Mission Directives Overlay - Disappears only when closed manually */}
      {isDirectivesOpen && scenarioEvaluation && (
        <div className="absolute top-13 left-4 sm:left-28 md:left-44 w-96 max-w-[94vw] bg-slate-950/95 border border-emerald-500/40 rounded-xl shadow-2xl backdrop-blur-md p-4 z-40 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header with Title, Progress, and Manual Close Button */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                  Scenario Objectives
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {scenarioEvaluation.completedCount} of {scenarioEvaluation.totalCount} completed
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  sound.playClick();
                  onOpenScenarios();
                }}
                title="Open full scenario details and mission briefings"
                className="text-[11px] px-2 py-1 text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/70 rounded-md transition-colors cursor-pointer"
              >
                Briefing
              </button>
              <button
                onClick={() => {
                  sound.playClick();
                  setDirectivesOpen(false);
                }}
                aria-label="Close Objectives"
                title="Close scenario objectives (disappears manually)"
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-300 hover:text-white" />
              </button>
            </div>
          </div>

          {/* Objectives List */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {scenarioEvaluation.objectives.map((obj, i) => (
              <div
                key={obj.id || i}
                className={`p-2.5 rounded-lg border transition-all ${
                  obj.completed
                    ? 'bg-emerald-950/25 border-emerald-500/40 text-emerald-200'
                    : 'bg-slate-900/80 border-slate-800/90 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-1.5 mb-1.5">
                  <div className="flex items-start gap-2 min-w-0">
                    <div className="shrink-0 mt-0.5">
                      {obj.completed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className={`text-[11px] font-semibold block leading-tight ${obj.completed ? 'text-white' : 'text-slate-100'}`}>
                        {obj.title}
                      </span>
                      {obj.description && (
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-snug line-clamp-2">
                          {obj.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono shrink-0 ml-1 font-semibold ${obj.completed ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {obj.formattedCurrent} / {obj.formattedTarget}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${obj.completed ? 'bg-emerald-400' : 'bg-amber-400'}`}
                    style={{ width: `${obj.progressPct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Explicit Manual Close Button at Bottom */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80">
            <button
              onClick={() => {
                sound.playClick();
                setDirectivesOpen(false);
              }}
              title="Close the scenario objective card manually"
              className="w-full py-1.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 text-xs font-semibold text-slate-200 hover:text-white rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
              <span>Close Objective</span>
            </button>
            <p className="text-[10px] text-slate-400 text-center mt-1.5">
              Disappears by closing manually · Reopen anytime from top bar
            </p>
          </div>
        </div>
      )}

      {/* Primary Grid Metrics & Telemetry Strip */}
      <div className="w-full bg-slate-900/75 backdrop-blur-md border-b border-slate-800/60 px-4 py-1.5 pr-4 md:pr-76 flex flex-wrap items-center justify-between gap-y-2 gap-x-6 text-xs text-slate-300 pointer-events-auto">
        {/* Left: Power Generation & Clean Share */}
        <div className="flex items-center gap-6">
          {/* Generation vs Demand */}
          <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 ${hasBlackout ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`} />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Grid Load</span>
                <span className="font-mono tabular-nums text-white font-semibold">
                  {totalGenerationMW} / {totalDemandMW} MW
                </span>
              </div>
              <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1 flex">
                <div
                  className="h-full bg-emerald-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, (totalCleanMW / Math.max(1, totalDemandMW)) * 100)}%` }}
                  title={`Clean: ${totalCleanMW} MW`}
                />
                <div
                  className="h-full bg-amber-600 transition-all duration-300"
                  style={{ width: `${Math.min(100, (totalFossilMW / Math.max(1, totalDemandMW)) * 100)}%` }}
                  title={`Fossil: ${totalFossilMW} MW`}
                />
              </div>
            </div>
          </div>

          {/* Clean Energy Transition Percentage */}
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-emerald-500/10 text-emerald-400">
              <Leaf className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Clean Transition</div>
              <div className="flex items-center gap-1">
                <span className="font-mono tabular-nums text-emerald-400 font-bold text-sm">
                  {cleanPercentage}%
                </span>
                <span className="text-[11px] text-slate-400">Net Zero target</span>
              </div>
            </div>
          </div>

          {/* Grid Stability */}
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Stability</div>
            <span
              className={`font-mono tabular-nums font-semibold ${
                gridStabilityPct >= 95
                  ? 'text-emerald-400'
                  : gridStabilityPct >= 70
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {gridStabilityPct}%
            </span>
          </div>

          {/* CO2 Emissions */}
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Emissions</div>
            <div className="flex items-center gap-1 font-mono tabular-nums">
              <span className={`font-semibold ${co2PerDay === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {co2PerDay.toLocaleString()}
              </span>
              <span className="text-slate-400 text-[11px]">t CO2/day</span>
            </div>
          </div>
        </div>

        {/* Right: Storage, Treasury, Weather Clock */}
        <div className="flex items-center gap-6">
          {/* Storage Capacity */}
          <div className="flex items-center gap-2">
            <BatteryCharging className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Storage (BESS)</div>
              <span className="font-mono tabular-nums font-semibold text-cyan-300">
                {storageMWh} / {storageCapacityMWh} MWh
              </span>
            </div>
          </div>

          {/* Capital Funds & Cashflow (Philippine Pesos) */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-bold text-xs text-emerald-400 font-mono select-none">
              ₱
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Treasury (PHP)</div>
              <div className="flex items-center gap-1.5 font-mono tabular-nums">
                <span className="font-bold text-white">₱{funds.toLocaleString()}</span>
                <span className={`text-[11px] font-medium ${cashDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {cashDelta >= 0 ? `+₱${cashDelta.toLocaleString()}` : `-₱${Math.abs(cashDelta).toLocaleString()}`}/hr
                </span>
              </div>
            </div>
          </div>

          {/* Weather & Time */}
          <div className="flex items-center gap-4 border-l border-slate-800 pl-4">
            <div className="flex items-center gap-1" title="Solar Irradiance">
              <Sun className="w-3.5 h-3.5 text-amber-300" />
              <span className="font-mono tabular-nums text-slate-200">{weather.solarIrradiancePct}%</span>
            </div>

            <div className="flex items-center gap-1" title="Wind Speed">
              <Wind className="w-3.5 h-3.5 text-sky-300" />
              <span className="font-mono tabular-nums text-slate-200">{weather.windSpeedMs} m/s</span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono tabular-nums font-semibold text-white">{timeFormatted}</span>
              <span className="text-slate-400">·</span>
              <span className="font-mono tabular-nums text-slate-400">Day {weather.day}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Blackout Warning Badge if active (Centered pill so it never collides with sidebars or inspector) */}
      {hasBlackout && (
        <div className="mx-auto mt-2 max-w-xl bg-rose-950/95 border border-rose-500/70 text-rose-200 text-xs font-semibold px-4 py-1.5 rounded-full shadow-2xl flex items-center justify-center gap-2 animate-pulse pointer-events-auto">
          <Zap className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="truncate">GRID DEFICIT WARNING: Supply falling short of city demand! Blackout penalties accruing.</span>
        </div>
      )}
    </header>
  );
};
