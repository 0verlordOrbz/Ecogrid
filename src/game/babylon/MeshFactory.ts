import {
  Scene,
  Mesh,
  TransformNode,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  ParticleSystem,
  Texture,
} from '@babylonjs/core';
import { BuildingType, TerrainType, GridTile } from '../types';

export interface TileMeshBundle {
  rootMesh: Mesh;
  terrain?: TerrainType;
  surfaceY: number;
  buildingRoot?: Mesh;
  rotatorMeshes?: Mesh[]; // for wind turbine blades
  particles?: ParticleSystem;
  overheadBadge?: Mesh;
  badgeTexture?: any;
  tileData?: GridTile;
}

export class MeshFactory {
  private scene: Scene;
  private materials: Map<string, StandardMaterial> = new Map();

  constructor(scene: Scene) {
    this.scene = scene;
    this.initMaterials();
  }

  private initMaterials() {
    // Terrain materials
    this.createMat('mat_water', new Color3(0.12, 0.42, 0.72), 0.8, 0.4);
    this.createMat('mat_river', new Color3(0.18, 0.58, 0.88), 0.7, 0.3);
    this.createMat('mat_coastal', new Color3(0.85, 0.78, 0.58), 0.2);
    this.createMat('mat_plains', new Color3(0.28, 0.58, 0.25), 0.1);
    this.createMat('mat_hills', new Color3(0.38, 0.48, 0.28), 0.1);
    this.createMat('mat_mountains', new Color3(0.48, 0.48, 0.52), 0.1);
    this.createMat('mat_city_ground', new Color3(0.25, 0.28, 0.32), 0.2);

    // Structure materials
    this.createMat('mat_clean_white', new Color3(0.95, 0.96, 0.98), 0.4);
    this.createMat('mat_turbine_blade', new Color3(0.9, 0.92, 0.95), 0.5);
    this.createMat('mat_solar_blue', new Color3(0.08, 0.18, 0.45), 0.9, 0.6);
    this.createMat('mat_coal_dark', new Color3(0.2, 0.2, 0.22), 0.1);
    this.createMat('mat_rust_brick', new Color3(0.55, 0.25, 0.18), 0.1);
    this.createMat('mat_gas_metal', new Color3(0.35, 0.38, 0.42), 0.4);
    this.createMat('mat_dam_concrete', new Color3(0.65, 0.65, 0.68), 0.1);
    this.createMat('mat_battery_body', new Color3(0.92, 0.94, 0.95), 0.4);
    this.createMat('mat_battery_led', new Color3(0.1, 0.9, 0.4), 0.9, 0.8, new Color3(0.1, 0.8, 0.4));
    this.createMat('mat_park_green', new Color3(0.18, 0.65, 0.22), 0.1);
    this.createMat('mat_tree_trunk', new Color3(0.38, 0.22, 0.12), 0.05);
    this.createMat('mat_offshore_yellow', new Color3(0.95, 0.72, 0.05), 0.3);
    this.createMat('mat_sky_building', new Color3(0.28, 0.35, 0.45), 0.6, 0.3);
    this.createMat('mat_window_glow', new Color3(0.9, 0.85, 0.5), 0.8, 0.8, new Color3(0.6, 0.5, 0.2));

    // Red Alert Ghost Blueprint materials
    const ghostValid = this.createMat('mat_ghost_valid', new Color3(0.2, 0.95, 0.3), 0.3, 0.3, new Color3(0.15, 0.75, 0.25));
    ghostValid.alpha = 0.55;

    const ghostInvalid = this.createMat('mat_ghost_invalid', new Color3(0.95, 0.2, 0.2), 0.3, 0.3, new Color3(0.85, 0.15, 0.15));
    ghostInvalid.alpha = 0.55;
  }

  private createMat(name: string, diffuse: Color3, specularIntensity: number = 0.2, roughness: number = 0.5, emissive?: Color3): StandardMaterial {
    const mat = new StandardMaterial(name, this.scene);
    mat.diffuseColor = diffuse;
    mat.specularColor = new Color3(specularIntensity, specularIntensity, specularIntensity);
    if (emissive) {
      mat.emissiveColor = emissive;
    }
    this.materials.set(name, mat);
    return mat;
  }

  public getMaterial(name: string): StandardMaterial {
    return this.materials.get(name) || this.materials.get('mat_plains')!;
  }

  /**
   * Builds the base terrain tile
   */
  public createTileBase(x: number, z: number, terrain: TerrainType): Mesh {
    const tileSize = 2.0;
    const spacing = 2.15;
    let height = 0.3;
    let matName = 'mat_plains';

    if (terrain === 'water') {
      height = 0.15;
      matName = 'mat_water';
    } else if (terrain === 'river') {
      height = 0.22;
      matName = 'mat_river';
    } else if (terrain === 'coastal') {
      height = 0.25;
      matName = 'mat_coastal';
    } else if (terrain === 'hills') {
      height = 0.55;
      matName = 'mat_hills';
    } else if (terrain === 'mountains') {
      height = 0.95;
      matName = 'mat_mountains';
    } else if (terrain === 'city') {
      height = 0.35;
      matName = 'mat_city_ground';
    }

    const box = MeshBuilder.CreateBox(`tile_${x}_${z}`, {
      width: tileSize,
      height: height,
      depth: tileSize,
    }, this.scene);

    box.position = new Vector3(x * spacing, height / 2, z * spacing);
    box.material = this.getMaterial(matName);

    // Metadata for picking
    box.metadata = { tileX: x, tileZ: z, surfaceY: height, isTileBase: true };
    return box;
  }

  /**
   * Builds the building structure placed on the tile
   */
  public createBuilding(buildingType: BuildingType, basePosition: Vector3, level: number = 1): { root: Mesh; rotators?: Mesh[]; particles?: ParticleSystem } {
    const root = new Mesh(`bldg_${buildingType}_${Date.now()}`, this.scene);
    root.position = new Vector3(basePosition.x, basePosition.y, basePosition.z);
    const rotators: Mesh[] = [];
    let particles: ParticleSystem | undefined;

    switch (buildingType) {
      case 'wind_turbine': {
        // Tower
        const tower = MeshBuilder.CreateCylinder('tower', {
          height: 2.2,
          diameterTop: 0.12,
          diameterBottom: 0.25,
          tessellation: 12,
        }, this.scene);
        tower.position.y = 1.1;
        tower.material = this.getMaterial('mat_clean_white');
        tower.parent = root;

        // Nacelle
        const nacelle = MeshBuilder.CreateBox('nacelle', {
          width: 0.28,
          height: 0.24,
          depth: 0.5,
        }, this.scene);
        nacelle.position.y = 2.2;
        nacelle.material = this.getMaterial('mat_clean_white');
        nacelle.parent = root;

        // Rotor Hub & 3 Blades
        const rotorRoot = new Mesh('rotor_root', this.scene);
        rotorRoot.position = new Vector3(0, 2.2, 0.26);
        rotorRoot.parent = root;

        const hub = MeshBuilder.CreateSphere('hub', { diameter: 0.22 }, this.scene);
        hub.material = this.getMaterial('mat_offshore_yellow');
        hub.parent = rotorRoot;

        for (let i = 0; i < 3; i++) {
          const bladeArm = new TransformNode(`blade_arm_${i}`, this.scene);
          bladeArm.position = Vector3.Zero();
          bladeArm.rotation.z = (i * Math.PI * 2) / 3;
          bladeArm.parent = rotorRoot;

          const blade = MeshBuilder.CreateBox(`blade_${i}`, {
            width: 0.08,
            height: 1.15,
            depth: 0.03,
          }, this.scene);
          blade.position.y = 0.58; // Centers the blade extending outward from the hub
          blade.material = this.getMaterial('mat_turbine_blade');
          blade.parent = bladeArm;
        }

        rotators.push(rotorRoot);
        break;
      }

      case 'offshore_wind': {
        // Yellow marine transition base platform
        const platform = MeshBuilder.CreateCylinder('platform', {
          height: 0.5,
          diameter: 0.9,
          tessellation: 8,
        }, this.scene);
        platform.position.y = 0.25;
        platform.material = this.getMaterial('mat_offshore_yellow');
        platform.parent = root;

        // Tall tower
        const tower = MeshBuilder.CreateCylinder('tower', {
          height: 2.6,
          diameterTop: 0.14,
          diameterBottom: 0.28,
          tessellation: 12,
        }, this.scene);
        tower.position.y = 1.5;
        tower.material = this.getMaterial('mat_clean_white');
        tower.parent = root;

        // Rotor
        const rotorRoot = new Mesh('rotor_root', this.scene);
        rotorRoot.position = new Vector3(0, 2.7, 0.28);
        rotorRoot.parent = root;

        const hub = MeshBuilder.CreateSphere('hub', { diameter: 0.25 }, this.scene);
        hub.material = this.getMaterial('mat_offshore_yellow');
        hub.parent = rotorRoot;

        for (let i = 0; i < 3; i++) {
          const bladeArm = new TransformNode(`offshore_blade_arm_${i}`, this.scene);
          bladeArm.position = Vector3.Zero();
          bladeArm.rotation.z = (i * Math.PI * 2) / 3;
          bladeArm.parent = rotorRoot;

          const blade = MeshBuilder.CreateBox(`offshore_blade_${i}`, {
            width: 0.1,
            height: 1.35,
            depth: 0.03,
          }, this.scene);
          blade.position.y = 0.68;
          blade.material = this.getMaterial('mat_turbine_blade');
          blade.parent = bladeArm;
        }

        rotators.push(rotorRoot);
        break;
      }

      case 'solar_farm': {
        // Concrete foundation bases
        const base = MeshBuilder.CreateBox('solar_base', { width: 1.6, height: 0.06, depth: 1.6 }, this.scene);
        base.position.y = 0.03;
        base.material = this.getMaterial('mat_dam_concrete');
        base.parent = root;

        // 3 Tilted Solar Racks
        const rows = [-0.45, 0.05, 0.55];
        rows.forEach((zOffset, idx) => {
          const rack = MeshBuilder.CreateBox(`rack_${idx}`, {
            width: 1.45,
            height: 0.04,
            depth: 0.4,
          }, this.scene);
          rack.position = new Vector3(0, 0.32, zOffset);
          rack.rotation.x = -Math.PI / 6; // 30 deg tilt
          rack.material = this.getMaterial('mat_solar_blue');
          rack.parent = root;

          // Metal stanchion
          const leg = MeshBuilder.CreateCylinder(`leg_${idx}`, {
            height: 0.3,
            diameter: 0.04,
          }, this.scene);
          leg.position = new Vector3(0, 0.15, zOffset);
          leg.material = this.getMaterial('mat_gas_metal');
          leg.parent = root;
        });
        break;
      }

      case 'battery_bess': {
        // Storage Megapacks (2 rows of clean modular battery containers)
        const offsets = [-0.35, 0.35];
        offsets.forEach((xOff, idx) => {
          const pack = MeshBuilder.CreateBox(`megapack_${idx}`, {
            width: 0.55,
            height: 0.6,
            depth: 1.4,
          }, this.scene);
          pack.position = new Vector3(xOff, 0.3, 0);
          pack.material = this.getMaterial('mat_battery_body');
          pack.parent = root;

          // Green LED status stripe
          const led = MeshBuilder.CreateBox(`led_${idx}`, {
            width: 0.04,
            height: 0.06,
            depth: 1.25,
          }, this.scene);
          led.position = new Vector3(xOff + (idx === 0 ? 0.28 : -0.28), 0.35, 0);
          led.material = this.getMaterial('mat_battery_led');
          led.parent = root;
        });
        break;
      }

      case 'coal_plant': {
        // Heavy industrial main turbine/boiler hall
        const hall = MeshBuilder.CreateBox('coal_hall', {
          width: 0.9,
          height: 0.8,
          depth: 1.1,
        }, this.scene);
        hall.position = new Vector3(-0.25, 0.4, 0);
        hall.material = this.getMaterial('mat_rust_brick');
        hall.parent = root;

        // Two hyperbolic cooling towers
        const tower1 = MeshBuilder.CreateCylinder('cooling_tower_1', {
          height: 1.2,
          diameterTop: 0.45,
          diameterBottom: 0.7,
        }, this.scene);
        tower1.position = new Vector3(0.45, 0.6, -0.3);
        tower1.material = this.getMaterial('mat_dam_concrete');
        tower1.parent = root;

        const tower2 = MeshBuilder.CreateCylinder('cooling_tower_2', {
          height: 1.0,
          diameterTop: 0.4,
          diameterBottom: 0.62,
        }, this.scene);
        tower2.position = new Vector3(0.45, 0.5, 0.4);
        tower2.material = this.getMaterial('mat_dam_concrete');
        tower2.parent = root;

        // Tall smokestack
        const stack = MeshBuilder.CreateCylinder('stack', {
          height: 1.6,
          diameterTop: 0.12,
          diameterBottom: 0.16,
        }, this.scene);
        stack.position = new Vector3(-0.45, 0.8, -0.3);
        stack.material = this.getMaterial('mat_coal_dark');
        stack.parent = root;

        break;
      }

      case 'gas_peaker': {
        // Gas turbine building
        const turbine = MeshBuilder.CreateBox('gas_turbine', {
          width: 0.8,
          height: 0.55,
          depth: 1.2,
        }, this.scene);
        turbine.position = new Vector3(0, 0.28, 0);
        turbine.material = this.getMaterial('mat_gas_metal');
        turbine.parent = root;

        // 2 exhaust flues
        for (let i = 0; i < 2; i++) {
          const flue = MeshBuilder.CreateCylinder(`flue_${i}`, {
            height: 1.1,
            diameter: 0.16,
          }, this.scene);
          flue.position = new Vector3(0.2, 0.65, -0.3 + i * 0.6);
          flue.material = this.getMaterial('mat_dam_concrete');
          flue.parent = root;
        }
        break;
      }

      case 'hydro_dam': {
        // Concrete curved barrier
        const damWall = MeshBuilder.CreateBox('dam_wall', {
          width: 1.8,
          height: 0.9,
          depth: 0.6,
        }, this.scene);
        damWall.position = new Vector3(0, 0.45, 0);
        damWall.material = this.getMaterial('mat_dam_concrete');
        damWall.parent = root;

        // Water outlet spillway
        const spill = MeshBuilder.CreateBox('spillway', {
          width: 0.7,
          height: 0.15,
          depth: 1.2,
        }, this.scene);
        spill.position = new Vector3(0, 0.1, 0.3);
        spill.material = this.getMaterial('mat_water');
        spill.parent = root;
        break;
      }

      case 'geothermal': {
        // Industrial heat exchanger cylinders & insulated pipes
        const dome = MeshBuilder.CreateSphere('geo_dome', {
          diameter: 0.75,
          segments: 10,
        }, this.scene);
        dome.position = new Vector3(-0.25, 0.38, 0);
        dome.material = this.getMaterial('mat_gas_metal');
        dome.parent = root;

        const condenser = MeshBuilder.CreateCylinder('condenser', {
          height: 0.8,
          diameter: 0.55,
        }, this.scene);
        condenser.position = new Vector3(0.35, 0.4, 0.2);
        condenser.material = this.getMaterial('mat_dam_concrete');
        condenser.parent = root;
        break;
      }

      case 'city_center': {
        // Skyline with modern skyscrapers and office towers
        const towers = [
          { w: 0.45, h: 1.8, d: 0.45, x: -0.3, z: -0.3 },
          { w: 0.55, h: 2.3, d: 0.55, x: 0.25, z: 0.2 },
          { w: 0.4, h: 1.3, d: 0.4, x: -0.35, z: 0.35 },
          { w: 0.48, h: 1.6, d: 0.48, x: 0.3, z: -0.35 },
        ];

        towers.forEach((t, idx) => {
          const buildingMesh = MeshBuilder.CreateBox(`tower_${idx}`, {
            width: t.w,
            height: t.h,
            depth: t.d,
          }, this.scene);
          buildingMesh.position = new Vector3(t.x, t.h / 2, t.z);
          buildingMesh.material = this.getMaterial('mat_sky_building');
          buildingMesh.parent = root;

          // Glowing windows ribbon
          const windows = MeshBuilder.CreateBox(`win_${idx}`, {
            width: t.w * 1.02,
            height: 0.08,
            depth: t.d * 1.02,
          }, this.scene);
          windows.position = new Vector3(t.x, t.h * 0.7, t.z);
          windows.material = this.getMaterial('mat_window_glow');
          windows.parent = root;
        });
        break;
      }

      case 'substation': {
        // High voltage transmission pylons and transformer banks
        const pylon = MeshBuilder.CreateCylinder('pylon', {
          height: 1.4,
          diameterTop: 0.08,
          diameterBottom: 0.2,
          tessellation: 4,
        }, this.scene);
        pylon.position = new Vector3(0, 0.7, 0);
        pylon.material = this.getMaterial('mat_gas_metal');
        pylon.parent = root;

        const crossArm = MeshBuilder.CreateBox('crossarm', {
          width: 0.9,
          height: 0.06,
          depth: 0.06,
        }, this.scene);
        crossArm.position = new Vector3(0, 1.25, 0);
        crossArm.material = this.getMaterial('mat_gas_metal');
        crossArm.parent = root;

        // Transformers
        const trans = MeshBuilder.CreateBox('transformer', {
          width: 0.5,
          height: 0.35,
          depth: 0.6,
        }, this.scene);
        trans.position = new Vector3(0.35, 0.18, 0.3);
        trans.material = this.getMaterial('mat_clean_white');
        trans.parent = root;
        break;
      }

      case 'remediated_park': {
        // Lush green trees, walking loop, and pond
        const pond = MeshBuilder.CreateCylinder('pond', {
          height: 0.05,
          diameter: 0.9,
        }, this.scene);
        pond.position = new Vector3(0, 0.03, 0);
        pond.material = this.getMaterial('mat_water');
        pond.parent = root;

        // 3 Low-poly Pine/Deciduous trees
        const treeLocs = [
          { x: -0.45, z: -0.4 },
          { x: 0.45, z: -0.35 },
          { x: 0.2, z: 0.45 },
        ];

        treeLocs.forEach((loc, idx) => {
          const trunk = MeshBuilder.CreateCylinder(`trunk_${idx}`, {
            height: 0.3,
            diameter: 0.08,
          }, this.scene);
          trunk.position = new Vector3(loc.x, 0.15, loc.z);
          trunk.material = this.getMaterial('mat_tree_trunk');
          trunk.parent = root;

          const foliage = MeshBuilder.CreateCylinder(`foliage_${idx}`, {
            height: 0.55,
            diameterTop: 0.0,
            diameterBottom: 0.45,
          }, this.scene);
          foliage.position = new Vector3(loc.x, 0.45, loc.z);
          foliage.material = this.getMaterial('mat_park_green');
          foliage.parent = root;
        });
        break;
      }

      case 'empty':
      default:
        break;
    }

    return { root, rotators, particles };
  }

  /**
   * Selection highlight ring
   */
  public createSelectionRing(): Mesh {
    const ring = MeshBuilder.CreateTorus('selection_ring', {
      diameter: 2.2,
      thickness: 0.08,
      tessellation: 32,
    }, this.scene);
    
    const mat = new StandardMaterial('mat_selection_ring', this.scene);
    mat.diffuseColor = new Color3(0.2, 0.85, 1.0);
    mat.emissiveColor = new Color3(0.1, 0.7, 0.95);
    mat.specularColor = new Color3(1, 1, 1);
    ring.material = mat;
    ring.isVisible = false;
    ring.isPickable = false;
    return ring;
  }

  /**
   * Red Alert style square holographic grid footprint marker (Green = Valid, Red = Blocked)
   */
  public createPlacementFootprint(): Mesh {
    const footprint = MeshBuilder.CreateBox('placement_footprint', {
      width: 2.05,
      height: 0.08,
      depth: 2.05,
    }, this.scene);

    footprint.material = this.getMaterial('mat_ghost_valid');
    footprint.isVisible = false;
    footprint.isPickable = false;
    return footprint;
  }

  /**
   * Red Alert style 3D translucent ghost blueprint
   */
  public createGhostBuilding(buildingType: BuildingType, isValid: boolean = true): Mesh {
    const bldg = this.createBuilding(buildingType, new Vector3(0, 0, 0), 1);
    bldg.root.name = `ghost_root_${buildingType}`;
    const ghostMat = this.getMaterial(isValid ? 'mat_ghost_valid' : 'mat_ghost_invalid');

    bldg.root.isPickable = false;
    bldg.root.getChildMeshes().forEach((m) => {
      m.material = ghostMat;
      m.isPickable = false;
    });

    return bldg.root;
  }

  public setGhostMaterial(ghostRoot: Mesh, isValid: boolean) {
    const ghostMat = this.getMaterial(isValid ? 'mat_ghost_valid' : 'mat_ghost_invalid');
    ghostRoot.material = ghostMat;
    ghostRoot.isPickable = false;
    ghostRoot.getChildMeshes().forEach((m) => {
      m.material = ghostMat;
      m.isPickable = false;
    });
  }
}
