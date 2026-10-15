import {
  Engine,
  Scene,
  ArcRotateCamera,
  StereoscopicArcRotateCamera,
  WebXRDefaultExperience,
  WebXRState,
  Vector3,
  HemisphericLight,
  DirectionalLight,
  Color3,
  Color4,
  Mesh,
  MeshBuilder,
  AbstractMesh,
  PointerEventTypes,
  Nullable,
  Camera,
} from '@babylonjs/core';
import {
  AdvancedDynamicTexture,
  Rectangle,
  TextBlock,
  StackPanel,
  Button,
  Grid,
  Control,
} from '@babylonjs/gui';
import { MeshFactory, TileMeshBundle } from './MeshFactory';
import { GridTile, WeatherState, BuildingType, VRHudData } from '../types';
import { BUILDING_DEFS } from '../buildingDefs';

export class SceneController {
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;
  private stereoscopicCamera: StereoscopicArcRotateCamera | null = null;
  private xrHelper: WebXRDefaultExperience | null = null;
  private isVRActive: boolean = false;
  private isStereoscopicActive: boolean = false;
  private onVRStateChangeCallback?: (isVR: boolean, mode: 'webxr' | 'stereoscopic' | 'desktop') => void;

  // 3D VR Holographic HUD Fields
  private vrHudMesh: Mesh | null = null;
  private vrHudTexture: AdvancedDynamicTexture | null = null;
  private isVRHudMinimized: boolean = false;
  private latestVRHudData: VRHudData | null = null;
  private vrTxtScenario: TextBlock | null = null;
  private vrTxtTimeWeather: TextBlock | null = null;
  private vrTxtFunds: TextBlock | null = null;
  private vrTxtClean: TextBlock | null = null;
  private vrTxtPower: TextBlock | null = null;
  private vrTxtEmissions: TextBlock | null = null;
  private vrTxtStability: TextBlock | null = null;
  private vrTxtStorage: TextBlock | null = null;
  private vrTxtDirectivesCount: TextBlock | null = null;
  private vrTxtDirectiveTop: TextBlock | null = null;
  private vrDetailedSection: StackPanel | null = null;
  private vrContainerRect: Rectangle | null = null;
  private vrBtnMinMax: Button | null = null;

  private sunLight: DirectionalLight;
  private ambientLight: HemisphericLight;
  private meshFactory: MeshFactory;

  private tileMeshes: Map<string, TileMeshBundle> = new Map();
  private selectionRing: Mesh;
  private hoverRing: Mesh;
  private placementFootprint: Mesh;
  private ghostMesh: Mesh | null = null;
  private activeBuildType: BuildingType | null = null;
  private validityChecker?: (x: number, z: number, bldg: BuildingType) => { valid: boolean; reason?: string };

  private selectedCoords: { x: number; z: number } | null = null;
  private windTurbineRotators: Mesh[] = [];
  private currentWindSpeed: number = 8.5;

  private onTileSelectedCallback?: (tileX: number, tileZ: number) => void;
  private onDeployBuildingCallback?: (tileX: number, tileZ: number) => void;
  private onCancelPlacementCallback?: () => void;

  // VR 3D World-Space Tile Inspector & Palette
  private cachedTiles: GridTile[] = [];
  private vrTileInspectorMesh: Mesh | null = null;
  private vrTileInspectorTexture: AdvancedDynamicTexture | null = null;
  private vrPaletteButtons: Map<string, Button> = new Map();
  private onUpgradeTileCallback?: (tile: GridTile) => void;
  private onDecommissionTileCallback?: (tile: GridTile) => void;
  private onDemolishTileCallback?: (tile: GridTile) => void;
  private onQuickBuildCallback?: (tile: GridTile, bldg: BuildingType) => void;
  private onSelectBuildTypeCallback?: (bldg: BuildingType | null) => void;
  private onSetToolModeCallback?: (mode: 'select' | 'build' | 'sell' | 'repair') => void;

  constructor(
    canvas: HTMLCanvasElement,
    onTileSelected?: (tileX: number, tileZ: number) => void,
    onDeployBuilding?: (tileX: number, tileZ: number) => void,
    onCancelPlacement?: () => void
  ) {
    this.canvas = canvas;
    this.onTileSelectedCallback = onTileSelected;
    this.onDeployBuildingCallback = onDeployBuilding;
    this.onCancelPlacementCallback = onCancelPlacement;

    // 1. Initialize Babylon Engine
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: true,
    });

    // 2. Initialize Scene
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.08, 0.12, 0.18, 1.0);

    // 3. Setup Fog for atmospheric clean/smog transition
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogDensity = 0.008;
    this.scene.fogColor = new Color3(0.15, 0.18, 0.22);

    // 4. Setup Camera
    this.camera = new ArcRotateCamera(
      'main_camera',
      -Math.PI / 3,
      Math.PI / 3.2,
      28,
      new Vector3(7.5, 0, 7.5),
      this.scene
    );
    this.camera.attachControl(this.canvas, true);
    this.camera.lowerRadiusLimit = 8;
    this.camera.upperRadiusLimit = 42;
    this.camera.lowerBetaLimit = 0.2;
    this.camera.upperBetaLimit = Math.PI / 2.15;
    this.camera.wheelPrecision = 20;

    // 5. Setup Lights
    this.ambientLight = new HemisphericLight('ambient_light', new Vector3(0, 1, 0), this.scene);
    this.ambientLight.intensity = 0.55;
    this.ambientLight.groundColor = new Color3(0.12, 0.15, 0.18);

    this.sunLight = new DirectionalLight('sun_light', new Vector3(-1, -2, -1), this.scene);
    this.sunLight.intensity = 1.1;
    this.sunLight.diffuse = new Color3(1.0, 0.96, 0.88);

    // 6. Mesh Factory & Selection/Footprint Markers
    this.meshFactory = new MeshFactory(this.scene);
    this.selectionRing = this.meshFactory.createSelectionRing();
    this.selectionRing.name = 'selection_ring';

    this.hoverRing = this.meshFactory.createSelectionRing();
    this.hoverRing.name = 'hover_ring';
    if (this.hoverRing.material) {
      (this.hoverRing.material as any).diffuseColor = new Color3(0.8, 0.9, 0.3);
      (this.hoverRing.material as any).emissiveColor = new Color3(0.4, 0.5, 0.1);
    }

    // Red Alert Footprint
    this.placementFootprint = this.meshFactory.createPlacementFootprint();

    // 7. Setup Pointer Interaction
    this.setupPointerEvents();

    // 8. Start Render Loop
    this.engine.runRenderLoop(() => {
      this.updateAnimations();
      this.scene.render();
    });

    // Handle Window Resize
    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = () => {
    this.engine.resize();
  };

  public setPlacementMode(
    buildingType: BuildingType | null,
    validator?: (x: number, z: number, bldg: BuildingType) => { valid: boolean; reason?: string }
  ) {
    this.activeBuildType = buildingType;
    this.validityChecker = validator;

    // Dispose old ghost
    if (this.ghostMesh) {
      this.ghostMesh.dispose(false, true);
      this.ghostMesh = null;
    }

    if (!buildingType || buildingType === 'empty') {
      this.placementFootprint.isVisible = false;
      this.updateVRPaletteActive(null);
      return;
    }

    // Create new ghost structure
    this.ghostMesh = this.meshFactory.createGhostBuilding(buildingType, true);
    this.ghostMesh.isVisible = false;
    this.placementFootprint.isVisible = false;
    this.updateVRPaletteActive(buildingType);
  }

  public updateCallbacks(
    onTileSelected?: (tileX: number, tileZ: number) => void,
    onDeployBuilding?: (tileX: number, tileZ: number) => void,
    onCancelPlacement?: () => void
  ) {
    this.onTileSelectedCallback = onTileSelected;
    this.onDeployBuildingCallback = onDeployBuilding;
    this.onCancelPlacementCallback = onCancelPlacement;
  }

  public setInteractiveCallbacks(callbacks: {
    onUpgrade?: (tile: GridTile) => void;
    onDecommission?: (tile: GridTile) => void;
    onDemolish?: (tile: GridTile) => void;
    onQuickBuild?: (tile: GridTile, bldg: BuildingType) => void;
    onSelectBuildType?: (bldg: BuildingType | null) => void;
    onSetToolMode?: (mode: 'select' | 'build' | 'sell' | 'repair') => void;
  }) {
    this.onUpgradeTileCallback = callbacks.onUpgrade;
    this.onDecommissionTileCallback = callbacks.onDecommission;
    this.onDemolishTileCallback = callbacks.onDemolish;
    this.onQuickBuildCallback = callbacks.onQuickBuild;
    this.onSelectBuildTypeCallback = callbacks.onSelectBuildType;
    this.onSetToolModeCallback = callbacks.onSetToolMode;
  }

  /**
   * Tags a building root and all its child sub-meshes recursively with tile coordinates for precise cursor detection
   */
  public tagHierarchyWithTile(rootNode: any, tileX: number, tileZ: number, buildingType: string) {
    const tagNode = (node: any) => {
      if (!node) return;
      node.metadata = { ...(node.metadata || {}), tileX, tileZ, buildingType, isBuilding: true };
      if (node.name && !node.name.includes(`${tileX}_${tileZ}`)) {
        node.name = `bldg_${tileX}_${tileZ}_${node.name}`;
      }
      if (node instanceof AbstractMesh) {
        node.isPickable = true;
      }
      const children = node.getChildren ? node.getChildren() : [];
      children.forEach(tagNode);
    };
    tagNode(rootNode);
  }

  private setupPointerEvents() {
    this.scene.onPointerObservable.add((pointerInfo) => {
      // Right Click (Button 2) -> Cancel Placement Mode (Red Alert style)
      if (pointerInfo.type === PointerEventTypes.POINTERDOWN && pointerInfo.event.button === 2) {
        if (this.activeBuildType) {
          if (this.onCancelPlacementCallback) {
            this.onCancelPlacementCallback();
          }
        } else {
          this.clearSelection();
        }
        return;
      }

      // Predicate: Exclude ghosts, HUD slates, and helper rings from tile picking
      const pickPredicate = (mesh: AbstractMesh) => {
        if (!mesh.isPickable) return false;
        if (mesh.name.startsWith('ghost_')) return false;
        if (
          mesh.name === 'placement_footprint' ||
          mesh.name === 'selection_ring' ||
          mesh.name === 'hover_ring' ||
          mesh.name === 'vr_hud_mesh' ||
          mesh.name.startsWith('vr_hud_') ||
          mesh.name === 'vr_tile_inspector' ||
          mesh.name.startsWith('vr_insp_')
        ) {
          return false;
        }
        return true;
      };

      if (pointerInfo.type === PointerEventTypes.POINTERDOWN || pointerInfo.type === PointerEventTypes.POINTERTAP) {
        // Left click (0), touch (undefined/0), or VR controller trigger
        const isTriggerOrLeft = pointerInfo.event.button === 0 || pointerInfo.event.button === undefined || this.isVRActive;
        if (isTriggerOrLeft) {
          let pickResult = pointerInfo.pickInfo;
          if (!pickResult || !pickResult.hit || !pickResult.pickedMesh || !pickPredicate(pickResult.pickedMesh)) {
            pickResult = this.scene.pick(
              this.scene.pointerX,
              this.scene.pointerY,
              pickPredicate
            );
          }

          if (pickResult && pickResult.hit && pickResult.pickedMesh) {
            const mesh = pickResult.pickedMesh;
            const tileData = this.findTileDataFromMesh(mesh, pickResult.pickedPoint);
            if (tileData) {
              if (this.activeBuildType) {
                // In Red Alert build mode
                if (this.onDeployBuildingCallback) {
                  this.onDeployBuildingCallback(tileData.x, tileData.z);
                }
              } else {
                this.setSelectedTile(tileData.x, tileData.z);
                if (this.onTileSelectedCallback) {
                  this.onTileSelectedCallback(tileData.x, tileData.z);
                }
              }
            }
          }
        }
      } else if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {
        let pickResult = pointerInfo.pickInfo;
        if (!pickResult || !pickResult.hit || !pickResult.pickedMesh || !pickPredicate(pickResult.pickedMesh)) {
          pickResult = this.scene.pick(
            this.scene.pointerX,
            this.scene.pointerY,
            pickPredicate
          );
        }

        if (pickResult && pickResult.hit && pickResult.pickedMesh) {
          const tileData = this.findTileDataFromMesh(pickResult.pickedMesh, pickResult.pickedPoint);
          if (tileData) {
            // Update canvas cursor for clear interactive feedback
            this.canvas.style.cursor = this.activeBuildType ? 'crosshair' : 'pointer';

            const spacing = 2.15;
            const key = `${tileData.x}_${tileData.z}`;
            const bundle = this.tileMeshes.get(key);
            const surfaceY = bundle ? bundle.surfaceY : 0.35;

            if (this.activeBuildType && this.ghostMesh) {
              // Red Alert Ghost Footprint & Model
              this.hoverRing.isVisible = false;

              this.placementFootprint.position = new Vector3(tileData.x * spacing, surfaceY + 0.04, tileData.z * spacing);
              this.placementFootprint.isVisible = true;

              this.ghostMesh.position = new Vector3(tileData.x * spacing, surfaceY, tileData.z * spacing);
              this.ghostMesh.isVisible = true;

              // Check validity
              let isValid = true;
              if (this.validityChecker) {
                const res = this.validityChecker(tileData.x, tileData.z, this.activeBuildType);
                isValid = res.valid;
              }

              const matName = isValid ? 'mat_ghost_valid' : 'mat_ghost_invalid';
              const ghostMat = this.meshFactory.getMaterial(matName);
              this.placementFootprint.material = ghostMat;

              this.meshFactory.setGhostMaterial(this.ghostMesh, isValid);
            } else {
              this.setHoverTile(tileData.x, tileData.z);
            }
          } else {
            this.canvas.style.cursor = this.activeBuildType ? 'crosshair' : 'default';
            this.hoverRing.isVisible = false;
            this.placementFootprint.isVisible = false;
            if (this.ghostMesh) this.ghostMesh.isVisible = false;
          }
        } else {
          this.canvas.style.cursor = this.activeBuildType ? 'crosshair' : 'default';
          this.hoverRing.isVisible = false;
          this.placementFootprint.isVisible = false;
          if (this.ghostMesh) this.ghostMesh.isVisible = false;
        }
      }
    });
  }

  private findTileDataFromMesh(
    mesh: Nullable<AbstractMesh>,
    pickedPoint?: Nullable<Vector3>
  ): { x: number; z: number } | null {
    if (mesh) {
      let curr: any = mesh;
      while (curr) {
        if (curr.metadata && curr.metadata.tileX !== undefined && curr.metadata.tileZ !== undefined) {
          return { x: curr.metadata.tileX, z: curr.metadata.tileZ };
        }
        if (curr.name) {
          const match = curr.name.match(/(?:tile|bldg|vr_badge)_([0-9]+)_([0-9]+)/);
          if (match) {
            return { x: parseInt(match[1], 10), z: parseInt(match[2], 10) };
          }
        }
        curr = curr.parent;
      }

      // Check registered tile bundles for direct or descendant membership
      for (const [key, bundle] of this.tileMeshes.entries()) {
        if (
          bundle.rootMesh === mesh ||
          bundle.buildingRoot === mesh ||
          bundle.overheadBadge === mesh
        ) {
          const [kx, kz] = key.split('_').map((n) => parseInt(n, 10));
          return { x: kx, z: kz };
        }
        if (bundle.buildingRoot) {
          const children = bundle.buildingRoot.getChildMeshes(false);
          if (children.includes(mesh as Mesh)) {
            const [kx, kz] = key.split('_').map((n) => parseInt(n, 10));
            return { x: kx, z: kz };
          }
        }
      }
    }

    // Direct raycast hit coordinate fallback
    if (pickedPoint) {
      const spacing = 2.15;
      const gx = Math.round(pickedPoint.x / spacing);
      const gz = Math.round(pickedPoint.z / spacing);
      const key = `${gx}_${gz}`;
      if (this.tileMeshes.has(key)) {
        return { x: gx, z: gz };
      }
    }

    return null;
  }


  public setSelectedTile(x: number, z: number) {
    this.selectedCoords = { x, z };
    const spacing = 2.15;
    const key = `${x}_${z}`;
    const bundle = this.tileMeshes.get(key);
    const surfaceY = bundle ? bundle.surfaceY : 0.35;
    this.selectionRing.position = new Vector3(x * spacing, surfaceY + 0.06, z * spacing);
    this.selectionRing.isVisible = true;

    // Show 3D World-Space Tile Inspector in VR
    if (this.isVRActive || this.isStereoscopicActive) {
      this.showVRTileInspector(x, z);
    }
  }

  public clearSelection() {
    this.selectedCoords = null;
    this.selectionRing.isVisible = false;
    if (this.vrTileInspectorMesh) {
      this.vrTileInspectorMesh.setEnabled(false);
    }
  }

  private setHoverTile(x: number, z: number) {
    if (this.selectedCoords && this.selectedCoords.x === x && this.selectedCoords.z === z) {
      this.hoverRing.isVisible = false;
      return;
    }
    const spacing = 2.15;
    const key = `${x}_${z}`;
    const bundle = this.tileMeshes.get(key);
    const surfaceY = bundle ? bundle.surfaceY : 0.35;
    this.hoverRing.position = new Vector3(x * spacing, surfaceY + 0.05, z * spacing);
    this.hoverRing.isVisible = true;
  }

  /**
   * Initializes or refreshes the full map tiles
   */
  public syncGrid(tiles: GridTile[]) {
    this.cachedTiles = tiles;
    const activeKeys = new Set<string>();
    this.windTurbineRotators = [];

    tiles.forEach((tile) => {
      const key = `${tile.x}_${tile.z}`;
      activeKeys.add(key);

      const existing = this.tileMeshes.get(key);
      const spacing = 2.15;

      // If existing exists but terrain type changed, cleanly dispose the old mesh
      if (existing && existing.terrain !== tile.terrain) {
        if (existing.overheadBadge) existing.overheadBadge.dispose(false, true);
        if (existing.buildingRoot) existing.buildingRoot.dispose(false, true);
        existing.rootMesh.dispose();
        this.tileMeshes.delete(key);
      }

      const current = this.tileMeshes.get(key);

      if (!current) {
        // Create base terrain mesh
        const baseMesh = this.meshFactory.createTileBase(tile.x, tile.z, tile.terrain);
        const surfaceY = (baseMesh.metadata as any)?.surfaceY || 0.35;
        const spacing = 2.15;
        let buildingRoot: Mesh | undefined;
        let rotators: Mesh[] = [];

        if (tile.building !== 'empty') {
          const surfacePos = new Vector3(tile.x * spacing, surfaceY, tile.z * spacing);
          const bldg = this.meshFactory.createBuilding(tile.building, surfacePos, tile.level);
          bldg.root.metadata = { ...(bldg.root.metadata || {}), level: tile.level };
          this.tagHierarchyWithTile(bldg.root, tile.x, tile.z, tile.building);
          buildingRoot = bldg.root;
          if (bldg.rotators) {
            rotators = bldg.rotators;
            this.windTurbineRotators.push(...bldg.rotators);
          }
        }

        this.tileMeshes.set(key, {
          rootMesh: baseMesh,
          terrain: tile.terrain,
          surfaceY,
          buildingRoot,
          rotatorMeshes: rotators,
          tileData: tile,
        });
      } else {
        current.tileData = tile;
        current.surfaceY = (current.rootMesh.metadata as any)?.surfaceY || 0.35;

        // Check if building type or level changed
        const currentBldgName = current.buildingRoot ? current.buildingRoot.name : '';
        const currentLevel = (current.buildingRoot?.metadata as any)?.level || 1;
        const expectedBuilding = tile.building;

        if (tile.building === 'empty') {
          if (current.buildingRoot) {
            current.buildingRoot.dispose(false, true);
            current.buildingRoot = undefined;
            current.rotatorMeshes = [];
          }
        } else if (!currentBldgName.includes(expectedBuilding) || currentLevel !== tile.level) {
          // Dispose previous building
          if (current.buildingRoot) {
            current.buildingRoot.dispose(false, true);
            current.buildingRoot = undefined;
            current.rotatorMeshes = [];
          }

          // Create new building positioned on surface
          const spacing = 2.15;
          const surfacePos = new Vector3(tile.x * spacing, current.surfaceY, tile.z * spacing);
          const bldg = this.meshFactory.createBuilding(tile.building, surfacePos, tile.level);
          bldg.root.metadata = { ...(bldg.root.metadata || {}), level: tile.level };
          this.tagHierarchyWithTile(bldg.root, tile.x, tile.z, tile.building);
          current.buildingRoot = bldg.root;
          if (bldg.rotators) {
            current.rotatorMeshes = bldg.rotators;
            this.windTurbineRotators.push(...bldg.rotators);
          }
        } else if (current.rotatorMeshes) {
          this.windTurbineRotators.push(...current.rotatorMeshes);
        }
      }
    });

    // Cleanup deleted tiles
    this.tileMeshes.forEach((bundle, key) => {
      if (!activeKeys.has(key)) {
        if (bundle.overheadBadge) bundle.overheadBadge.dispose(false, true);
        if (bundle.buildingRoot) bundle.buildingRoot.dispose(false, true);
        bundle.rootMesh.dispose();
        this.tileMeshes.delete(key);
      }
    });

    // Update 3D Holographic Overhead Badges for all Interactibles
    this.updateOverheadBadges(tiles);

    // Refresh 3D VR Tile Inspector if open
    if (this.selectedCoords && (this.isVRActive || this.isStereoscopicActive)) {
      this.showVRTileInspector(this.selectedCoords.x, this.selectedCoords.z);
    }

    // Center camera on grid if needed
    if (tiles.length > 0) {
      const maxX = Math.max(...tiles.map((t) => t.x));
      const maxZ = Math.max(...tiles.map((t) => t.z));
      const spacing = 2.15;
      this.camera.setTarget(new Vector3((maxX * spacing) / 2, 0.4, (maxZ * spacing) / 2));
    }
  }

  /**
   * Updates lighting, atmospheric smog vs clean skies, and wind speed
   */
  public updateAtmosphere(weather: WeatherState, cleanPct: number) {
    this.currentWindSpeed = weather.windSpeedMs;

    // 1. Sun light position based on time of day (6:00 to 18:00)
    const hour = weather.timeOfDay;
    const isDay = hour >= 5.5 && hour <= 18.5;

    if (isDay) {
      const dayProgress = (hour - 6) / 12; // 0 at dawn, 0.5 at noon, 1 at dusk
      const sunAngle = dayProgress * Math.PI;
      const sunX = -Math.cos(sunAngle) * 2;
      const sunY = -Math.sin(sunAngle) * 2.5;
      const sunZ = -0.8;
      this.sunLight.direction = new Vector3(sunX, sunY, sunZ);

      // Color temperature: warmer at dawn/dusk, crisp white at noon
      if (hour < 7.5 || hour > 16.5) {
        this.sunLight.diffuse = new Color3(1.0, 0.78, 0.5); // Golden hour
        this.sunLight.intensity = 0.9;
      } else {
        this.sunLight.diffuse = new Color3(1.0, 0.98, 0.92);
        this.sunLight.intensity = 1.25;
      }
      this.ambientLight.intensity = 0.55;
    } else {
      // Night: gentle moonlight
      this.sunLight.direction = new Vector3(0.5, -2, 0.5);
      this.sunLight.diffuse = new Color3(0.3, 0.45, 0.7);
      this.sunLight.intensity = 0.35;
      this.ambientLight.intensity = 0.3;
    }

    // 2. Dynamic Sky Color and Fog based on Clean Energy Transition Percentage
    // Low clean % (dirty coal/gas) = dirty yellow-brown smog
    // High clean % (90-100%) = pure crystal blue sky and lush horizon
    const cleanFrac = cleanPct / 100;
    
    let targetSkyR = 0.1 + (1 - cleanFrac) * 0.18;
    let targetSkyG = 0.16 + cleanFrac * 0.35;
    let targetSkyB = 0.22 + cleanFrac * 0.55;

    if (!isDay) {
      targetSkyR *= 0.25;
      targetSkyG *= 0.25;
      targetSkyB *= 0.35;
    }

    this.scene.clearColor = new Color4(targetSkyR, targetSkyG, targetSkyB, 1.0);
    this.scene.fogColor = new Color3(targetSkyR * 1.1, targetSkyG * 1.1, targetSkyB * 1.1);

    // Fog density: higher during smoggy fossil era
    const smogFactor = Math.max(0, 1 - cleanFrac);
    this.scene.fogDensity = 0.005 + smogFactor * 0.015;
  }

  private updateAnimations() {
    // Rotate wind turbines proportional to current wind speed
    const rotationStep = (this.currentWindSpeed / 10) * 0.08;
    this.windTurbineRotators.forEach((rotator) => {
      rotator.rotation.z += rotationStep;
    });

    // Subtle pulse for selection ring
    if (this.selectionRing.isVisible) {
      const t = Date.now() * 0.003;
      const s = 1.0 + Math.sin(t) * 0.04;
      this.selectionRing.scaling = new Vector3(s, s, s);
    }
  }

  public resetCameraView() {
    if (this.isStereoscopicActive && this.stereoscopicCamera) {
      this.stereoscopicCamera.alpha = -Math.PI / 3;
      this.stereoscopicCamera.beta = Math.PI / 3.2;
      this.stereoscopicCamera.radius = 28;
    } else {
      this.camera.alpha = -Math.PI / 3;
      this.camera.beta = Math.PI / 3.2;
      this.camera.radius = 28;
    }
  }

  /**
   * Initialize 3D VR Holographic HUD slate
   */
  private initVRHUD() {
    if (this.vrHudMesh) return;

    // 1. Create 3D Holographic Plane Mesh
    this.vrHudMesh = MeshBuilder.CreatePlane(
      'vr_hud_mesh',
      { width: 3.3, height: 1.72 },
      this.scene
    );
    this.vrHudMesh.isPickable = true;
    this.vrHudMesh.setEnabled(false); // Initially hidden until VR is active

    // 2. Create AdvancedDynamicTexture for interactive VR UI
    this.vrHudTexture = AdvancedDynamicTexture.CreateForMesh(
      this.vrHudMesh,
      1280,
      680,
      false
    );

    // 3. Root Frosted Glass Container
    const container = new Rectangle('vr_root_container');
    container.width = '1240px';
    container.height = '660px';
    container.cornerRadius = 24;
    container.color = '#10b981';
    container.thickness = 2;
    container.background = 'rgba(7, 12, 24, 0.92)';
    this.vrHudTexture.addControl(container);
    this.vrContainerRect = container;

    const mainStack = new StackPanel('vr_main_stack');
    mainStack.isVertical = true;
    mainStack.paddingTop = '14px';
    mainStack.paddingBottom = '14px';
    mainStack.paddingLeft = '20px';
    mainStack.paddingRight = '20px';
    container.addControl(mainStack);

    // 4. Header Bar: Title, Scenario, Time/Weather, Action Buttons
    const headerGrid = new Grid('vr_header_grid');
    headerGrid.height = '64px';
    headerGrid.addColumnDefinition(0.46); // Left: Title & Scenario
    headerGrid.addColumnDefinition(0.26); // Center: Weather & Time
    headerGrid.addColumnDefinition(0.28); // Right: Controls (Center, Dock, Exit)
    mainStack.addControl(headerGrid);

    // Header Left: Title & Scenario Name
    const titleStack = new StackPanel('vr_title_stack');
    titleStack.isVertical = false;
    titleStack.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

    const titleText = new TextBlock('vr_app_title', '⚡ EcoGrid VR');
    titleText.fontSize = 24;
    titleText.fontWeight = 'bold';
    titleText.color = '#34d399';
    titleText.width = '175px';
    titleText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    titleStack.addControl(titleText);

    this.vrTxtScenario = new TextBlock('vr_scenario_title', 'Regional Power Grid');
    this.vrTxtScenario.fontSize = 17;
    this.vrTxtScenario.color = '#94a3b8';
    this.vrTxtScenario.width = '380px';
    this.vrTxtScenario.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    titleStack.addControl(this.vrTxtScenario);
    headerGrid.addControl(titleStack, 0, 0);

    // Header Center: Time & Weather
    this.vrTxtTimeWeather = new TextBlock('vr_weather_text', '12:00 · 8.5 m/s · 100% Sun');
    this.vrTxtTimeWeather.fontSize = 17;
    this.vrTxtTimeWeather.color = '#cbd5e1';
    this.vrTxtTimeWeather.fontFamily = 'monospace';
    this.vrTxtTimeWeather.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    headerGrid.addControl(this.vrTxtTimeWeather, 0, 1);

    // Header Right: Interactive VR Buttons
    const btnStack = new StackPanel('vr_btn_stack');
    btnStack.isVertical = false;
    btnStack.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;

    // Reset/Center View button
    const btnCenter = Button.CreateSimpleButton('vr_btn_center', 'Center');
    btnCenter.width = '92px';
    btnCenter.height = '40px';
    btnCenter.color = '#38bdf8';
    btnCenter.fontSize = 15;
    btnCenter.cornerRadius = 8;
    btnCenter.thickness = 1;
    btnCenter.background = 'rgba(15, 23, 42, 0.9)';
    btnCenter.onPointerUpObservable.add(() => {
      this.resetCameraView();
    });
    btnStack.addControl(btnCenter);

    // Minimize / Expand Dock button
    this.vrBtnMinMax = Button.CreateSimpleButton('vr_btn_min', 'Dock');
    this.vrBtnMinMax.width = '82px';
    this.vrBtnMinMax.height = '40px';
    this.vrBtnMinMax.color = '#a78bfa';
    this.vrBtnMinMax.fontSize = 15;
    this.vrBtnMinMax.cornerRadius = 8;
    this.vrBtnMinMax.thickness = 1;
    this.vrBtnMinMax.background = 'rgba(15, 23, 42, 0.9)';
    this.vrBtnMinMax.onPointerUpObservable.add(() => {
      this.toggleVRHudMinimized();
    });
    btnStack.addControl(this.vrBtnMinMax);

    // Exit VR button
    const btnExit = Button.CreateSimpleButton('vr_btn_exit', 'Exit VR');
    btnExit.width = '96px';
    btnExit.height = '40px';
    btnExit.color = '#f87171';
    btnExit.fontSize = 15;
    btnExit.cornerRadius = 8;
    btnExit.thickness = 1;
    btnExit.background = 'rgba(69, 10, 10, 0.88)';
    btnExit.onPointerUpObservable.add(() => {
      this.toggleVR();
    });
    btnStack.addControl(btnExit);

    headerGrid.addControl(btnStack, 0, 2);

    // Detailed Section (collapsible when docked)
    this.vrDetailedSection = new StackPanel('vr_detailed_section');
    this.vrDetailedSection.isVertical = true;
    this.vrDetailedSection.paddingTop = '10px';
    mainStack.addControl(this.vrDetailedSection);

    // 5. Six Telemetry Metric Cards
    const metricsGrid = new Grid('vr_metrics_grid');
    metricsGrid.height = '185px';
    metricsGrid.addColumnDefinition(1 / 6);
    metricsGrid.addColumnDefinition(1 / 6);
    metricsGrid.addColumnDefinition(1 / 6);
    metricsGrid.addColumnDefinition(1 / 6);
    metricsGrid.addColumnDefinition(1 / 6);
    metricsGrid.addColumnDefinition(1 / 6);
    this.vrDetailedSection.addControl(metricsGrid);

    const createMetricCard = (
      name: string,
      label: string,
      initialVal: string,
      color: string,
      col: number
    ) => {
      const card = new Rectangle(`vr_card_${name}`);
      card.width = '188px';
      card.height = '172px';
      card.cornerRadius = 14;
      card.color = 'rgba(51, 65, 85, 0.6)';
      card.thickness = 1;
      card.background = 'rgba(15, 23, 42, 0.82)';

      const stack = new StackPanel();
      stack.isVertical = true;
      stack.paddingTop = '14px';
      stack.paddingLeft = '8px';
      stack.paddingRight = '8px';
      card.addControl(stack);

      const lbl = new TextBlock(`lbl_${name}`, label);
      lbl.fontSize = 14;
      lbl.color = '#94a3b8';
      lbl.height = '24px';
      lbl.fontWeight = 'bold';
      stack.addControl(lbl);

      const val = new TextBlock(`val_${name}`, initialVal);
      val.fontSize = 22;
      val.fontWeight = 'bold';
      val.color = color;
      val.height = '50px';
      val.fontFamily = 'monospace';
      stack.addControl(val);

      const sub = new TextBlock(`sub_${name}`, '');
      sub.fontSize = 12;
      sub.color = '#64748b';
      sub.height = '24px';
      stack.addControl(sub);

      metricsGrid.addControl(card, 0, col);
      return { val, sub };
    };

    const fundsCard = createMetricCard('funds', 'TREASURY', '₱260,000', '#fbbf24', 0);
    this.vrTxtFunds = fundsCard.val;

    const cleanCard = createMetricCard('clean', 'CLEAN SHARE', '85%', '#34d399', 1);
    this.vrTxtClean = cleanCard.val;

    const powerCard = createMetricCard('power', 'GRID LOAD', '450/500 MW', '#38bdf8', 2);
    this.vrTxtPower = powerCard.val;

    const emCard = createMetricCard('emissions', 'CO₂ EMISSIONS', '0 t/day', '#cbd5e1', 3);
    this.vrTxtEmissions = emCard.val;

    const stabCard = createMetricCard('stability', 'STABILITY', '99.4%', '#4ade80', 4);
    this.vrTxtStability = stabCard.val;

    const storCard = createMetricCard('storage', 'BESS STORAGE', '380 MWh', '#f472b6', 5);
    this.vrTxtStorage = storCard.val;

    // 6. Scenario Mission Directives Board
    const directiveCard = new Rectangle('vr_directives_card');
    directiveCard.width = '1200px';
    directiveCard.height = '140px';
    directiveCard.cornerRadius = 14;
    directiveCard.color = 'rgba(16, 185, 129, 0.5)';
    directiveCard.thickness = 1;
    directiveCard.background = 'rgba(6, 78, 59, 0.25)';
    directiveCard.paddingTop = '10px';
    this.vrDetailedSection.addControl(directiveCard);

    const dirStack = new StackPanel('vr_dirstack');
    dirStack.isVertical = true;
    dirStack.paddingLeft = '24px';
    dirStack.paddingRight = '24px';
    dirStack.paddingTop = '10px';
    directiveCard.addControl(dirStack);

    const dirHeader = new Grid();
    dirHeader.height = '30px';
    dirHeader.addColumnDefinition(0.7);
    dirHeader.addColumnDefinition(0.3);
    dirStack.addControl(dirHeader);

    const dirTitle = new TextBlock('vr_dirtitle', '🎯 ACTIVE SCENARIO DIRECTIVES');
    dirTitle.fontSize = 16;
    dirTitle.fontWeight = 'bold';
    dirTitle.color = '#6ee7b7';
    dirTitle.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    dirHeader.addControl(dirTitle, 0, 0);

    this.vrTxtDirectivesCount = new TextBlock('vr_dircount', '0 of 5 Completed');
    this.vrTxtDirectivesCount.fontSize = 15;
    this.vrTxtDirectivesCount.color = '#34d399';
    this.vrTxtDirectivesCount.fontFamily = 'monospace';
    this.vrTxtDirectivesCount.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    dirHeader.addControl(this.vrTxtDirectivesCount, 0, 1);

    this.vrTxtDirectiveTop = new TextBlock(
      'vr_dirtop',
      '▸ Primary Directive: Decommission 3 Coal Plants (Progress: 0 / 3)'
    );
    this.vrTxtDirectiveTop.fontSize = 18;
    this.vrTxtDirectiveTop.fontWeight = 'bold';
    this.vrTxtDirectiveTop.color = '#f1f5f9';
    this.vrTxtDirectiveTop.height = '40px';
    this.vrTxtDirectiveTop.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    dirStack.addControl(this.vrTxtDirectiveTop);

    const vrHelp = new TextBlock(
      'vr_help',
      'VR Controls: Aim controller ray at grid tiles to inspect & build · Laser click HUD buttons to interact'
    );
    vrHelp.fontSize = 14;
    vrHelp.color = '#94a3b8';
    vrHelp.height = '24px';
    vrHelp.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    dirStack.addControl(vrHelp);

    // 7. Interactive VR Quick-Build & Tool Palette Row
    const paletteCard = new Rectangle('vr_palette_card');
    paletteCard.width = '1200px';
    paletteCard.height = '62px';
    paletteCard.cornerRadius = 14;
    paletteCard.color = 'rgba(56, 189, 248, 0.5)';
    paletteCard.thickness = 1;
    paletteCard.background = 'rgba(15, 23, 42, 0.88)';
    paletteCard.paddingTop = '6px';
    this.vrDetailedSection.addControl(paletteCard);

    const paletteRow = new StackPanel('vr_palette_row');
    paletteRow.isVertical = false;
    paletteRow.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    paletteCard.addControl(paletteRow);

    const addPaletteBtn = (bldg: BuildingType | 'sell' | 'repair', label: string, color: string) => {
      const btn = Button.CreateSimpleButton(`vr_pal_${bldg}`, label);
      btn.width = '135px';
      btn.height = '44px';
      btn.fontSize = 15;
      btn.fontWeight = 'bold';
      btn.cornerRadius = 8;
      btn.thickness = 1;
      btn.color = color;
      btn.background = 'rgba(15, 23, 42, 0.85)';
      btn.paddingLeft = '4px';
      btn.paddingRight = '4px';

      btn.onPointerUpObservable.add(() => {
        if (bldg === 'sell' || bldg === 'repair') {
          if (this.onSetToolModeCallback) this.onSetToolModeCallback(bldg);
        } else {
          if (this.onSelectBuildTypeCallback) this.onSelectBuildTypeCallback(bldg);
          if (this.onSetToolModeCallback) this.onSetToolModeCallback('build');
        }
      });

      this.vrPaletteButtons.set(bldg, btn);
      paletteRow.addControl(btn);
    };

    addPaletteBtn('solar_farm', '☀️ Solar', '#facc15');
    addPaletteBtn('wind_turbine', '🍃 Wind', '#34d399');
    addPaletteBtn('offshore_wind', '🌊 Offshore', '#38bdf8');
    addPaletteBtn('battery_bess', '🔋 BESS', '#4ade80');
    addPaletteBtn('geothermal', '🌋 Geo', '#fb923c');
    addPaletteBtn('hydro_dam', '💧 Hydro', '#60a5fa');
    addPaletteBtn('sell', '💰 Sell', '#f87171');
    addPaletteBtn('repair', '🔧 Upgrade', '#a78bfa');
  }

  /**
   * Attaches the 3D VR Holographic HUD to the active VR camera
   */
  private attachVRHUD(targetCamera: Camera) {
    this.initVRHUD();
    if (!this.vrHudMesh) return;

    this.vrHudMesh.parent = targetCamera;
    if (this.isVRHudMinimized) {
      this.vrHudMesh.position = new Vector3(0, -0.85, 2.15);
      this.vrHudMesh.rotation = new Vector3(-0.30, 0, 0);
    } else {
      this.vrHudMesh.position = new Vector3(0, -0.62, 2.15);
      this.vrHudMesh.rotation = new Vector3(-0.24, 0, 0);
    }
    this.vrHudMesh.setEnabled(true);

    if (this.latestVRHudData) {
      this.updateVRHUD(this.latestVRHudData);
    }
  }

  /**
   * Toggle between full dashboard and compact docked bar in VR
   */
  private toggleVRHudMinimized() {
    this.isVRHudMinimized = !this.isVRHudMinimized;
    if (!this.vrHudMesh || !this.vrContainerRect || !this.vrDetailedSection) return;

    if (this.isVRHudMinimized) {
      this.vrDetailedSection.isVisible = false;
      this.vrContainerRect.height = '95px';
      this.vrContainerRect.color = '#38bdf8';
      this.vrHudMesh.scaling = new Vector3(0.9, 0.28, 1);
      this.vrHudMesh.position = new Vector3(0, -0.85, 2.15);
      this.vrHudMesh.rotation = new Vector3(-0.30, 0, 0);
      if (this.vrBtnMinMax && this.vrBtnMinMax.textBlock) {
        this.vrBtnMinMax.textBlock.text = 'Expand';
      }
    } else {
      this.vrDetailedSection.isVisible = true;
      this.vrContainerRect.height = '660px';
      this.vrContainerRect.color = '#10b981';
      this.vrHudMesh.scaling = new Vector3(1, 1, 1);
      this.vrHudMesh.position = new Vector3(0, -0.62, 2.15);
      this.vrHudMesh.rotation = new Vector3(-0.24, 0, 0);
      if (this.vrBtnMinMax && this.vrBtnMinMax.textBlock) {
        this.vrBtnMinMax.textBlock.text = 'Dock';
      }
    }
  }

  /**
   * Live update VR HUD with simulated telemetry, funds, and scenario directives
   */
  public updateVRHUD(data: VRHudData) {
    this.latestVRHudData = data;
    if (!this.vrHudMesh || !this.vrHudMesh.isEnabled()) return;

    if (this.vrTxtScenario) {
      this.vrTxtScenario.text = `${data.activeScenarioName}`;
    }
    if (this.vrTxtTimeWeather) {
      this.vrTxtTimeWeather.text = `${data.timeFormatted} · ${data.windSpeedMs.toFixed(1)} m/s · ${Math.round(data.solarIrradiancePct)}% Sun`;
    }
    if (this.vrTxtFunds) {
      const deltaSign = data.cashDelta >= 0 ? '+' : '';
      this.vrTxtFunds.text = `₱${Math.floor(data.funds).toLocaleString()}\n(${deltaSign}₱${Math.round(data.cashDelta)}/h)`;
    }
    if (this.vrTxtClean) {
      this.vrTxtClean.text = `${Math.round(data.cleanPercentage)}%`;
      this.vrTxtClean.color = data.cleanPercentage >= 80 ? '#34d399' : '#fbbf24';
    }
    if (this.vrTxtPower) {
      const totalGen = Math.round(data.totalCleanMW + data.totalFossilMW);
      this.vrTxtPower.text = `${totalGen} / ${Math.round(data.totalDemandMW)} MW`;
      this.vrTxtPower.color = data.hasBlackout ? '#f87171' : '#38bdf8';
    }
    if (this.vrTxtEmissions) {
      this.vrTxtEmissions.text = `${Math.round(data.co2PerDay)} t/day`;
      this.vrTxtEmissions.color = data.co2PerDay === 0 ? '#34d399' : '#e2e8f0';
    }
    if (this.vrTxtStability) {
      this.vrTxtStability.text = `${data.gridStabilityPct.toFixed(1)}%`;
      this.vrTxtStability.color = data.gridStabilityPct >= 90 ? '#4ade80' : '#f87171';
    }
    if (this.vrTxtStorage) {
      this.vrTxtStorage.text = `${Math.round(data.storageMWh)} / ${Math.round(data.storageCapacityMWh)} MWh`;
    }
    if (this.vrTxtDirectivesCount) {
      this.vrTxtDirectivesCount.text = `${data.directivesCount} Completed`;
    }
    if (this.vrTxtDirectiveTop) {
      this.vrTxtDirectiveTop.text = `▸ ${data.topDirectiveTitle} (${data.topDirectiveProgress})`;
    }
  }

  /**
   * Update 3D Holographic Overhead Badges for all Interactibles
   * Makes all buildings and structures immediately visible and identifiable in VR and 3D diorama
   */
  public updateOverheadBadges(tiles: GridTile[]) {
    const spacing = 2.15;

    tiles.forEach((tile) => {
      const key = `${tile.x}_${tile.z}`;
      const bundle = this.tileMeshes.get(key);
      if (!bundle) return;

      if (tile.building === 'empty') {
        if (bundle.overheadBadge) {
          bundle.overheadBadge.dispose(false, true);
          bundle.overheadBadge = undefined;
          bundle.badgeTexture = undefined;
        }
        return;
      }

      const surfaceY = bundle.surfaceY;
      let bldgHeight = 1.2;
      let icon = '⚡';
      let title = BUILDING_DEFS[tile.building]?.name || 'Structure';
      let statText = `${Math.round(tile.powerOutputMW || 0)} MW`;
      let statusColor = '#38bdf8'; // cyan

      switch (tile.building) {
        case 'wind_turbine':
          bldgHeight = 2.4;
          icon = '🍃';
          title = 'Wind Turbine';
          statText = `${Math.round(tile.powerOutputMW || 45)} MW`;
          statusColor = '#34d399';
          break;
        case 'offshore_wind':
          bldgHeight = 2.8;
          icon = '🌊';
          title = 'Offshore Wind';
          statText = `${Math.round(tile.powerOutputMW || 85)} MW`;
          statusColor = '#38bdf8';
          break;
        case 'solar_farm':
          bldgHeight = 0.8;
          icon = '☀️';
          title = 'Solar Farm';
          statText = `${Math.round(tile.powerOutputMW || 30)} MW`;
          statusColor = '#facc15';
          break;
        case 'battery_bess':
          bldgHeight = 0.9;
          icon = '🔋';
          title = 'BESS Battery';
          statText = `${Math.round(tile.storedMWh || 0)} MWh`;
          statusColor = '#4ade80';
          break;
        case 'coal_plant':
          bldgHeight = 2.2;
          icon = '🏭';
          title = 'Coal Plant';
          statText = tile.decommissioning ? 'Retiring...' : '-180 t CO₂';
          statusColor = tile.decommissioning ? '#fb923c' : '#f87171';
          break;
        case 'gas_peaker':
          bldgHeight = 1.5;
          icon = '🔥';
          title = 'Gas Peaker';
          statText = tile.decommissioning ? 'Retiring...' : '-85 t CO₂';
          statusColor = tile.decommissioning ? '#fb923c' : '#fbbf24';
          break;
        case 'hydro_dam':
          bldgHeight = 1.3;
          icon = '💧';
          title = 'Hydro Dam';
          statText = `${Math.round(tile.powerOutputMW || 110)} MW`;
          statusColor = '#60a5fa';
          break;
        case 'geothermal':
          bldgHeight = 1.2;
          icon = '🌋';
          title = 'Geothermal';
          statText = `${Math.round(tile.powerOutputMW || 80)} MW`;
          statusColor = '#fb923c';
          break;
        case 'city_center':
          bldgHeight = 2.6;
          icon = '🏙️';
          title = 'Metro Grid';
          statText = `Demand ${Math.round(tile.powerOutputMW || 450)} MW`;
          statusColor = '#e2e8f0';
          break;
        case 'substation':
          bldgHeight = 1.5;
          icon = '⚡';
          title = 'Substation';
          statText = 'Grid Node';
          statusColor = '#38bdf8';
          break;
        case 'remediated_park':
          bldgHeight = 1.0;
          icon = '🌳';
          title = 'Clean Park';
          statText = 'Remediated';
          statusColor = '#4ade80';
          break;
      }

      if (tile.level > 1) {
        title += ` Lv.${tile.level}`;
      }

      const badgePosY = surfaceY + bldgHeight + 0.55;

      if (!bundle.overheadBadge) {
        // Create 3D Holographic Overhead Plane
        const plane = MeshBuilder.CreatePlane(
          `vr_badge_${tile.x}_${tile.z}`,
          { width: 1.5, height: 0.58 },
          this.scene
        );
        plane.position = new Vector3(tile.x * spacing, badgePosY, tile.z * spacing);
        plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
        plane.isPickable = true;
        plane.metadata = { tileX: tile.x, tileZ: tile.z, isBadge: true };

        // AdvancedDynamicTexture for high-res holographic text in VR
        const tex = AdvancedDynamicTexture.CreateForMesh(plane, 380, 148, false);

        const card = new Rectangle(`vr_badge_card_${tile.x}_${tile.z}`);
        card.width = '360px';
        card.height = '136px';
        card.cornerRadius = 14;
        card.thickness = 2;
        card.color = statusColor;
        card.background = 'rgba(7, 12, 22, 0.9)';
        tex.addControl(card);

        const stack = new StackPanel();
        stack.isVertical = true;
        stack.paddingTop = '10px';
        stack.paddingLeft = '10px';
        stack.paddingRight = '10px';
        card.addControl(stack);

        const headerText = new TextBlock(`txt_head_${tile.x}_${tile.z}`, `${icon} ${title}`);
        headerText.fontSize = 24;
        headerText.fontWeight = 'bold';
        headerText.color = '#f8fafc';
        headerText.height = '34px';
        stack.addControl(headerText);

        const valText = new TextBlock(`txt_val_${tile.x}_${tile.z}`, statText);
        valText.fontSize = 22;
        valText.fontWeight = 'bold';
        valText.color = statusColor;
        valText.height = '34px';
        valText.fontFamily = 'monospace';
        stack.addControl(valText);

        const tapHint = new TextBlock(`txt_hint_${tile.x}_${tile.z}`, 'Tap to Inspect');
        tapHint.fontSize = 15;
        tapHint.color = '#64748b';
        tapHint.height = '24px';
        stack.addControl(tapHint);

        bundle.overheadBadge = plane;
        bundle.badgeTexture = { tex, card, headerText, valText };
      } else {
        // Update existing badge position & text
        bundle.overheadBadge.position.y = badgePosY;
        if (bundle.badgeTexture) {
          bundle.badgeTexture.headerText.text = `${icon} ${title}`;
          bundle.badgeTexture.valText.text = statText;
          bundle.badgeTexture.valText.color = statusColor;
          bundle.badgeTexture.card.color = statusColor;
        }
      }
    });
  }

  /**
   * Displays the 3D World-Space Floating Tile Inspector slate in VR
   */
  public showVRTileInspector(x: number, z: number) {
    const key = `${x}_${z}`;
    const bundle = this.tileMeshes.get(key);
    if (!bundle || !bundle.tileData) return;

    const tile = bundle.tileData;
    const spacing = 2.15;
    const surfaceY = bundle.surfaceY;

    if (!this.vrTileInspectorMesh) {
      this.vrTileInspectorMesh = MeshBuilder.CreatePlane(
        'vr_tile_inspector',
        { width: 2.5, height: 1.65 },
        this.scene
      );
      this.vrTileInspectorMesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
      this.vrTileInspectorMesh.isPickable = true;

      this.vrTileInspectorTexture = AdvancedDynamicTexture.CreateForMesh(
        this.vrTileInspectorMesh,
        800,
        520,
        false
      );
    }

    // Position floating slightly above and to the side of the inspected tile
    this.vrTileInspectorMesh.position = new Vector3(
      x * spacing,
      surfaceY + 2.3,
      z * spacing
    );
    this.vrTileInspectorMesh.setEnabled(true);

    const tex = this.vrTileInspectorTexture!;
    tex.rootContainer.dispose();

    const rootRect = new Rectangle('vr_insp_root');
    rootRect.width = '780px';
    rootRect.height = '500px';
    rootRect.cornerRadius = 20;
    rootRect.thickness = 2;
    rootRect.color = '#38bdf8';
    rootRect.background = 'rgba(7, 14, 28, 0.96)';
    tex.addControl(rootRect);

    const stack = new StackPanel('vr_insp_stack');
    stack.isVertical = true;
    stack.paddingTop = '16px';
    stack.paddingLeft = '20px';
    stack.paddingRight = '20px';
    rootRect.addControl(stack);

    // Header
    const def = BUILDING_DEFS[tile.building];
    const bldgName = def ? def.name : (tile.terrain.toUpperCase() + ' Zone');
    const header = new TextBlock('vr_insp_header', `Sector (${x}, ${z}) · ${bldgName}`);
    header.fontSize = 26;
    header.fontWeight = 'bold';
    header.color = '#38bdf8';
    header.height = '42px';
    stack.addControl(header);

    // Details Grid
    const detailsGrid = new Grid();
    detailsGrid.height = '120px';
    detailsGrid.addColumnDefinition(0.5);
    detailsGrid.addColumnDefinition(0.5);
    stack.addControl(detailsGrid);

    const col1 = new StackPanel();
    col1.isVertical = true;
    detailsGrid.addControl(col1, 0, 0);

    const col2 = new StackPanel();
    col2.isVertical = true;
    detailsGrid.addControl(col2, 0, 1);

    const addStat = (col: StackPanel, label: string, val: string, color: string = '#f1f5f9') => {
      const row = new TextBlock();
      row.text = `${label}: ${val}`;
      row.fontSize = 20;
      row.color = color;
      row.height = '34px';
      row.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      col.addControl(row);
    };

    addStat(col1, 'Terrain', tile.terrain.toUpperCase(), '#94a3b8');
    addStat(col1, 'Power Output', `${Math.round(tile.powerOutputMW || 0)} MW`, '#34d399');
    addStat(col1, 'Level', `Tier ${tile.level}`, '#fbbf24');

    addStat(col2, 'Health', `${tile.health || 100}%`, '#4ade80');
    if (tile.storedMWh !== undefined) {
      addStat(col2, 'Energy Storage', `${Math.round(tile.storedMWh)} MWh`, '#38bdf8');
    } else {
      addStat(col2, 'Status', tile.decommissioning ? 'Retiring' : 'Operational', tile.decommissioning ? '#fb923c' : '#38bdf8');
    }

    // VR Action Buttons Row
    const btnRow = new StackPanel('vr_insp_btn_row');
    btnRow.isVertical = false;
    btnRow.height = '70px';
    btnRow.paddingTop = '14px';
    stack.addControl(btnRow);

    const makeBtn = (text: string, color: string, bg: string, onClick: () => void) => {
      const btn = Button.CreateSimpleButton(`btn_${text}`, text);
      btn.width = '230px';
      btn.height = '52px';
      btn.color = color;
      btn.fontSize = 18;
      btn.fontWeight = 'bold';
      btn.cornerRadius = 10;
      btn.thickness = 1;
      btn.background = bg;
      btn.paddingRight = '12px';
      btn.onPointerUpObservable.add(() => {
        onClick();
        this.showVRTileInspector(x, z);
      });
      btnRow.addControl(btn);
      return btn;
    };

    if (tile.building !== 'empty' && tile.building !== 'city_center') {
      if (def?.category === 'renewable' || def?.category === 'storage') {
        if (tile.level < 2) {
          makeBtn('⬆️ Upgrade Lv.2', '#34d399', 'rgba(6, 78, 59, 0.85)', () => {
            if (this.onUpgradeTileCallback) this.onUpgradeTileCallback(tile);
          });
        }
        makeBtn('💰 Dismantle & Refund', '#fbbf24', 'rgba(120, 53, 15, 0.85)', () => {
          if (this.onDemolishTileCallback) this.onDemolishTileCallback(tile);
        });
      } else if (def?.category === 'fossil') {
        makeBtn('⚠️ Decommission', '#f87171', 'rgba(127, 29, 29, 0.85)', () => {
          if (this.onDecommissionTileCallback) this.onDecommissionTileCallback(tile);
        });
      }
    } else if (tile.building === 'empty') {
      // Quick build buttons for empty tile
      makeBtn('☀️ Build Solar', '#facc15', 'rgba(113, 63, 18, 0.85)', () => {
        if (this.onQuickBuildCallback) this.onQuickBuildCallback(tile, 'solar_farm');
      });
      makeBtn('🍃 Build Wind', '#34d399', 'rgba(6, 78, 59, 0.85)', () => {
        if (this.onQuickBuildCallback) this.onQuickBuildCallback(tile, 'wind_turbine');
      });
      makeBtn('🔋 Build BESS', '#38bdf8', 'rgba(14, 116, 144, 0.85)', () => {
        if (this.onQuickBuildCallback) this.onQuickBuildCallback(tile, 'battery_bess');
      });
    }

    // Close Inspector button
    const closeBtn = Button.CreateSimpleButton('vr_btn_close_insp', '✖ Close');
    closeBtn.width = '140px';
    closeBtn.height = '52px';
    closeBtn.color = '#cbd5e1';
    closeBtn.fontSize = 18;
    closeBtn.cornerRadius = 10;
    closeBtn.thickness = 1;
    closeBtn.background = 'rgba(30, 41, 59, 0.85)';
    closeBtn.onPointerUpObservable.add(() => {
      this.clearSelection();
    });
    btnRow.addControl(closeBtn);
  }

  /**
   * Highlights active placement building or tool in VR
   */
  public updateVRPaletteActive(buildingType: BuildingType | null) {
    this.vrPaletteButtons.forEach((btn, key) => {
      if (key === buildingType) {
        btn.color = '#34d399';
        btn.thickness = 2;
        btn.background = 'rgba(16, 185, 129, 0.35)';
      } else {
        btn.color = '#94a3b8';
        btn.thickness = 1;
        btn.background = 'rgba(15, 23, 42, 0.85)';
      }
    });
  }

  /**
   * Toggle VR Mode:
   * 1. If currently in VR (WebXR or Stereoscopic), exits back to normal 3D desktop view.
   * 2. If WebXR hardware / browser session is supported, launches WebXR Immersive-VR.
   * 3. If WebXR is not detected, launches Stereoscopic 3D Side-by-Side mode for Cardboard/mobile headsets.
   */
  public async toggleVR(): Promise<{ active: boolean; mode: 'webxr' | 'stereoscopic' | 'desktop'; message: string }> {
    // If currently in WebXR, exit it
    if (this.xrHelper && this.xrHelper.baseExperience.state === WebXRState.IN_XR) {
      try {
        await this.xrHelper.baseExperience.exitXRAsync();
      } catch (e) {
        console.warn('Error exiting XR:', e);
      }
      this.isVRActive = false;
      this.isStereoscopicActive = false;
      if (this.vrHudMesh) {
        this.vrHudMesh.setEnabled(false);
        this.vrHudMesh.parent = null;
      }
      this.notifyVRChange('desktop');
      return { active: false, mode: 'desktop', message: 'Exited VR mode' };
    }

    // If currently in Stereoscopic mode, switch back to normal ArcRotateCamera
    if (this.isStereoscopicActive) {
      if (this.stereoscopicCamera) {
        this.stereoscopicCamera.detachControl();
      }
      this.scene.activeCamera = this.camera;
      this.camera.attachControl(this.canvas, true);
      this.isStereoscopicActive = false;
      this.isVRActive = false;
      if (this.vrHudMesh) {
        this.vrHudMesh.setEnabled(false);
        this.vrHudMesh.parent = null;
      }
      this.notifyVRChange('desktop');
      return { active: false, mode: 'desktop', message: 'Switched back to standard 3D camera' };
    }

    // Attempt WebXR first (Meta Quest, Vision Pro, HTC Vive, Pico, WebXR emulator)
    if (typeof navigator !== 'undefined' && (navigator as any).xr) {
      try {
        const supported = await (navigator as any).xr.isSessionSupported('immersive-vr');
        if (supported) {
          if (!this.xrHelper) {
            this.xrHelper = await this.scene.createDefaultXRExperienceAsync({
              disableDefaultUI: true,
              optionalFeatures: true,
            });

            this.xrHelper.baseExperience.onStateChangedObservable.add((state) => {
              const inXR = state === WebXRState.IN_XR;
              this.isVRActive = inXR;
              if (inXR && this.xrHelper?.baseExperience.camera) {
                // Tabletop diorama vantage point looking down at the power grid
                this.xrHelper.baseExperience.camera.position = new Vector3(7.5, 3.2, -2.5);
                this.xrHelper.baseExperience.camera.setTarget(new Vector3(7.5, 0.5, 7.5));
                // Attach HUD to WebXR camera so it moves with the player's headset
                this.attachVRHUD(this.xrHelper.baseExperience.camera);
              } else {
                if (this.vrHudMesh) {
                  this.vrHudMesh.setEnabled(false);
                  this.vrHudMesh.parent = null;
                }
              }
              this.notifyVRChange(inXR ? 'webxr' : 'desktop');
            });
          }

          await this.xrHelper.baseExperience.enterXRAsync('immersive-vr', 'local-floor');
          this.isVRActive = true;
          if (this.xrHelper?.baseExperience.camera) {
            this.attachVRHUD(this.xrHelper.baseExperience.camera);
          }
          this.notifyVRChange('webxr');
          return { active: true, mode: 'webxr', message: 'Entered WebXR Immersive VR Session (HUD Active in Headset)' };
        }
      } catch (err: any) {
        console.warn('WebXR session error, falling back to Stereoscopic 3D:', err);
      }
    }

    // If no WebXR device detected, switch to Stereoscopic Side-by-Side 3D mode
    if (!this.stereoscopicCamera) {
      this.stereoscopicCamera = new StereoscopicArcRotateCamera(
        'stereo_camera',
        this.camera.alpha,
        this.camera.beta,
        this.camera.radius,
        this.camera.target.clone(),
        0.064, // 64mm IPD
        true, // Side by Side
        this.scene
      );
      this.stereoscopicCamera.lowerRadiusLimit = this.camera.lowerRadiusLimit;
      this.stereoscopicCamera.upperRadiusLimit = this.camera.upperRadiusLimit;
      this.stereoscopicCamera.lowerBetaLimit = this.camera.lowerBetaLimit;
      this.stereoscopicCamera.upperBetaLimit = this.camera.upperBetaLimit;
    } else {
      this.stereoscopicCamera.alpha = this.camera.alpha;
      this.stereoscopicCamera.beta = this.camera.beta;
      this.stereoscopicCamera.radius = this.camera.radius;
      this.stereoscopicCamera.target.copyFrom(this.camera.target);
    }

    this.camera.detachControl();
    this.scene.activeCamera = this.stereoscopicCamera;
    this.stereoscopicCamera.attachControl(this.canvas, true);
    this.isStereoscopicActive = true;
    this.isVRActive = true;

    // Attach 3D HUD to Stereoscopic Camera so it renders in stereoscopic 3D for both lenses
    this.attachVRHUD(this.stereoscopicCamera);

    this.notifyVRChange('stereoscopic');
    return {
      active: true,
      mode: 'stereoscopic',
      message: 'Activated Stereoscopic 3D VR Mode (3D HUD Visible for both lenses)',
    };
  }

  public setVRStateCallback(cb?: (isVR: boolean, mode: 'webxr' | 'stereoscopic' | 'desktop') => void) {
    this.onVRStateChangeCallback = cb;
  }

  private notifyVRChange(mode: 'webxr' | 'stereoscopic' | 'desktop') {
    if (this.onVRStateChangeCallback) {
      this.onVRStateChangeCallback(mode !== 'desktop', mode);
    }
  }

  public getVRStatus(): { isVR: boolean; mode: 'webxr' | 'stereoscopic' | 'desktop' } {
    if (this.xrHelper && this.xrHelper.baseExperience.state === WebXRState.IN_XR) {
      return { isVR: true, mode: 'webxr' };
    }
    if (this.isStereoscopicActive) {
      return { isVR: true, mode: 'stereoscopic' };
    }
    return { isVR: false, mode: 'desktop' };
  }

  public dispose() {
    window.removeEventListener('resize', this.handleResize);
    if (this.vrHudTexture) {
      this.vrHudTexture.dispose();
      this.vrHudTexture = null;
    }
    if (this.vrHudMesh) {
      this.vrHudMesh.dispose();
      this.vrHudMesh = null;
    }
    if (this.stereoscopicCamera) {
      this.stereoscopicCamera.dispose();
      this.stereoscopicCamera = null;
    }
    if (this.xrHelper) {
      this.xrHelper.dispose();
      this.xrHelper = null;
    }
    this.scene.dispose();
    this.engine.dispose();
  }
}
