import React, { useState } from 'react';
import {
  Sun,
  Wind,
  Waves,
  Droplet,
  Mountain,
  BatteryCharging,
  Activity,
  Leaf,
  Coins,
  Wrench,
  MousePointer,
  Zap,
  CheckCircle,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { BuildingType } from '../game/types';
import { BUILDING_DEFS } from '../game/buildingDefs';
import { sound } from '../game/audio';

export type SidebarToolMode = 'select' | 'build' | 'sell' | 'repair';

interface RedAlertSidebarProps {
  funds: number;
  selectedBuildType: BuildingType | null;
  toolMode: SidebarToolMode;
  onSelectBuild: (type: BuildingType | null) => void;
  onSetToolMode: (mode: SidebarToolMode) => void;
  totalGenerationMW: number;
  totalDemandMW: number;
}

interface SidebarBuildOption {
  type: BuildingType;
  name: string;
  category: 'generation' | 'storage' | 'eco';
  cost: number;
  stat: string;
  outputMW: number;
  icon: React.ReactNode;
  shortcut: string;
}

export const RedAlertSidebar: React.FC<RedAlertSidebarProps> = ({
  funds,
  selectedBuildType,
  toolMode,
  onSelectBuild,
  onSetToolMode,
  totalGenerationMW,
  totalDemandMW,
}) => {
  const [activeCategory, setActiveCategory] = useState<'generation' | 'storage' | 'eco'>('generation');

  const buildOptions: SidebarBuildOption[] = [
    {
      type: 'solar_farm',
      name: 'Solar PV Array',
      category: 'generation',
      cost: BUILDING_DEFS.solar_farm.cost,
      stat: '120 MW Day Peak',
      outputMW: 120,
      icon: <Sun className="w-5 h-5 text-amber-400" />,
      shortcut: '1',
    },
    {
      type: 'wind_turbine',
      name: 'Onshore Wind',
      category: 'generation',
      cost: BUILDING_DEFS.wind_turbine.cost,
      stat: '140 MW Wind Breeze',
      outputMW: 140,
      icon: <Wind className="w-5 h-5 text-sky-400" />,
      shortcut: '2',
    },
    {
      type: 'offshore_wind',
      name: 'Offshore Marine',
      category: 'generation',
      cost: BUILDING_DEFS.offshore_wind.cost,
      stat: '200 MW Deep Ocean',
      outputMW: 200,
      icon: <Waves className="w-5 h-5 text-cyan-400" />,
      shortcut: '3',
    },
    {
      type: 'hydro_dam',
      name: 'Hydro Dam',
      category: 'generation',
      cost: BUILDING_DEFS.hydro_dam.cost,
      stat: '260 MW Dispatchable',
      outputMW: 260,
      icon: <Droplet className="w-5 h-5 text-blue-400" />,
      shortcut: '4',
    },
    {
      type: 'geothermal',
      name: 'Deep Geothermal',
      category: 'generation',
      cost: BUILDING_DEFS.geothermal.cost,
      stat: '220 MW 24/7 Baseload',
      outputMW: 220,
      icon: <Mountain className="w-5 h-5 text-emerald-400" />,
      shortcut: '5',
    },
    {
      type: 'battery_bess',
      name: 'Megapack BESS',
      category: 'storage',
      cost: BUILDING_DEFS.battery_bess.cost,
      stat: '400 MWh 4-Hr Buffer',
      outputMW: 100,
      icon: <BatteryCharging className="w-5 h-5 text-emerald-300" />,
      shortcut: '6',
    },
    {
      type: 'substation',
      name: 'Smart Substation',
      category: 'storage',
      cost: BUILDING_DEFS.substation.cost,
      stat: '+15% Grid Stability',
      outputMW: 0,
      icon: <Activity className="w-5 h-5 text-indigo-400" />,
      shortcut: '7',
    },
    {
      type: 'remediated_park',
      name: 'Eco-Park & Wetland',
      category: 'eco',
      cost: BUILDING_DEFS.remediated_park.cost,
      stat: '-40t CO2 Carbon Sink',
      outputMW: 0,
      icon: <Leaf className="w-5 h-5 text-green-400" />,
      shortcut: '8',
    },
  ];

  const handleCardClick = (type: BuildingType) => {
    if (selectedBuildType === type) {
      sound.playCancel();
      onSelectBuild(null);
      onSetToolMode('select');
    } else {
      sound.playClick();
      onSelectBuild(type);
      onSetToolMode('build');
    }
  };

  const handleSellToolClick = () => {
    sound.playClick();
    if (toolMode === 'sell') {
      onSetToolMode('select');
    } else {
      onSelectBuild(null);
      onSetToolMode('sell');
    }
  };

  const handleRepairToolClick = () => {
    sound.playClick();
    if (toolMode === 'repair') {
      onSetToolMode('select');
    } else {
      onSelectBuild(null);
      onSetToolMode('repair');
    }
  };

  const handleSelectToolClick = () => {
    sound.playClick();
    onSelectBuild(null);
    onSetToolMode('select');
  };

  // Power Balance calculations for the Red Alert vertical power meter
  const powerSurplus = totalGenerationMW - totalDemandMW;
  const powerRatio = totalDemandMW > 0 ? totalGenerationMW / totalDemandMW : 1.2;
  const powerPct = Math.min(100, Math.max(5, Math.round(powerRatio * 70)));
  const isLowPower = powerRatio < 1.0;

  const filteredOptions = buildOptions.filter((opt) => opt.category === activeCategory);

  return (
    <aside className="absolute right-0 top-14 bottom-0 z-30 w-72 bg-slate-950/92 backdrop-blur-md border-l border-slate-800/90 flex shadow-2xl pointer-events-auto select-none">
      {/* 1. Iconic Red Alert Vertical Power Gauge Strip */}
      <div className="w-7 bg-slate-900/90 border-r border-slate-800/80 flex flex-col items-center justify-between py-3 px-1">
        <div className="text-[9px] font-mono font-bold text-slate-400 rotate-180 uppercase tracking-widest [writing-mode:vertical-rl]">
          PWR
        </div>

        {/* Vertical segmented LED bar */}
        <div className="w-3 flex-1 my-2 bg-slate-950 rounded-sm p-0.5 flex flex-col-reverse gap-0.5 overflow-hidden border border-slate-800">
          {Array.from({ length: 24 }).map((_, idx) => {
            const activeLevel = (idx + 1) / 24;
            const isActive = activeLevel <= powerPct / 100;
            let barColor = 'bg-emerald-500';
            if (activeLevel > 0.8) barColor = 'bg-sky-400';
            if (isLowPower) barColor = 'bg-rose-500 animate-pulse';

            return (
              <div
                key={idx}
                className={`w-full h-1 rounded-[1px] transition-colors ${
                  isActive ? barColor : 'bg-slate-800/50'
                }`}
              />
            );
          })}
        </div>

        <Zap className={`w-3.5 h-3.5 ${isLowPower ? 'text-rose-400 animate-bounce' : 'text-emerald-400'}`} />
      </div>

      {/* 2. Main Construction Panel */}
      <div className="flex-1 flex flex-col justify-between overflow-hidden">
        {/* Top Control Strip (Red Alert Utility Buttons: Pointer, Sell, Repair) */}
        <div className="p-2 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between gap-1.5">
          <button
            onClick={handleSelectToolClick}
            title="Inspect / Select Mode"
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded text-xs font-semibold transition-colors cursor-pointer ${
              toolMode === 'select'
                ? 'bg-slate-700 text-white shadow-inner'
                : 'bg-slate-850 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>Select</span>
          </button>

          <button
            onClick={handleSellToolClick}
            title="Sell / Decommission Structure (Click building on map)"
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded text-xs font-semibold transition-colors cursor-pointer ${
              toolMode === 'sell'
                ? 'bg-rose-600 text-white shadow-inner ring-1 ring-rose-400'
                : 'bg-slate-850 hover:bg-slate-800 text-rose-300'
            }`}
          >
            <span className="font-mono font-bold text-xs leading-none">₱</span>
            <span>Sell [S]</span>
          </button>

          <button
            onClick={handleRepairToolClick}
            title="Repair & Upgrade Structure (Click building on map)"
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded text-xs font-semibold transition-colors cursor-pointer ${
              toolMode === 'repair'
                ? 'bg-amber-600 text-white shadow-inner ring-1 ring-amber-400'
                : 'bg-slate-850 hover:bg-slate-800 text-amber-300'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Upgrade [R]</span>
          </button>
        </div>

        {/* Category Tabs (Generation / Storage / Eco) */}
        <div className="flex border-b border-slate-800/80 bg-slate-950/60 text-xs font-medium">
          <button
            onClick={() => setActiveCategory('generation')}
            className={`flex-1 py-2 text-center transition-colors border-b-2 cursor-pointer ${
              activeCategory === 'generation'
                ? 'border-emerald-400 text-white font-semibold bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Energy
          </button>
          <button
            onClick={() => setActiveCategory('storage')}
            className={`flex-1 py-2 text-center transition-colors border-b-2 cursor-pointer ${
              activeCategory === 'storage'
                ? 'border-cyan-400 text-white font-semibold bg-cyan-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Storage
          </button>
          <button
            onClick={() => setActiveCategory('eco')}
            className={`flex-1 py-2 text-center transition-colors border-b-2 cursor-pointer ${
              activeCategory === 'eco'
                ? 'border-green-400 text-white font-semibold bg-green-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Eco-Park
          </button>
        </div>

        {/* Active Command Status Banner */}
        {toolMode === 'build' && selectedBuildType && (
          <div className="px-3 py-1.5 bg-emerald-950/80 border-b border-emerald-500/40 text-[11px] text-emerald-300 flex items-center justify-between">
            <span className="font-semibold truncate">READY: {BUILDING_DEFS[selectedBuildType].name}</span>
            <span className="text-[10px] text-slate-400">R-Click Cancel</span>
          </div>
        )}

        {toolMode === 'sell' && (
          <div className="px-3 py-1.5 bg-rose-950/80 border-b border-rose-500/40 text-[11px] text-rose-300 flex items-center justify-between animate-pulse">
            <span className="font-semibold">DECOMMISSION TOOL ACTIVE</span>
            <span className="text-[10px] text-slate-400">R-Click Cancel</span>
          </div>
        )}

        {toolMode === 'repair' && (
          <div className="px-3 py-1.5 bg-amber-950/80 border-b border-amber-500/40 text-[11px] text-amber-300 flex items-center justify-between">
            <span className="font-semibold">UPGRADE TOOL ACTIVE</span>
            <span className="text-[10px] text-slate-400">R-Click Cancel</span>
          </div>
        )}

        {/* Construction Grid Options */}
        <div className="flex-1 p-2.5 overflow-y-auto space-y-2">
          {filteredOptions.map((opt) => {
            const isSelected = selectedBuildType === opt.type && toolMode === 'build';
            const canAfford = funds >= opt.cost;

            return (
              <div
                key={opt.type}
                onClick={() => canAfford && handleCardClick(opt.type)}
                className={`relative p-2.5 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500/20 border-emerald-400 shadow-md ring-1 ring-emerald-400/50'
                    : canAfford
                    ? 'bg-slate-900/80 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                    : 'bg-slate-950/60 border-slate-900 opacity-40 cursor-not-allowed'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded bg-slate-800/80 border border-slate-700/60 shrink-0">
                      {opt.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white leading-tight">
                          {opt.name}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 bg-slate-800 px-1 py-0.2 rounded">
                          [{opt.shortcut}]
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {opt.stat}
                      </span>
                      <span className="text-[9px] text-emerald-400/80 block mt-0.5 font-medium capitalize">
                        Grids: {BUILDING_DEFS[opt.type].allowedTerrains.slice(0, 3).join(', ')}
                      </span>
                    </div>
                  </div>

                  {/* Cost badge */}
                  <div className="text-right shrink-0">
                    <span className="font-mono tabular-nums font-bold text-xs text-emerald-400 block">
                      ₱{Math.round(opt.cost / 1000)}k
                    </span>
                    <span className="text-[9px] text-slate-500 block">
                      {isSelected ? 'CLICK GRID' : 'READY'}
                    </span>
                  </div>
                </div>

                {/* Selection indicator border accent */}
                {isSelected && (
                  <div className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-400 rounded-b" />
                )}
              </div>
            );
          })}
        </div>

        {/* Footer instructions & status */}
        <div className="p-2.5 border-t border-slate-800/80 bg-slate-900/40 text-[10px] text-slate-400 leading-tight">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-300 font-medium">Red Alert RTS Mode</span>
            <span className="font-mono text-emerald-400 font-semibold">₱{funds.toLocaleString()}</span>
          </div>
          <span>• Click building, then place on 3D grid</span><br />
          <span>• Right-click or ESC to cancel placement</span>
        </div>
      </div>
    </aside>
  );
};
