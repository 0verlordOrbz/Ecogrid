import React from 'react';
import {
  X,
  Zap,
  Leaf,
  DollarSign,
  AlertTriangle,
  ArrowUpCircle,
  Trash2,
  CheckCircle,
  Hammer,
} from 'lucide-react';
import { GridTile } from '../game/types';
import { BUILDING_DEFS } from '../game/buildingDefs';
import { sound } from '../game/audio';

interface TileInspectorProps {
  tile: GridTile | null;
  funds: number;
  onClose: () => void;
  onUpgrade: (tile: GridTile) => void;
  onDecommission: (tile: GridTile) => void;
  onDemolish: (tile: GridTile) => void;
  onQuickBuild: (tile: GridTile, buildingType: any) => void;
}

export const TileInspector: React.FC<TileInspectorProps> = ({
  tile,
  funds,
  onClose,
  onUpgrade,
  onDecommission,
  onDemolish,
  onQuickBuild,
}) => {
  if (!tile) return null;

  const def = BUILDING_DEFS[tile.building];
  const isFossil = def.category === 'fossil';
  const isRenewable = def.category === 'renewable';
  const isStorage = def.category === 'storage';
  const isCity = tile.building === 'city_center';
  const isEmpty = tile.building === 'empty';

  const upgradeCost = def.upgradeCost || 25000;
  const canAffordUpgrade = funds >= upgradeCost;

  return (
    <div className="absolute top-28 left-4 z-30 w-84 bg-slate-950/95 backdrop-blur-md rounded-xl border border-slate-800 shadow-2xl p-4 text-slate-200 pointer-events-auto select-none max-h-[calc(100vh-8.5rem)] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
        <div>
          <h3 className="text-sm font-bold text-white font-display">
            {def.name}
          </h3>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
            <span className="capitalize">{tile.terrain} terrain</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">Tile ({tile.x}, {tile.z})</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-300 leading-relaxed mb-3">
        {def.description}
      </p>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-900/80 rounded-lg border border-slate-800/80 mb-3 text-xs">
        <div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
            {isCity ? 'Peak Demand' : isStorage ? 'Storage Buffer' : 'Power Output'}
          </span>
          <span className="font-mono tabular-nums font-bold text-white text-sm">
            {isCity
              ? `${Math.abs(tile.powerOutputMW)} MW`
              : isStorage
              ? `${Math.round(tile.storedMWh)} / ${(def.maxStorageMWh || 400) * (tile.level === 2 ? 1.6 : 1)} MWh`
              : `${tile.powerOutputMW} MW`}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
            LCOE Metric
          </span>
          <span className="font-mono tabular-nums text-slate-300 text-sm">
            {def.lcoe}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
            Emissions
          </span>
          <span className={`font-mono tabular-nums font-semibold ${def.co2PerDay > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {def.co2PerDay > 0 ? `+${def.co2PerDay} t/day` : def.co2PerDay < 0 ? `${def.co2PerDay} t sink` : '0 (Zero CO2)'}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
            Maintenance
          </span>
          <span className="font-mono tabular-nums text-slate-300">
            ₱{def.maintenancePerDay}/day
          </span>
        </div>
      </div>

      {/* Decommissioning in Progress Indicator */}
      {tile.decommissioning && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg mb-3">
          <div className="flex items-center justify-between text-xs text-amber-300 mb-1 font-medium">
            <span>Decommissioning in Progress</span>
            <span className="font-mono">{Math.round(tile.decommissionProgress || 0)}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-all duration-300"
              style={{ width: `${tile.decommissionProgress || 0}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Retiring plant safely and remediating soil for conversion to an Eco Park.
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        {/* Decommission Fossil Plant Button */}
        {isFossil && !tile.decommissioning && (
          <button
            onClick={() => {
              sound.playDecommission();
              onDecommission(tile);
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Decommission & Phase Out Plant</span>
          </button>
        )}

        {/* Upgrade Renewable / Storage */}
        {(isRenewable || isStorage) && tile.level < 2 && (
          <button
            onClick={() => {
              sound.playUpgrade();
              onUpgrade(tile);
            }}
            disabled={!canAffordUpgrade}
            className={`w-full flex items-center justify-between py-2 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              canAffordUpgrade
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <ArrowUpCircle className="w-4 h-4" />
              <span>Upgrade to Level 2 (+35% yield)</span>
            </div>
            <span className="font-mono tabular-nums font-semibold">₱{upgradeCost.toLocaleString()}</span>
          </button>
        )}

        {/* Already at Max Level */}
        {(isRenewable || isStorage) && tile.level >= 2 && (
          <div className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Max Level High-Efficiency Asset</span>
          </div>
        )}

        {/* Demolish / Clear */}
        {!isCity && !isEmpty && !tile.decommissioning && (
          <button
            onClick={() => {
              sound.playClick();
              onDemolish(tile);
            }}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg text-xs transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Land (₱2,000 salvage fee)</span>
          </button>
        )}

        {/* Direct Construction Options on Empty Tile */}
        {isEmpty && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
              Construct on this {tile.terrain}:
            </span>
            <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
              {(Object.keys(BUILDING_DEFS) as Array<keyof typeof BUILDING_DEFS>)
                .filter((bType) => {
                  if (bType === 'empty' || bType === 'coal_plant' || bType === 'gas_peaker' || bType === 'city_center') {
                    return false;
                  }
                  const bDef = BUILDING_DEFS[bType];
                  return bDef.allowedTerrains.includes(tile.terrain);
                })
                .map((bType) => {
                  const bDef = BUILDING_DEFS[bType];
                  const canAfford = funds >= bDef.cost;
                  return (
                    <button
                      key={bType}
                      onClick={() => {
                        if (canAfford) {
                          onQuickBuild(tile, bType);
                        } else {
                          sound.playCannotDeploy();
                        }
                      }}
                      disabled={!canAfford}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                        canAfford
                          ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 hover:border-emerald-500/70 text-white'
                          : 'bg-slate-950/60 border-slate-900 text-slate-500 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex flex-col text-left">
                        <span className="font-semibold text-slate-200">{bDef.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {bDef.basePowerMW > 0 ? `${bDef.basePowerMW} MW` : bDef.lcoe}
                        </span>
                      </div>
                      <span className="font-mono tabular-nums font-bold text-emerald-400 text-xs">
                        ₱{Math.round(bDef.cost / 1000)}k
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
