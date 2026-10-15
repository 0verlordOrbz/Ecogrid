import React from 'react';
import {
  X,
  Award,
  CheckCircle2,
  Circle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Zap,
  Leaf,
  Shield,
  TrendingUp,
  Target,
  Flame,
  Dices,
} from 'lucide-react';
import { Scenario } from '../game/types';
import { SCENARIOS } from '../game/scenarios';
import { sound } from '../game/audio';
import { ScenarioEvaluation } from '../game/objectiveEvaluator';

interface ScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentScenario: Scenario;
  onSelectScenario: (scenario: Scenario) => void;
  cleanPercentage: number;
  co2PerDay: number;
  hasWon: boolean;
  onResetScenario: () => void;
  evaluation?: ScenarioEvaluation;
}

export const ScenarioModal: React.FC<ScenarioModalProps> = ({
  isOpen,
  onClose,
  currentScenario,
  onSelectScenario,
  cleanPercentage,
  co2PerDay,
  hasWon,
  onResetScenario,
  evaluation,
}) => {
  if (!isOpen) return null;

  const isTargetCleanMet = cleanPercentage >= currentScenario.targetCleanPct;
  const isZeroEmissionsMet = co2PerDay === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-8 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-amber-400">
                  Regional Command Terminal
                </span>
                <span className="text-slate-500">·</span>
                <span className="text-xs text-slate-400">Decarbonization Directives</span>
              </div>
              <h2 className="text-lg font-bold text-white font-display">
                Mission Objectives & Regional Scenarios
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sound.playClick();
                onResetScenario();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-colors cursor-pointer"
              title="Generate a brand new random procedural grid and restart scenario"
            >
              <Dices className="w-3.5 h-3.5 text-amber-400" />
              <span>Randomize & Restart</span>
            </button>
            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* 1. Large Active Objective Briefing Board */}
          <div className="p-5 md:p-6 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950 rounded-2xl border border-slate-800 shadow-xl space-y-5">
            {/* Top row: Mission Title, Difficulty, Status */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    ACTIVE OPERATION
                  </span>
                  <span className="text-xs text-slate-400">· Difficulty: <strong className="text-slate-200">{currentScenario.difficulty}</strong></span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white font-display">
                  {currentScenario.name}
                </h3>
                <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
                  {currentScenario.description}
                </p>
              </div>

              {/* Victory Badge if achieved */}
              {hasWon ? (
                <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
                  <span className="font-bold text-sm">MISSION ACCOMPLISHED</span>
                </div>
              ) : (
                <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-2 text-xs font-mono">
                  <Target className="w-4 h-4 text-amber-400" />
                  <span>TRANSITION IN PROGRESS</span>
                </div>
              )}
            </div>

            {/* Live Progress KPIs Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {/* Clean Energy Metric */}
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Clean Energy Transition</span>
                  </span>
                  <span className="font-mono font-semibold text-slate-300">
                    Target: {currentScenario.targetCleanPct}%
                  </span>
                </div>
                <div className="flex items-baseline justify-between font-mono">
                  <span className={`text-2xl font-bold tabular-nums ${isTargetCleanMet ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {cleanPercentage}%
                  </span>
                  <span className="text-xs text-slate-400">
                    {cleanPercentage >= currentScenario.targetCleanPct ? 'Goal Reached' : `${currentScenario.targetCleanPct - cleanPercentage}% remaining`}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                    style={{ width: `${Math.min(100, (cleanPercentage / currentScenario.targetCleanPct) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Fossil Emissions Metric */}
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    <span>Fossil CO2 Emissions</span>
                  </span>
                  <span className="font-mono font-semibold text-slate-300">
                    Target: 0 t/day
                  </span>
                </div>
                <div className="flex items-baseline justify-between font-mono">
                  <span className={`text-2xl font-bold tabular-nums ${isZeroEmissionsMet ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {co2PerDay.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400">
                    {isZeroEmissionsMet ? 'Zero Carbon Net Zero' : 'Metric tons/day'}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 transition-all duration-500 rounded-full"
                    style={{ width: `${Math.max(5, Math.min(100, (co2PerDay / (currentScenario.initialCo2Target || 1500)) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Grid Reliability */}
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-sky-400" />
                    <span>Grid Reliability & Inertia</span>
                  </span>
                  <span className="font-mono font-semibold text-slate-300">
                    Stability Target
                  </span>
                </div>
                <div className="flex items-baseline justify-between font-mono">
                  <span className="text-2xl font-bold tabular-nums text-sky-400">
                    100%
                  </span>
                  <span className="text-xs text-slate-400">
                    Blackout-Free
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-500 w-full rounded-full" />
                </div>
              </div>
            </div>

            {/* Step-by-Step Mission Checklist */}
            <div className="p-4 bg-slate-950/90 rounded-xl border border-slate-800/90 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-400" />
                  <span>Specific Mission Directives & Deliverables:</span>
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700/80 text-emerald-300">
                  {evaluation ? `${evaluation.completedCount} of ${evaluation.totalCount} Completed` : 'All directives required'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(evaluation ? evaluation.objectives : currentScenario.objectives).map((obj: any, idx: number) => {
                  const isAchieved = obj.completed ?? false;
                  const progressPct = obj.progressPct ?? (isAchieved ? 100 : 0);
                  const formattedCurrent = obj.formattedCurrent ?? (isAchieved ? 'Met' : '0');
                  const formattedTarget = obj.formattedTarget ?? `${obj.target ?? ''} ${obj.unit ?? ''}`;

                  return (
                    <div
                      key={obj.id || idx}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 transition-all shadow-sm ${
                        isAchieved
                          ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                          : 'bg-slate-900/60 border-slate-800/90 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <div className="shrink-0 mt-0.5">
                            {isAchieved ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-500" />
                            )}
                          </div>
                          <div>
                            <span className={`text-xs font-bold block ${isAchieved ? 'text-white' : 'text-slate-100'}`}>
                              Directive {idx + 1}: {obj.title}
                            </span>
                            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                              {obj.description}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded shrink-0 font-semibold uppercase tracking-wider ${
                            isAchieved
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          }`}
                        >
                          {isAchieved ? 'Complete' : 'In Progress'}
                        </span>
                      </div>

                      {/* Objective Progress Bar & Metrics */}
                      <div className="pt-2 border-t border-slate-800/70 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-slate-400">Current Progress:</span>
                          <span className="font-semibold text-slate-200">
                            <span className={isAchieved ? 'text-emerald-400' : 'text-amber-400'}>
                              {formattedCurrent}
                            </span>{' '}
                            / <span className="text-slate-400">{formattedTarget}</span>{' '}
                            <span className="text-slate-500">({progressPct}%)</span>
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800/90 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isAchieved
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : 'bg-gradient-to-r from-amber-500 to-emerald-500'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. Regional Scenario Selector Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider font-display">
                  Deploy to Alternative Decarbonization Theater
                </h4>
                <p className="text-xs text-slate-400">
                  Select a region to assume command of its unique topography, resources, and energy transition hurdles.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {SCENARIOS.map((sc) => {
                const isCurrent = sc.id === currentScenario.id;

                let difficultyColor = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
                if (sc.difficulty === 'Intermediate') {
                  difficultyColor = 'text-amber-400 border-amber-500/30 bg-amber-500/10';
                } else if (sc.difficulty === 'Expert') {
                  difficultyColor = 'text-rose-400 border-rose-500/30 bg-rose-500/10';
                } else if (sc.difficulty === 'Sandbox') {
                  difficultyColor = 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10';
                }

                return (
                  <div
                    key={sc.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                      isCurrent
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-lg ring-1 ring-amber-500/30'
                        : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-white">{sc.name}</span>
                          <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${difficultyColor}`}>
                            {sc.difficulty}
                          </span>
                        </div>
                        {isCurrent && (
                          <span className="text-[10px] text-amber-400 font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400/15 border border-amber-400/30">
                            Current Theater
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed mb-3">
                        {sc.tagline}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-mono mb-3">
                        <span>Starting Capital: <strong className="text-white">₱{sc.startingFunds.toLocaleString()}</strong></span>
                        <span>·</span>
                        <span>Clean Target: <strong className="text-emerald-400">{sc.targetCleanPct}%</strong></span>
                      </div>

                      {/* Specific Mission Deliverables */}
                      <div className="mb-4 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 space-y-1.5">
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                          Specific Mission Deliverables:
                        </span>
                        <div className="space-y-1">
                          {sc.objectives.map((obj, i) => (
                            <div key={i} className="text-[11px] text-slate-300 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                <span className="truncate">{obj.title}</span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                {obj.target} {obj.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        Map: {sc.gridSize.width}×{sc.gridSize.depth} grid
                      </span>

                      {!isCurrent ? (
                        <button
                          onClick={() => {
                            sound.playClick();
                            onSelectScenario(sc);
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors cursor-pointer"
                        >
                          <span>Deploy to Region</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-amber-400">
                          Active Operation
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>EcoGrid Regional Mission Command Console</span>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors cursor-pointer shadow-md"
          >
            Close Briefing & Return to Grid
          </button>
        </div>
      </div>
    </div>
  );
};
