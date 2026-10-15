import { GridTile, Scenario, SpecificObjective, TechUpgrade } from './types';
import { SimulationResult } from './simulation';
import { BUILDING_DEFS } from './buildingDefs';

export interface EvaluatedObjective extends SpecificObjective {
  current: number;
  completed: boolean;
  progressPct: number;
  formattedTarget: string;
  formattedCurrent: string;
}

export interface ScenarioEvaluation {
  objectives: EvaluatedObjective[];
  completedCount: number;
  totalCount: number;
  allCompleted: boolean;
  isWon: boolean;
}

export interface SimulationMetrics {
  cleanPercentage: number;
  totalCleanMW: number;
  co2PerDay: number;
}

/**
 * Evaluates live progress for each specific objective in a scenario
 */
export function evaluateObjectives(
  scenario: Scenario,
  tiles: GridTile[],
  simulation: SimulationMetrics,
  funds: number,
  techs: TechUpgrade[]
): ScenarioEvaluation {
  // Count current buildings
  const buildingCounts = new Map<string, number>();
  let totalStorageMWh = 0;
  const distinctCleanTypes = new Set<string>();

  for (const tile of tiles) {
    if (tile.building && tile.building !== 'empty') {
      buildingCounts.set(tile.building, (buildingCounts.get(tile.building) || 0) + 1);
      const def = BUILDING_DEFS[tile.building];
      if (def?.category === 'renewable') {
        distinctCleanTypes.add(tile.building);
      }
      if (tile.building === 'battery_bess') {
        totalStorageMWh += (def.maxStorageMWh || 400) * tile.level;
      }
    }
  }

  // Count current fossil plants
  let currentFossilCount = 0;
  for (const tile of tiles) {
    const def = BUILDING_DEFS[tile.building];
    if (def?.category === 'fossil') {
      currentFossilCount++;
    }
  }

  const evaluated: EvaluatedObjective[] = scenario.objectives.map((obj) => {
    let current = 0;
    let completed = false;

    switch (obj.type) {
      case 'decommission_type': {
        const targetBldg = obj.targetBuilding || 'coal_plant';
        const remaining = buildingCounts.get(targetBldg) || 0;
        current = Math.max(0, obj.target - remaining);
        completed = remaining === 0;
        break;
      }

      case 'decommission_all_fossil': {
        current = Math.max(0, obj.target - currentFossilCount);
        completed = currentFossilCount === 0;
        break;
      }

      case 'clean_percentage': {
        current = Math.round(simulation.cleanPercentage);
        completed = current >= obj.target;
        break;
      }

      case 'deploy_building': {
        const targetBldg = obj.targetBuilding || 'offshore_wind';
        current = buildingCounts.get(targetBldg) || 0;
        completed = current >= obj.target;
        break;
      }

      case 'clean_capacity_mw': {
        current = Math.round(simulation.totalCleanMW);
        completed = current >= obj.target;
        break;
      }

      case 'storage_capacity_mwh': {
        current = totalStorageMWh;
        completed = current >= obj.target;
        break;
      }

      case 'funds_accumulated': {
        current = Math.floor(funds);
        completed = current >= obj.target;
        break;
      }

      case 'tech_researched': {
        current = techs.filter((t) => t.unlocked).length;
        completed = current >= obj.target;
        break;
      }

      case 'zero_emissions': {
        const emissions = Math.round(simulation.co2PerDay);
        current = emissions;
        completed = emissions === 0 && currentFossilCount === 0;
        break;
      }

      case 'energy_diversity': {
        current = distinctCleanTypes.size;
        completed = current >= obj.target;
        break;
      }

      default: {
        current = 0;
        completed = false;
        break;
      }
    }

    let progressPct = 0;
    if (obj.type === 'zero_emissions') {
      progressPct = completed ? 100 : Math.max(0, 100 - Math.min(100, (current / Math.max(1, scenario.initialCo2Target || 1000)) * 100));
    } else {
      progressPct = Math.min(100, Math.max(0, Math.round((current / Math.max(1, obj.target)) * 100)));
    }

    let formattedTarget = `${obj.target.toLocaleString()}`;
    let formattedCurrent = `${current.toLocaleString()}`;

    if (obj.unit) {
      if (obj.unit === '₱') {
        formattedTarget = `₱${obj.target.toLocaleString()}`;
        formattedCurrent = `₱${current.toLocaleString()}`;
      } else if (obj.unit === '%') {
        formattedTarget = `${obj.target}%`;
        formattedCurrent = `${current}%`;
      } else {
        formattedTarget = `${obj.target} ${obj.unit}`;
        formattedCurrent = `${current} ${obj.unit}`;
      }
    }

    return {
      ...obj,
      current,
      completed,
      progressPct,
      formattedTarget,
      formattedCurrent,
    };
  });

  const completedCount = evaluated.filter((o) => o.completed).length;
  const totalCount = evaluated.length;
  const allCompleted = totalCount > 0 && completedCount === totalCount;
  const isWon = scenario.difficulty !== 'Sandbox' && allCompleted;

  return {
    objectives: evaluated,
    completedCount,
    totalCount,
    allCompleted,
    isWon,
  };
}
