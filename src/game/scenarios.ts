import { Scenario, TerrainType, BuildingType } from './types';

export const SCENARIOS: Scenario[] = [
  {
    id: 'rust_valley',
    name: 'Rust Valley Transition',
    difficulty: 'Beginner',
    tagline: 'Decommission 3 legacy coal plants and build a modern solar & wind backbone.',
    description: 'Rust Valley features diverse terrain: deep offshore waters in the east, a rugged alpine river gorge in the northwest for hydro dams, tectonic mountain ridges for geothermal baseload, and open valley plains for solar and battery storage.',
    startingFunds: 260000,
    gridSize: { width: 8, depth: 8 },
    initialCo2Target: 1500,
    targetCleanPct: 85,
    deadlineDays: 360,
    objectives: [
      {
        id: 'rv_decom_coal',
        title: 'Decommission 3 Coal Plants',
        description: 'Demolish the 3 polluting coal plants across the valley to restore ambient air quality.',
        type: 'decommission_type',
        target: 3,
        targetBuilding: 'coal_plant',
        unit: 'plants',
      },
      {
        id: 'rv_clean_pct',
        title: 'Attain 85%+ Clean Energy',
        description: 'Power at least 85% of regional grid demand from solar, wind, hydro, and geothermal.',
        type: 'clean_percentage',
        target: 85,
        unit: '%',
      },
      {
        id: 'rv_clean_mw',
        title: 'Build 500+ MW Clean Generation',
        description: 'Deploy clean energy generators to build a reliable renewable power backbone.',
        type: 'clean_capacity_mw',
        target: 500,
        unit: 'MW',
      },
      {
        id: 'rv_storage',
        title: 'Install 400+ MWh Battery Storage',
        description: 'Deploy Megapack BESS units to smooth intermittent solar irradiance and wind gusts.',
        type: 'storage_capacity_mwh',
        target: 400,
        unit: 'MWh',
      },
      {
        id: 'rv_zero_co2',
        title: 'Eliminate Fossil Emissions',
        description: 'Cut carbon output to 0 tons CO₂/day to end industrial smog in the valley.',
        type: 'zero_emissions',
        target: 0,
        unit: 't CO₂/day',
      },
    ],
    initialTiles: (x: number, z: number) => {
      let terrain: TerrainType = 'plains';
      let building: BuildingType = 'empty';

      // 1. Deep Ocean & Coastal Waters (East & Southeast) -> for Offshore Marine
      if (x === 7) {
        terrain = 'water';
      } else if (x === 6 && z >= 2) {
        terrain = 'water';
      } else if (x === 6 && z < 2) {
        terrain = 'coastal';
      } else if (x === 5 && z >= 4) {
        terrain = 'coastal';
      }
      // 2. Alpine Mountain Ridge & Peaks (North) -> for Deep Geothermal & Hydro Dams
      else if ((z === 0 && (x === 0 || x === 1 || x === 3 || x === 4)) || (x === 0 && (z === 1 || z === 2))) {
        terrain = 'mountains';
      }
      // 3. Flowing Mountain River Gorge -> for Hydro Dams
      else if ((x === 2 && (z === 0 || z === 1)) || (x === 1 && (z === 2 || z === 3)) || (x === 2 && z === 3)) {
        terrain = 'river';
      }
      // 4. Tectonic Foothills & Highlands -> for Deep Geothermal & Wind
      else if (x <= 1 && z >= 4) {
        terrain = 'hills';
      } else if (x === 2 && (z === 5 || z === 6)) {
        terrain = 'hills';
      }
      // 5. Urban Core
      else if ((x === 3 && z === 3) || (x === 4 && z === 3)) {
        terrain = 'city';
        building = 'city_center';
      }
      // 6. Legacy Fossil Coal Plants
      else if (x === 3 && z === 2) {
        terrain = 'plains';
        building = 'coal_plant';
      } else if (x === 4 && z === 4) {
        terrain = 'plains';
        building = 'coal_plant';
      } else if (x === 2 && z === 4) {
        terrain = 'plains';
        building = 'coal_plant';
      }
      // 7. Grid Substation
      else if (x === 4 && z === 2) {
        terrain = 'plains';
        building = 'substation';
      }

      return { terrain, building };
    },
  },
  {
    id: 'archipelago',
    name: 'Island 100% Microgrid',
    difficulty: 'Intermediate',
    tagline: 'Replace expensive imported diesel with offshore wind, solar, and battery storage.',
    description: 'Isolated in the Pacific, this archipelago features vast offshore ocean waters, a central volcanic caldera for geothermal baseload, and a mountain stream for hydro storage.',
    startingFunds: 320000,
    gridSize: { width: 8, depth: 8 },
    initialCo2Target: 900,
    targetCleanPct: 95,
    deadlineDays: 450,
    objectives: [
      {
        id: 'arch_decom_peakers',
        title: 'Decommission 2 Gas Peakers',
        description: 'Eliminate imported diesel and gas fuel dependency across the islands.',
        type: 'decommission_all_fossil',
        target: 2,
        unit: 'plants',
      },
      {
        id: 'arch_offshore_wind',
        title: 'Deploy 2 Offshore Wind Platforms',
        description: 'Harness continuous Pacific ocean gusts in deepwater and coastal slots.',
        type: 'deploy_building',
        target: 2,
        targetBuilding: 'offshore_wind',
        unit: 'platforms',
      },
      {
        id: 'arch_bess',
        title: 'Deploy 2 Megapack BESS Units',
        description: 'Buffer solar and wind variability with grid-forming utility battery storage.',
        type: 'deploy_building',
        target: 2,
        targetBuilding: 'battery_bess',
        unit: 'units',
      },
      {
        id: 'arch_clean_pct',
        title: 'Reach 95%+ Clean Microgrid',
        description: 'Operate an isolated island microgrid on 95%+ clean renewable power.',
        type: 'clean_percentage',
        target: 95,
        unit: '%',
      },
      {
        id: 'arch_funds',
        title: 'Accumulate ₱450,000 Grid Reserves',
        description: 'Maintain healthy financial solvency from clean power tariff revenues.',
        type: 'funds_accumulated',
        target: 450000,
        unit: '₱',
      },
    ],
    initialTiles: (x: number, z: number) => {
      let terrain: TerrainType = 'water';
      let building: BuildingType = 'empty';

      const distFromCenter = Math.sqrt(Math.pow(x - 3.5, 2) + Math.pow(z - 3.5, 2));

      if (distFromCenter < 1.0) {
        terrain = 'city';
        building = (x === 3 && z === 3) || (x === 4 && z === 3) ? 'city_center' : 'empty';
      } else if ((x === 4 && z === 4) || (x === 4 && z === 5) || (x === 3 && z === 5)) {
        terrain = 'mountains'; // Volcanic peak caldera for Geothermal & Alpine Hydro
      } else if ((x === 3 && z === 4) || (x === 2 && z === 4) || (x === 2 && z === 5)) {
        terrain = 'river'; // Mountain freshwater cascades for Hydro Dams
      } else if (distFromCenter < 2.4) {
        terrain = (x + z) % 2 === 0 ? 'hills' : 'plains';
        if (x === 2 && z === 3) building = 'gas_peaker';
        if (x === 5 && z === 3) building = 'gas_peaker';
      } else if (distFromCenter < 3.2) {
        terrain = 'coastal'; // Shallow waters for offshore marine wind & tidal barriers
      } else {
        terrain = 'water'; // Deep ocean for offshore marine wind
      }

      return { terrain, building };
    },
  },
  {
    id: 'dunkelflaute',
    name: 'The Megacity Dunkelflaute',
    difficulty: 'Expert',
    tagline: 'Survive a prolonged winter freeze with near-zero wind and overcast skies.',
    description: 'A massive metropolis surrounded by deep mountain valleys and an ocean coast. Overcome the winter Dunkelflaute by building reliable deep geothermal and hydro baseload alongside offshore marine wind.',
    startingFunds: 380000,
    gridSize: { width: 8, depth: 8 },
    initialCo2Target: 800,
    targetCleanPct: 90,
    deadlineDays: 300,
    objectives: [
      {
        id: 'df_decom_fossil',
        title: 'Decommission 3 Urban Gas Peakers',
        description: 'Replace smog-generating peaker plants situated near the metropolis core.',
        type: 'decommission_all_fossil',
        target: 3,
        unit: 'plants',
      },
      {
        id: 'df_geothermal',
        title: 'Drill 2 Deep Geothermal Baseload Plants',
        description: 'Harness volcanic subterranean heat to generate continuous 24/7 power without sun or wind.',
        type: 'deploy_building',
        target: 2,
        targetBuilding: 'geothermal',
        unit: 'plants',
      },
      {
        id: 'df_hydro',
        title: 'Commission 1 Alpine Hydro Dam',
        description: 'Build a dispatchable hydroelectric reservoir in the mountain river gorge.',
        type: 'deploy_building',
        target: 1,
        targetBuilding: 'hydro_dam',
        unit: 'station',
      },
      {
        id: 'df_clean_pct',
        title: 'Maintain 90%+ Clean Power',
        description: 'Ensure 90%+ clean generation despite winter freeze and overcast skies.',
        type: 'clean_percentage',
        target: 90,
        unit: '%',
      },
      {
        id: 'df_tech',
        title: 'Research 2 Technology Upgrades',
        description: 'Unlock at least 2 grid resilience or storage upgrades in the Tech Tree.',
        type: 'tech_researched',
        target: 2,
        unit: 'upgrades',
      },
    ],
    initialTiles: (x: number, z: number) => {
      let terrain: TerrainType = 'plains';
      let building: BuildingType = 'empty';

      // Coast & Ocean on the east for Offshore Marine
      if (x === 7) {
        terrain = 'water';
      } else if (x === 6 && z >= 3) {
        terrain = 'water';
      } else if (x === 6 && z < 3) {
        terrain = 'coastal';
      } else if (x === 5 && z >= 6) {
        terrain = 'coastal';
      }
      // Alpine Mountain Range in the north for Deep Geothermal
      else if (z === 0 && x <= 4) {
        terrain = 'mountains';
      } else if (z === 1 && (x === 0 || x === 1 || x === 3 || x === 4)) {
        terrain = 'mountains';
      } else if (z === 2 && (x === 0 || x === 1)) {
        terrain = 'mountains';
      }
      // Alpine reservoir river inlet for Hydro Dams
      else if ((x === 2 && z === 1) || (x === 2 && z === 2) || (x === 3 && z === 2)) {
        terrain = 'river';
      }
      // Western tectonic foothills for Geothermal and Wind
      else if (x <= 1 && z >= 3 && z <= 6) {
        terrain = 'hills';
        if (x === 1 && z === 3) building = 'gas_peaker';
      }
      // Metropolis core
      else if (x >= 4 && x <= 5 && z >= 4 && z <= 5) {
        terrain = 'city';
        building = 'city_center';
      } else if (x === 5 && z === 2) {
        terrain = 'plains';
        building = 'gas_peaker';
      }

      return { terrain, building };
    },
  },
  {
    id: 'sandbox',
    name: 'Clean Energy Sandbox',
    difficulty: 'Sandbox',
    tagline: 'Unlimited exploration. Build the clean energy utopia of your dreams.',
    description: 'Experiment freely with all clean energy structures: marine deepwater wind, alpine hydro dams, volcanic deep geothermal, utility solar, and battery megapacks across every terrain.',
    startingFunds: 900000,
    gridSize: { width: 8, depth: 8 },
    initialCo2Target: 0,
    targetCleanPct: 100,
    deadlineDays: 9999,
    objectives: [
      {
        id: 'sb_diversity',
        title: 'Deploy 4 Distinct Clean Power Types',
        description: 'Incorporate at least 4 different renewable generators (Solar, Wind, Offshore, Hydro, Geothermal).',
        type: 'energy_diversity',
        target: 4,
        unit: 'types',
      },
      {
        id: 'sb_capacity',
        title: 'Reach 1,000+ MW Clean Generation',
        description: 'Scale clean capacity to power a modern thriving industrial hub.',
        type: 'clean_capacity_mw',
        target: 1000,
        unit: 'MW',
      },
      {
        id: 'sb_storage',
        title: 'Deploy 400+ MWh Battery Storage',
        description: 'Install utility storage capacity to guarantee 24/7 reliability.',
        type: 'storage_capacity_mwh',
        target: 400,
        unit: 'MWh',
      },
      {
        id: 'sb_clean_pct',
        title: 'Attain 100% Net Zero Energy',
        description: 'Eliminate all fossil generation for absolute sustainability.',
        type: 'clean_percentage',
        target: 100,
        unit: '%',
      },
    ],
    initialTiles: (x: number, z: number) => {
      let terrain: TerrainType = 'plains';
      let building: BuildingType = 'empty';

      // Ocean & Coastal Shelf (East) for Offshore Marine
      if (x === 7) {
        terrain = 'water';
      } else if (x === 6) {
        terrain = z >= 2 ? 'water' : 'coastal';
      } else if (x === 5 && z >= 5) {
        terrain = 'coastal';
      }
      // Mountain Gorge (Northwest) for Deep Geothermal & Alpine Hydro
      else if (x <= 2 && z <= 0) {
        terrain = 'mountains';
      } else if (x === 0 && (z === 1 || z === 2)) {
        terrain = 'mountains';
      }
      // Winding River Corridor for Hydro Dams
      else if ((x === 1 && z === 1) || (x === 2 && z === 1) || (x === 2 && z === 2) || (x === 3 && z === 2) || (x === 4 && z === 3)) {
        terrain = 'river';
      }
      // Tectonic Foothills (Southwest) for Geothermal & Wind
      else if (x <= 1 && z >= 4 && z <= 7) {
        terrain = 'hills';
      } else if (x === 2 && z >= 5) {
        terrain = 'hills';
      }
      // City
      else if (x === 4 && z === 5) {
        terrain = 'city';
        building = 'city_center';
      }

      return { terrain, building };
    },
  },
];
