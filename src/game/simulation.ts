import { GridTile, WeatherState, TechUpgrade, GameEvent } from './types';
import { BUILDING_DEFS } from './buildingDefs';

export interface SimulationResult {
  weather: WeatherState;
  totalDemandMW: number;
  totalCleanMW: number;
  totalFossilMW: number;
  totalBatteryDischargedMW: number;
  totalBatteryChargedMW: number;
  totalStorageAvailableMWh: number;
  totalStorageCapacityMWh: number;
  cleanPercentage: number;
  gridStabilityPct: number;
  co2PerDay: number;
  cashDelta: number;
  hasBlackout: boolean;
  updatedTiles: GridTile[];
  newEvents: GameEvent[];
}

export function createInitialWeather(): WeatherState {
  return {
    timeOfDay: 9.0, // 9:00 AM
    day: 1,
    year: 2026,
    windSpeedMs: 8.5,
    solarIrradiancePct: 80,
    temperatureC: 22,
    cloudCoverPct: 20,
    isHeatwave: false,
    isDunkelflaute: false,
  };
}

export function updateWeather(current: WeatherState, deltaHours: number): WeatherState {
  let newTime = current.timeOfDay + deltaHours;
  let newDay = current.day;
  let newYear = current.year;

  if (newTime >= 24) {
    newTime -= 24;
    newDay += 1;
    if (newDay > 365) {
      newDay = 1;
      newYear += 1;
    }
  }

  // Periodic weather shift
  const dayCyclePhase = (newTime / 24) * Math.PI * 2;
  
  // Sunlight: 6:00 to 18:00
  let rawSun = 0;
  if (newTime >= 6 && newTime <= 18) {
    const sunAngle = ((newTime - 6) / 12) * Math.PI;
    rawSun = Math.sin(sunAngle) * 100;
  }

  // Cloud variation using noise-like sine combination
  const cloudCycle = Math.sin(newDay * 0.7 + newTime * 0.2) * 25 + Math.cos(newDay * 0.3) * 15 + 30;
  const clampedCloud = Math.max(5, Math.min(95, cloudCycle));

  // Actual solar irradiance after cloud absorption
  const solarIrradiancePct = Math.max(0, Math.round(rawSun * (1 - clampedCloud * 0.007)));

  // Wind speed variation: base + daily breeze + random gust
  const baseWind = 7.5 + Math.sin(newDay * 0.5 + newTime * 0.15) * 4.5 + Math.cos(newTime * 0.4) * 2;
  const windSpeedMs = Math.max(1.0, Math.min(22.0, Number(baseWind.toFixed(1))));

  // Temperature
  const temperatureC = Math.round(18 + Math.sin(dayCyclePhase - Math.PI / 2) * 7 - (clampedCloud > 70 ? 2 : 0));

  return {
    timeOfDay: Number(newTime.toFixed(4)),
    day: newDay,
    year: newYear,
    windSpeedMs,
    solarIrradiancePct,
    temperatureC,
    cloudCoverPct: Math.round(clampedCloud),
    isHeatwave: temperatureC > 31,
    isDunkelflaute: clampedCloud > 80 && windSpeedMs < 3.5,
  };
}

export function stepSimulation(
  tiles: GridTile[],
  weather: WeatherState,
  unlockedTechs: TechUpgrade[],
  currentFunds: number,
  deltaSeconds: number
): SimulationResult {
  const events: GameEvent[] = [];
  // Time scale: 1 in-game minute = 2 real seconds at 1x speed (1 in-game hour = 120 real seconds)
  const deltaHours = deltaSeconds / 120;

  // Apply tech bonuses
  let solarMultiplier = 1.0;
  let windMultiplier = 1.0;
  let batteryMultiplier = 1.0;
  let demandMultiplier = 1.0;
  let carbonCreditMultiplier = 1.0;

  unlockedTechs.forEach((t) => {
    if (t.bonus.solarMultiplier) solarMultiplier *= t.bonus.solarMultiplier;
    if (t.bonus.windMultiplier) windMultiplier *= t.bonus.windMultiplier;
    if (t.bonus.batteryMultiplier) batteryMultiplier *= t.bonus.batteryMultiplier;
    if (t.bonus.demandReductionPct) demandMultiplier *= (1 - t.bonus.demandReductionPct);
    if (t.bonus.carbonCreditRateMultiplier) carbonCreditMultiplier *= t.bonus.carbonCreditRateMultiplier;
  });

  // Calculate Base Demand
  // Duck curve demand pattern: Morning peak 8am, Evening peak 7pm (19:00)
  const hour = weather.timeOfDay;
  let demandFactor = 0.85;
  if (hour >= 7 && hour <= 9) {
    demandFactor = 1.15; // Morning wake-up / industrial ramp
  } else if (hour >= 17 && hour <= 21) {
    demandFactor = 1.35; // Evening peak (residential, cooking, lighting)
  } else if (hour >= 23 || hour <= 5) {
    demandFactor = 0.65; // Night valley
  }

  if (weather.isHeatwave) {
    demandFactor *= 1.25; // Air conditioning load
  }

  let totalDemandMW = 0;
  let totalCleanMW = 0;
  let totalFossilMW = 0;
  let totalCo2Daily = 0;
  let dailyMaintenance = 0;

  let totalStorageAvailableMWh = 0;
  let totalStorageCapacityMWh = 0;

  const batteryTiles: GridTile[] = [];

  // Update tiles and sum initial generation
  const updatedTiles: GridTile[] = tiles.map((tile): GridTile => {
    const def = BUILDING_DEFS[tile.building];
    let outputMW = 0;

    // Check decommissioning progress
    if (tile.decommissioning) {
      const progress = (tile.decommissionProgress || 0) + (deltaSeconds * 4);
      if (progress >= 100) {
        events.push({
          id: `decom_${tile.id}_${Date.now()}`,
          title: 'Plant Decommissioned',
          description: `${def.name} has been safely retired. Emissions ceased!`,
          type: 'positive',
          timestamp: Date.now(),
        });
        return {
          ...tile,
          building: 'remediated_park',
          decommissioning: false,
          decommissionProgress: 0,
          powerOutputMW: 0,
        };
      }
      return {
        ...tile,
        decommissionProgress: progress,
        powerOutputMW: 0,
      };
    }

    // Daily maintenance cost (₱/day)
    dailyMaintenance += (def.maintenancePerDay * (tile.level === 2 ? 1.4 : 1.0));

    if (def.category === 'civic' && def.basePowerMW < 0) {
      // City demand tile
      const cityDemand = Math.abs(def.basePowerMW) * demandFactor * demandMultiplier * (tile.level === 2 ? 1.5 : 1.0);
      totalDemandMW += cityDemand;
      outputMW = -cityDemand;
    } else if (def.category === 'fossil') {
      // Fossil power plant
      outputMW = def.basePowerMW * (tile.level === 2 ? 1.3 : 1.0);
      totalFossilMW += outputMW;
      totalCo2Daily += def.co2PerDay * (tile.level === 2 ? 1.2 : 1.0);
    } else if (def.category === 'renewable') {
      // Clean renewable power
      if (tile.building === 'solar_farm') {
        const irradianceFrac = weather.solarIrradiancePct / 100;
        outputMW = def.basePowerMW * irradianceFrac * solarMultiplier * (tile.level === 2 ? 1.35 : 1.0);
      } else if (tile.building === 'wind_turbine') {
        // Wind turbine power curve: normalized between 3 m/s and 12 m/s
        const v = weather.windSpeedMs;
        let windFactor = 0;
        if (v >= 3 && v <= 25) {
          windFactor = Math.min(1.0, Math.pow((v - 3) / 9, 2));
        }
        outputMW = def.basePowerMW * windFactor * windMultiplier * (tile.level === 2 ? 1.35 : 1.0);
      } else if (tile.building === 'offshore_wind') {
        // Offshore experiences ~25% stronger, smoother winds
        const v = weather.windSpeedMs * 1.25;
        let windFactor = 0;
        if (v >= 3 && v <= 25) {
          windFactor = Math.min(1.0, Math.pow((v - 3) / 8.5, 2));
        }
        outputMW = def.basePowerMW * windFactor * windMultiplier * (tile.level === 2 ? 1.35 : 1.0);
      } else if (tile.building === 'hydro_dam') {
        // Dispatchable renewable
        outputMW = def.basePowerMW * (tile.level === 2 ? 1.3 : 1.0);
      } else if (tile.building === 'geothermal') {
        // Weather-independent baseload
        outputMW = def.basePowerMW * (tile.level === 2 ? 1.35 : 1.0);
      }
      totalCleanMW += outputMW;
    } else if (tile.building === 'battery_bess') {
      const capacity = (def.maxStorageMWh || 400) * batteryMultiplier * (tile.level === 2 ? 1.6 : 1.0);
      totalStorageCapacityMWh += capacity;
      totalStorageAvailableMWh += tile.storedMWh;
    } else if (tile.building === 'remediated_park') {
      totalCo2Daily += def.co2PerDay; // Negative, acts as carbon sink
    }

    return {
      ...tile,
      powerOutputMW: Number(outputMW.toFixed(1)),
    };
  });

  // Battery Charging / Discharging Logic
  let totalBatteryDischargedMW = 0;
  let totalBatteryChargedMW = 0;

  const netCleanSurplusMW = totalCleanMW - totalDemandMW;

  if (netCleanSurplusMW > 0 && totalStorageCapacityMWh > 0) {
    // Charge batteries with clean surplus
    const maxChargeRateMW = updatedTiles.filter((t) => t.building === 'battery_bess').length * 100;
    const chargeMW = Math.min(netCleanSurplusMW, maxChargeRateMW);
    const chargeMWh = chargeMW * deltaHours;

    let remainingToCharge = chargeMWh;
    updatedTiles.forEach((tile) => {
      if (tile.building === 'battery_bess') {
        const def = BUILDING_DEFS.battery_bess;
        const maxCap = (def.maxStorageMWh || 400) * batteryMultiplier * (tile.level === 2 ? 1.6 : 1.0);
        const space = maxCap - tile.storedMWh;
        const add = Math.min(space, remainingToCharge);
        tile.storedMWh += add;
        remainingToCharge -= add;
        tile.powerOutputMW = -chargeMW; // negative indicates charging
      }
    });
    totalBatteryChargedMW = chargeMW;
  } else if (netCleanSurplusMW < 0 && totalStorageAvailableMWh > 0) {
    // Deficit: Discharge batteries to avoid running fossil or blacking out
    const deficitMW = Math.abs(netCleanSurplusMW);
    const maxDischargeRateMW = updatedTiles.filter((t) => t.building === 'battery_bess').length * 100;
    const dischargeMW = Math.min(deficitMW, maxDischargeRateMW);
    const neededMWh = dischargeMW * deltaHours;

    let remainingDischarge = neededMWh;
    updatedTiles.forEach((tile) => {
      if (tile.building === 'battery_bess' && tile.storedMWh > 0) {
        const take = Math.min(tile.storedMWh, remainingDischarge);
        tile.storedMWh -= take;
        remainingDischarge -= take;
        tile.powerOutputMW = dischargeMW;
      }
    });

    const actualDischargedMW = (neededMWh - remainingDischarge) / deltaHours;
    totalBatteryDischargedMW = actualDischargedMW;
    totalCleanMW += actualDischargedMW; // Discharged stored clean energy counts toward serving demand
  }

  // Calculate clean energy percentage
  const effectiveTotalGeneration = totalCleanMW + totalFossilMW;
  const cleanPercentage = effectiveTotalGeneration > 0
    ? Math.min(100, Math.round((totalCleanMW / effectiveTotalGeneration) * 100))
    : 0;

  // Grid Stability: 100% when supply meets or exceeds demand
  const supplyDeficitMW = totalDemandMW - effectiveTotalGeneration;
  const hasBlackout = supplyDeficitMW > 30; // 30MW threshold
  const gridStabilityPct = Math.max(0, Math.min(100, Math.round((effectiveTotalGeneration / Math.max(1, totalDemandMW)) * 100)));

  // Economics (Hourly rate ₱/hr)
  // Electricity tariff revenue: ₱95 per MWh consumed
  const powerDeliveredMW = Math.min(effectiveTotalGeneration, totalDemandMW);
  const powerRevenueHourly = powerDeliveredMW * 95;

  // Carbon Credit Incentive: ₱30 per MWh of clean energy generated
  const cleanCreditRevenueHourly = totalCleanMW * 30 * carbonCreditMultiplier;

  // Maintenance hourly cost: dailyMaintenance / 24
  const maintenanceCostHourly = dailyMaintenance / 24;

  // Fossil Fuel Cost: Fuel burning costs for coal and gas (₱45/MWh generated)
  const fossilFuelCostHourly = totalFossilMW * 45;

  // Blackout penalty: ₱250/MWh unserved energy per hour
  const blackoutPenaltyHourly = hasBlackout ? supplyDeficitMW * 250 : 0;

  const cashRatePerHour = powerRevenueHourly + cleanCreditRevenueHourly - maintenanceCostHourly - fossilFuelCostHourly - blackoutPenaltyHourly;

  return {
    weather,
    totalDemandMW: Math.round(totalDemandMW),
    totalCleanMW: Math.round(totalCleanMW),
    totalFossilMW: Math.round(totalFossilMW),
    totalBatteryDischargedMW: Math.round(totalBatteryDischargedMW),
    totalBatteryChargedMW: Math.round(totalBatteryChargedMW),
    totalStorageAvailableMWh: Math.round(totalStorageAvailableMWh),
    totalStorageCapacityMWh: Math.round(totalStorageCapacityMWh),
    cleanPercentage,
    gridStabilityPct,
    co2PerDay: Math.max(0, Math.round(totalCo2Daily)),
    cashDelta: Math.round(cashRatePerHour),
    hasBlackout,
    updatedTiles,
    newEvents: events,
  };
}
