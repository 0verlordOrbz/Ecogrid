import React from 'react';
import { X, BookOpen, Sun, Wind, Battery, Activity, Flame, ShieldCheck } from 'lucide-react';
import { sound } from '../game/audio';

interface EnergyCodexModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EnergyCodexModal: React.FC<EnergyCodexModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-3xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-display">
                Clean Energy Transition Codex
              </h2>
              <p className="text-xs text-slate-400">
                Essential engineering principles, physics, and grid stability mechanics.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-300 text-xs leading-relaxed">
          {/* Article 1: The Duck Curve */}
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
              <Sun className="w-4 h-4" />
              <span>1. The Duck Curve & Solar Peak Overgeneration</span>
            </div>
            <p>
              When massive amounts of solar photovoltaic (PV) power enter the grid, net demand drops sharply in the middle of the day (creating the "belly" of the duck). As the sun sets between 17:00 and 20:00, solar generation plunges right when residential electricity demand peaks (the "neck" of the duck).
            </p>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-400">
              <strong className="text-white">Solution in EcoGrid:</strong> Deploy <strong>Utility Megapack BESS</strong> batteries to absorb excess midday solar power and instantly discharge it during the evening peak ramp.
            </div>
          </div>

          {/* Article 2: Levelized Cost of Energy (LCOE) */}
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <Activity className="w-4 h-4" />
              <span>2. Levelized Cost of Energy (LCOE) Economics</span>
            </div>
            <p>
              LCOE measures the lifetime cost of building and operating a generator divided by total energy output (₱/MWh). Today, utility-scale onshore wind (~₱36/MWh) and solar PV (~₱32/MWh) are the cheapest new electricity sources in human history, far undercutting new coal (₱85+/MWh) and gas peakers (₱70+/MWh).
            </p>
          </div>

          {/* Article 3: Baseload vs Dispatchable Clean Power */}
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>3. Clean Baseload: Geothermal & Hydro</span>
            </div>
            <p>
              While wind and solar are variable (weather-dependent), modern grids require firm, continuous generation. <strong>Deep Geothermal</strong> taps high-temperature crustal heat to produce 24/7 weather-independent power with zero emissions. <strong>Hydroelectric Dams</strong> provide instant dispatchable energy and spinning inertia to keep grid frequency synchronized at 50/60 Hz.
            </p>
          </div>

          {/* Article 4: Dunkelflaute Survival */}
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
              <Wind className="w-4 h-4" />
              <span>4. Surviving "Dunkelflaute" (Dark Doldrums)</span>
            </div>
            <p>
              Dunkelflaute is a European meteorological term describing winter high-pressure weather with calm winds (&lt;3 m/s) and heavy cloud cover for consecutive days. Grids relying solely on wind and solar risk deficits unless paired with multi-hour battery storage, geothermal baseload, and smart demand response.
            </p>
          </div>

          {/* Article 5: Brownfield Remediation */}
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-green-400 font-semibold text-sm">
              <Flame className="w-4 h-4 text-rose-400" />
              <span>5. Decommissioning & Eco-Park Remediation</span>
            </div>
            <p>
              Retiring coal plants eliminates sulfur dioxide, mercury, and thousands of metric tons of daily CO₂. In EcoGrid, decommissioned sites are safely capped and remediated into <strong>Eco-Parks</strong> that sequester carbon, clean the atmosphere, and boost regional happiness.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-900/40 border-t border-slate-800 flex justify-end">
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer"
          >
            Got it, back to the grid
          </button>
        </div>
      </div>
    </div>
  );
};
