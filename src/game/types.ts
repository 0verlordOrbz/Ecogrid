/**
 * Types and interfaces for the EcoGrid Clean Energy Transition simulation game.
 */

export type TerrainType = 'water' | 'coastal' | 'plains' | 'hills' | 'mountains' | 'river' | 'city';

export type BuildingCategory = 'fossil' | 'renewable' | 'storage' | 'infrastructure' | 'civic';

export type BuildingType = 
  | 'empty'
  | 'coal_plant'
  | 'gas_peaker'
  | 'solar_farm'
  | 'wind_turbine'
  | 'offshore_wind'
  | 'hydro_dam'
  | 'geothermal'
  | 'battery_bess'
  | 'substation'
  | 'city_center'
  | 'remediated_park';

export interface BuildingDef {
  type: BuildingType;
  name: string;
  category: BuildingCategory;
  description: string;
  cost: number;
  maintenancePerDay: number;
  basePowerMW: number; // Positive = produces, Negative = consumes, 0 = passive
  maxStorageMWh?: number; // For batteries
  co2PerDay: number; // Metric tons CO2 per day
  allowedTerrains: TerrainType[];
  upgradeCost?: number;
  techRequired?: string;
  icon: string;
  lcoe: string; // Levelized Cost of Energy indicator (₱/MWh)
  capacityFactor: number; // 0 to 1
}

export interface GridTile {
  id: string;
  x: number;
  z: number;
  terrain: TerrainType;
  elevation: number;
  building: BuildingType;
  level: number;
  health: number; // 0 to 100
  powerOutputMW: number;
  storedMWh: number;
  decommissioning?: boolean;
  decommissionProgress?: number; // 0 to 100
  installedDay?: number;
}

export interface WeatherState {
  timeOfDay: number; // 0.0 to 24.0 (hours)
  day: number;
  year: number;
  windSpeedMs: number; // m/s (0 to 25)
  solarIrradiancePct: number; // 0 to 100%
  temperatureC: number;
  cloudCoverPct: number; // 0 to 100%
  isHeatwave: boolean;
  isDunkelflaute: boolean; // low wind, high cloud
}

export interface TechUpgrade {
  id: string;
  name: string;
  cost: number;
  category: 'efficiency' | 'storage' | 'grid' | 'policy';
  description: string;
  effectDescription: string;
  unlocked: boolean;
  bonus: {
    solarMultiplier?: number;
    windMultiplier?: number;
    batteryMultiplier?: number;
    carbonCreditRateMultiplier?: number;
    demandReductionPct?: number;
  };
}

export type ObjectiveType =
  | 'decommission_type'
  | 'decommission_all_fossil'
  | 'clean_percentage'
  | 'deploy_building'
  | 'deploy_count'
  | 'clean_capacity_mw'
  | 'storage_capacity_mwh'
  | 'funds_accumulated'
  | 'tech_researched'
  | 'zero_emissions'
  | 'energy_diversity';

export interface SpecificObjective {
  id: string;
  title: string;
  description: string;
  type: ObjectiveType;
  target: number;
  current?: number;
  unit?: string;
  targetBuilding?: BuildingType;
  completed?: boolean;
}

export interface Scenario {
  id: string;
  name: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Expert' | 'Sandbox';
  tagline: string;
  description: string;
  startingFunds: number;
  gridSize: { width: number; depth: number };
  initialCo2Target: number;
  targetCleanPct: number;
  deadlineDays: number;
  initialTiles: (x: number, z: number, terrain: TerrainType, building: BuildingType) => Partial<GridTile>;
  objectives: SpecificObjective[];
}

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'positive' | 'warning' | 'critical';
  timestamp: number;
  persistent?: boolean;
}

export interface VRHudData {
  funds: number;
  cashDelta: number;
  totalDemandMW: number;
  totalCleanMW: number;
  totalFossilMW: number;
  cleanPercentage: number;
  co2PerDay: number;
  gridStabilityPct: number;
  storageMWh: number;
  storageCapacityMWh: number;
  activeScenarioName: string;
  directivesCount: string;
  topDirectiveTitle: string;
  topDirectiveProgress: string;
  hasBlackout: boolean;
  timeFormatted: string;
  windSpeedMs: number;
  solarIrradiancePct: number;
}
