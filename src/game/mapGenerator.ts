import { BuildingType, GridTile, Scenario, TerrainType } from './types';

interface TileDraft {
  terrain: TerrainType;
  building: BuildingType;
  elevation: number;
}

/**
 * Procedural Map & Grid Generator
 * Generates organic, diverse, playable clean energy grids randomized every reload and scenario.
 * Guarantees buildable terrain slots for:
 *  - Offshore Marine Wind (water & coastal)
 *  - Hydroelectric Dam (river & mountain gorges)
 *  - Deep Geothermal (mountains & tectonic hills)
 */
export function generateScenarioGrid(scenario: Scenario): GridTile[] {
  const width = scenario.gridSize.width || 8;
  const depth = scenario.gridSize.depth || 8;
  const total = width * depth;

  // Initialize draft grid
  const draft: TileDraft[][] = Array.from({ length: width }, () =>
    Array.from({ length: depth }, () => ({
      terrain: 'plains' as TerrainType,
      building: 'empty' as BuildingType,
      elevation: 0.28,
    }))
  );

  const scenarioId = scenario.id;

  if (scenarioId === 'archipelago') {
    generateArchipelago(draft, width, depth);
  } else if (scenarioId === 'rust_valley') {
    generateRustValley(draft, width, depth);
  } else if (scenarioId === 'dunkelflaute') {
    generateDunkelflaute(draft, width, depth);
  } else {
    // Sandbox or custom
    generateSandbox(draft, width, depth);
  }

  // Ensure mandatory renewable construction slots
  ensureRequiredBuildingTerrains(draft, width, depth);

  // Convert draft to final GridTile array
  const tiles: GridTile[] = [];
  for (let x = 0; x < width; x++) {
    for (let z = 0; z < depth; z++) {
      const d = draft[x][z];
      tiles.push({
        id: `tile_${x}_${z}`,
        x,
        z,
        terrain: d.terrain,
        elevation: getTerrainElevation(d.terrain),
        building: d.building,
        level: 1,
        health: 100,
        powerOutputMW: 0,
        storedMWh: d.building === 'battery_bess' ? 200 : 0,
        decommissioning: false,
        decommissionProgress: 0,
        installedDay: 1,
      });
    }
  }

  return tiles;
}

function getTerrainElevation(terrain: TerrainType): number {
  switch (terrain) {
    case 'mountains':
      return 1.0;
    case 'hills':
      return 0.6;
    case 'city':
      return 0.35;
    case 'plains':
      return 0.28;
    case 'coastal':
      return 0.22;
    case 'river':
      return 0.18;
    case 'water':
      return 0.12;
    default:
      return 0.28;
  }
}

/**
 * Rust Valley Transition Procedural Generator
 * Objective: Decommission 3 legacy coal plants.
 * Features: Ocean edge for offshore wind, winding river gorge for hydro dams,
 * alpine mountain ridge for deep geothermal, fertile valley for solar & BESS.
 */
function generateRustValley(draft: TileDraft[][], width: number, depth: number) {
  // 1. Pick a random coast orientation (0: East, 1: South, 2: West, 3: North)
  const oceanSide = Math.floor(Math.random() * 4);

  for (let x = 0; x < width; x++) {
    for (let z = 0; z < depth; z++) {
      let isOcean = false;
      let isCoast = false;

      if (oceanSide === 0) {
        // East coast (high X)
        if (x === width - 1) isOcean = true;
        else if (x === width - 2 && (z >= 1 && z <= depth - 2 || Math.random() < 0.6)) isOcean = true;
        else if (x === width - 2 || (x === width - 3 && Math.random() < 0.4)) isCoast = true;
      } else if (oceanSide === 1) {
        // South coast (high Z)
        if (z === depth - 1) isOcean = true;
        else if (z === depth - 2 && (x >= 1 && x <= width - 2 || Math.random() < 0.6)) isOcean = true;
        else if (z === depth - 2 || (z === depth - 3 && Math.random() < 0.4)) isCoast = true;
      } else if (oceanSide === 2) {
        // West coast (low X)
        if (x === 0) isOcean = true;
        else if (x === 1 && (z >= 1 && z <= depth - 2 || Math.random() < 0.6)) isOcean = true;
        else if (x === 1 || (x === 2 && Math.random() < 0.4)) isCoast = true;
      } else {
        // North coast (low Z)
        if (z === 0) isOcean = true;
        else if (z === 1 && (x >= 1 && x <= width - 2 || Math.random() < 0.6)) isOcean = true;
        else if (z === 1 || (z === 2 && Math.random() < 0.4)) isCoast = true;
      }

      if (isOcean) {
        draft[x][z].terrain = 'water';
      } else if (isCoast) {
        draft[x][z].terrain = 'coastal';
      }
    }
  }

  // 2. Generate Alpine Mountain Range on the opposite side of the ocean
  const mountainPoints: { x: number; z: number }[] = [];
  const mountainCount = 4 + Math.floor(Math.random() * 3); // 4 to 6

  let originX = oceanSide === 0 ? 0 : oceanSide === 2 ? width - 1 : Math.floor(Math.random() * 3);
  let originZ = oceanSide === 1 ? 0 : oceanSide === 3 ? depth - 1 : Math.floor(Math.random() * 3);

  for (let i = 0; i < mountainCount; i++) {
    const mx = Math.max(0, Math.min(width - 1, originX + Math.floor(Math.random() * 3) - (oceanSide === 2 ? 1 : 0)));
    const mz = Math.max(0, Math.min(depth - 1, originZ + Math.floor(Math.random() * 3) - (oceanSide === 3 ? 1 : 0)));
    if (draft[mx][mz].terrain !== 'water' && draft[mx][mz].terrain !== 'coastal') {
      draft[mx][mz].terrain = 'mountains';
      mountainPoints.push({ x: mx, z: mz });
    }
  }

  // 3. Generate Winding River Gorge from high terrain towards the ocean
  let riverX = originX + (Math.random() < 0.5 ? 1 : 0);
  let riverZ = originZ + (Math.random() < 0.5 ? 1 : 0);
  riverX = Math.max(0, Math.min(width - 1, riverX));
  riverZ = Math.max(0, Math.min(depth - 1, riverZ));

  const riverTargetX = oceanSide === 0 ? width - 1 : oceanSide === 2 ? 0 : Math.floor(width / 2);
  const riverTargetZ = oceanSide === 1 ? depth - 1 : oceanSide === 3 ? 0 : Math.floor(depth / 2);

  let riverSteps = 0;
  while (riverSteps < 9) {
    if (draft[riverX][riverZ].terrain !== 'mountains' && draft[riverX][riverZ].terrain !== 'water') {
      draft[riverX][riverZ].terrain = 'river';
    }
    if (riverX === riverTargetX && riverZ === riverTargetZ) break;

    const dx = Math.sign(riverTargetX - riverX);
    const dz = Math.sign(riverTargetZ - riverZ);

    if (Math.random() < 0.5 && dx !== 0) {
      riverX += dx;
    } else if (dz !== 0) {
      riverZ += dz;
    } else if (dx !== 0) {
      riverX += dx;
    } else {
      break;
    }
    riverSteps++;
  }

  // 4. Generate Foothills and Highlands around mountains and river
  const hillCount = 5 + Math.floor(Math.random() * 4);
  for (let i = 0; i < hillCount; i++) {
    const hx = Math.floor(Math.random() * width);
    const hz = Math.floor(Math.random() * depth);
    if (draft[hx][hz].terrain === 'plains') {
      draft[hx][hz].terrain = 'hills';
    }
  }

  // 5. Urban Core: Place 2 adjacent city center tiles
  placeCityCenter(draft, width, depth, 2);

  // 6. Objective Requirement: Exactly 3 Legacy Coal Plants to decommission
  placeStructures(draft, width, depth, 'coal_plant', 3, ['plains', 'hills']);

  // 7. Grid Substation
  placeStructures(draft, width, depth, 'substation', 1, ['plains', 'hills']);
}

/**
 * Island 100% Microgrid (Archipelago) Procedural Generator
 * Objective: Decommission gas/diesel peakers, install offshore marine wind & BESS.
 * Features: Surrounded by deep ocean waters, island cluster with volcanic caldera & stream.
 */
function generateArchipelago(draft: TileDraft[][], width: number, depth: number) {
  // Start with all water
  for (let x = 0; x < width; x++) {
    for (let z = 0; z < depth; z++) {
      draft[x][z].terrain = 'water';
    }
  }

  // Randomized island center
  const centerX = 3.2 + (Math.random() * 0.8 - 0.4);
  const centerZ = 3.2 + (Math.random() * 0.8 - 0.4);
  const islandRadius = 2.4 + Math.random() * 0.4;

  for (let x = 0; x < width; x++) {
    for (let z = 0; z < depth; z++) {
      const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(z - centerZ, 2));
      const noise = (Math.sin(x * 1.5) + Math.cos(z * 1.5)) * 0.35;

      if (dist + noise < islandRadius * 0.5) {
        draft[x][z].terrain = 'hills';
      } else if (dist + noise < islandRadius * 0.85) {
        draft[x][z].terrain = 'plains';
      } else if (dist + noise < islandRadius * 1.25) {
        draft[x][z].terrain = 'coastal';
      } else {
        draft[x][z].terrain = 'water';
      }
    }
  }

  // Volcanic caldera peaks (Deep Geothermal)
  const calderaCount = 3 + Math.floor(Math.random() * 2);
  for (let i = 0; i < calderaCount; i++) {
    const cx = Math.max(1, Math.min(width - 2, Math.round(centerX + (Math.random() * 2 - 1))));
    const cz = Math.max(1, Math.min(depth - 2, Math.round(centerZ + (Math.random() * 2 - 1))));
    if (draft[cx][cz].terrain !== 'water') {
      draft[cx][cz].terrain = 'mountains';
    }
  }

  // Freshwater cascade / mountain stream (Hydro Dam)
  const streamLength = 3 + Math.floor(Math.random() * 2);
  let sx = Math.round(centerX);
  let sz = Math.round(centerZ);
  for (let i = 0; i < streamLength; i++) {
    if (draft[sx][sz].terrain !== 'mountains' && draft[sx][sz].terrain !== 'water') {
      draft[sx][sz].terrain = 'river';
    }
    const dir = Math.floor(Math.random() * 4);
    if (dir === 0) sx = Math.min(width - 1, sx + 1);
    else if (dir === 1) sx = Math.max(0, sx - 1);
    else if (dir === 2) sz = Math.min(depth - 1, sz + 1);
    else sz = Math.max(0, sz - 1);
  }

  // City center on island
  placeCityCenter(draft, width, depth, 1);

  // Objective: 2 gas peakers to decommission
  placeStructures(draft, width, depth, 'gas_peaker', 2, ['plains', 'hills']);
}

/**
 * The Megacity Dunkelflaute Procedural Generator
 * Objective: Decommission gas peakers, build reliable baseload (hydro & geothermal).
 * Features: High-density city core, coastal port, alpine reservoir.
 */
function generateDunkelflaute(draft: TileDraft[][], width: number, depth: number) {
  // Ocean along a corner/edge
  const coastAxis = Math.random() < 0.5 ? 'x' : 'z';
  for (let x = 0; x < width; x++) {
    for (let z = 0; z < depth; z++) {
      const coord = coastAxis === 'x' ? x : z;
      const maxCoord = coastAxis === 'x' ? width : depth;

      if (coord >= maxCoord - 1) {
        draft[x][z].terrain = 'water';
      } else if (coord >= maxCoord - 2) {
        draft[x][z].terrain = Math.random() < 0.5 ? 'water' : 'coastal';
      } else if (coord >= maxCoord - 3) {
        draft[x][z].terrain = Math.random() < 0.4 ? 'coastal' : 'plains';
      }
    }
  }

  // Alpine Mountain Range for Geothermal baseload
  const mountainCount = 5 + Math.floor(Math.random() * 2);
  const mSideX = coastAxis === 'x' ? 0 : Math.floor(Math.random() * 4);
  const mSideZ = coastAxis === 'z' ? 0 : Math.floor(Math.random() * 4);

  for (let i = 0; i < mountainCount; i++) {
    const mx = Math.max(0, Math.min(width - 1, mSideX + Math.floor(Math.random() * 3)));
    const mz = Math.max(0, Math.min(depth - 1, mSideZ + Math.floor(Math.random() * 3)));
    if (draft[mx][mz].terrain !== 'water' && draft[mx][mz].terrain !== 'coastal') {
      draft[mx][mz].terrain = 'mountains';
    }
  }

  // Hydro reservoir river
  let rx = mSideX + 1;
  let rz = mSideZ + 1;
  for (let i = 0; i < 4; i++) {
    if (rx >= 0 && rx < width && rz >= 0 && rz < depth) {
      if (draft[rx][rz].terrain !== 'mountains' && draft[rx][rz].terrain !== 'water') {
        draft[rx][rz].terrain = 'river';
      }
    }
    if (coastAxis === 'x') rx++;
    else rz++;
  }

  // Hills
  const hillCount = 5 + Math.floor(Math.random() * 3);
  for (let i = 0; i < hillCount; i++) {
    const hx = Math.floor(Math.random() * width);
    const hz = Math.floor(Math.random() * depth);
    if (draft[hx][hz].terrain === 'plains') {
      draft[hx][hz].terrain = 'hills';
    }
  }

  // Metropolis: 2 to 3 city center tiles
  placeCityCenter(draft, width, depth, 2);

  // Objective: 2 to 3 gas peakers to decommission
  placeStructures(draft, width, depth, 'gas_peaker', 2, ['plains', 'hills']);
}

/**
 * Clean Energy Sandbox Procedural Generator
 * Features: Balanced harmonious distribution of all biomes with ample space.
 */
function generateSandbox(draft: TileDraft[][], width: number, depth: number) {
  // 1. Ocean Bay & Coastal Shelf (one edge)
  const edge = Math.floor(Math.random() * 4);
  for (let x = 0; x < width; x++) {
    for (let z = 0; z < depth; z++) {
      let isWater = false;
      let isCoastal = false;

      if (edge === 0 && x >= width - 2) {
        if (x === width - 1) isWater = true;
        else isWater = Math.random() < 0.6;
        isCoastal = !isWater;
      } else if (edge === 1 && z >= depth - 2) {
        if (z === depth - 1) isWater = true;
        else isWater = Math.random() < 0.6;
        isCoastal = !isWater;
      } else if (edge === 2 && x <= 1) {
        if (x === 0) isWater = true;
        else isWater = Math.random() < 0.6;
        isCoastal = !isWater;
      } else if (edge === 3 && z <= 1) {
        if (z === 0) isWater = true;
        else isWater = Math.random() < 0.6;
        isCoastal = !isWater;
      }

      if (isWater) draft[x][z].terrain = 'water';
      else if (isCoastal) draft[x][z].terrain = 'coastal';
    }
  }

  // 2. Mountains (3-5 tiles)
  const mxStart = edge === 0 || edge === 1 ? 0 : width - 3;
  const mzStart = edge === 0 || edge === 1 ? 0 : depth - 3;
  for (let i = 0; i < 4; i++) {
    const mx = Math.max(0, Math.min(width - 1, mxStart + Math.floor(Math.random() * 3)));
    const mz = Math.max(0, Math.min(depth - 1, mzStart + Math.floor(Math.random() * 3)));
    if (draft[mx][mz].terrain !== 'water' && draft[mx][mz].terrain !== 'coastal') {
      draft[mx][mz].terrain = 'mountains';
    }
  }

  // 3. Winding River (4-5 tiles)
  let rx = mxStart + 1;
  let rz = mzStart + 1;
  for (let i = 0; i < 5; i++) {
    if (rx >= 0 && rx < width && rz >= 0 && rz < depth) {
      if (draft[rx][rz].terrain !== 'mountains' && draft[rx][rz].terrain !== 'water') {
        draft[rx][rz].terrain = 'river';
      }
    }
    if (edge === 0) rx++;
    else if (edge === 1) rz++;
    else if (edge === 2) rx--;
    else rz--;
  }

  // 4. Hills (6 tiles)
  for (let i = 0; i < 6; i++) {
    const hx = Math.floor(Math.random() * width);
    const hz = Math.floor(Math.random() * depth);
    if (draft[hx][hz].terrain === 'plains') {
      draft[hx][hz].terrain = 'hills';
    }
  }

  // 5. 1 City Center for power demand
  placeCityCenter(draft, width, depth, 1);
}

/**
 * Guarantees that every generated grid has multiple open, buildable tiles for:
 * 1. Offshore Marine Wind ('water', 'coastal', 'river')
 * 2. Hydro Dam ('river', 'mountains', 'hills', 'water', 'coastal')
 * 3. Deep Geothermal ('mountains', 'hills', 'plains')
 */
function ensureRequiredBuildingTerrains(draft: TileDraft[][], width: number, depth: number) {
  let emptyWaterOrCoast = 0;
  let emptyRiver = 0;
  let emptyMountains = 0;
  let emptyHills = 0;
  let emptyPlains = 0;

  for (let x = 0; x < width; x++) {
    for (let z = 0; z < depth; z++) {
      const tile = draft[x][z];
      if (tile.building === 'empty') {
        if (tile.terrain === 'water' || tile.terrain === 'coastal') emptyWaterOrCoast++;
        if (tile.terrain === 'river') emptyRiver++;
        if (tile.terrain === 'mountains') emptyMountains++;
        if (tile.terrain === 'hills') emptyHills++;
        if (tile.terrain === 'plains') emptyPlains++;
      }
    }
  }

  // 1. Ensure at least 4 empty water or coastal tiles for Offshore Marine
  if (emptyWaterOrCoast < 4) {
    const needed = 4 - emptyWaterOrCoast;
    let converted = 0;
    for (let z = 0; z < depth && converted < needed; z++) {
      if (draft[width - 1][z].building === 'empty' && draft[width - 1][z].terrain !== 'mountains') {
        draft[width - 1][z].terrain = 'water';
        converted++;
      }
    }
  }

  // 2. Ensure at least 3 empty river tiles for Hydro Dam
  if (emptyRiver < 3) {
    const needed = 3 - emptyRiver;
    let converted = 0;
    for (let x = 1; x < width - 1 && converted < needed; x++) {
      for (let z = 1; z < depth - 1 && converted < needed; z++) {
        if (draft[x][z].building === 'empty' && draft[x][z].terrain === 'plains') {
          draft[x][z].terrain = 'river';
          converted++;
        }
      }
    }
  }

  // 3. Ensure at least 3 empty mountain tiles for Deep Geothermal & Alpine Hydro
  if (emptyMountains < 3) {
    const needed = 3 - emptyMountains;
    let converted = 0;
    for (let x = 0; x < width && converted < needed; x++) {
      for (let z = 0; z < depth && converted < needed; z++) {
        if (draft[x][z].building === 'empty' && (draft[x][z].terrain === 'plains' || draft[x][z].terrain === 'hills')) {
          draft[x][z].terrain = 'mountains';
          converted++;
        }
      }
    }
  }

  // 4. Ensure at least 4 empty hills
  if (emptyHills < 4) {
    const needed = 4 - emptyHills;
    let converted = 0;
    for (let x = 0; x < width && converted < needed; x++) {
      for (let z = 0; z < depth && converted < needed; z++) {
        if (draft[x][z].building === 'empty' && draft[x][z].terrain === 'plains') {
          draft[x][z].terrain = 'hills';
          converted++;
        }
      }
    }
  }
}

/**
 * Places City Center tile(s) in suitable central/plains/hills terrain
 */
function placeCityCenter(draft: TileDraft[][], width: number, depth: number, count: number) {
  // Find central candidate tiles
  const candidates: { x: number; z: number }[] = [];
  for (let x = 2; x <= width - 3; x++) {
    for (let z = 2; z <= depth - 3; z++) {
      if (draft[x][z].terrain === 'plains' || draft[x][z].terrain === 'hills') {
        candidates.push({ x, z });
      }
    }
  }

  if (candidates.length === 0) {
    // Fallback to any non-water tile
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < depth; z++) {
        if (draft[x][z].terrain !== 'water') candidates.push({ x, z });
      }
    }
  }

  // Shuffle candidates
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  let placed = 0;
  for (const c of candidates) {
    if (placed >= count) break;
    draft[c.x][c.z].terrain = 'city';
    draft[c.x][c.z].building = 'city_center';
    placed++;

    // If we need 2, try to place the second one right adjacent to the first
    if (count > 1 && placed === 1) {
      const neighbors = [
        { x: c.x + 1, z: c.z },
        { x: c.x, z: c.z + 1 },
        { x: c.x - 1, z: c.z },
        { x: c.x, z: c.z - 1 },
      ].filter((n) => n.x >= 0 && n.x < width && n.z >= 0 && n.z < depth && draft[n.x][n.z].terrain !== 'water');

      if (neighbors.length > 0) {
        const next = neighbors[0];
        draft[next.x][next.z].terrain = 'city';
        draft[next.x][next.z].building = 'city_center';
        placed++;
      }
    }
  }
}

/**
 * Places specific structures on allowed terrains without replacing existing buildings
 */
function placeStructures(
  draft: TileDraft[][],
  width: number,
  depth: number,
  buildingType: BuildingType,
  count: number,
  allowedTerrains: TerrainType[]
) {
  const eligible: { x: number; z: number }[] = [];
  for (let x = 0; x < width; x++) {
    for (let z = 0; z < depth; z++) {
      if (draft[x][z].building === 'empty' && allowedTerrains.includes(draft[x][z].terrain)) {
        eligible.push({ x, z });
      }
    }
  }

  // Shuffle
  for (let i = eligible.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
  }

  let placed = 0;
  for (const e of eligible) {
    if (placed >= count) break;
    draft[e.x][e.z].building = buildingType;
    placed++;
  }
}
