import React, { useEffect, useRef, useState } from 'react';
import { SceneController } from './SceneController';
import { GridTile, WeatherState, BuildingType, VRHudData } from '../types';
import { Glasses, Focus, Sparkles } from 'lucide-react';
import { sound } from '../audio';

interface BabylonSceneProps {
  tiles: GridTile[];
  weather: WeatherState;
  cleanPercentage: number;
  selectedTileCoords: { x: number; z: number } | null;
  onTileSelect: (x: number, z: number) => void;
  placementBuilding: BuildingType | null;
  onDeployBuilding: (x: number, z: number) => void;
  onCancelPlacement: () => void;
  validityChecker?: (x: number, z: number, bldg: BuildingType) => { valid: boolean; reason?: string };
  vrHudData?: VRHudData;
}

export const BabylonScene: React.FC<BabylonSceneProps> = ({
  tiles,
  weather,
  cleanPercentage,
  selectedTileCoords,
  onTileSelect,
  placementBuilding,
  onDeployBuilding,
  onCancelPlacement,
  validityChecker,
  vrHudData,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const controllerRef = useRef<SceneController | null>(null);

  const [vrStatus, setVrStatus] = useState<{ isVR: boolean; mode: 'webxr' | 'stereoscopic' | 'desktop' }>({
    isVR: false,
    mode: 'desktop',
  });
  const [vrToast, setVrToast] = useState<string | null>(null);

  const onTileSelectRef = useRef(onTileSelect);
  onTileSelectRef.current = onTileSelect;

  const onDeployBuildingRef = useRef(onDeployBuilding);
  onDeployBuildingRef.current = onDeployBuilding;

  const onCancelPlacementRef = useRef(onCancelPlacement);
  onCancelPlacementRef.current = onCancelPlacement;

  const validityCheckerRef = useRef(validityChecker);
  validityCheckerRef.current = validityChecker;

  // Initialize Babylon.js Scene Controller once
  useEffect(() => {
    if (!canvasRef.current) return;

    const controller = new SceneController(
      canvasRef.current,
      (x, z) => {
        onTileSelectRef.current(x, z);
      },
      (x, z) => {
        onDeployBuildingRef.current(x, z);
      },
      () => {
        onCancelPlacementRef.current();
      }
    );

    controller.setVRStateCallback((isVR, mode) => {
      setVrStatus({ isVR, mode });
    });

    controllerRef.current = controller;

    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  // Update placement mode on controller
  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.setPlacementMode(placementBuilding, (x, z, bldg) => {
        if (validityCheckerRef.current) {
          return validityCheckerRef.current(x, z, bldg);
        }
        return { valid: true };
      });
    }
  }, [placementBuilding, validityChecker]);

  // Sync grid tiles when building/level updates
  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.syncGrid(tiles);
    }
  }, [tiles]);

  // Sync selection ring
  useEffect(() => {
    if (controllerRef.current) {
      if (selectedTileCoords) {
        controllerRef.current.setSelectedTile(selectedTileCoords.x, selectedTileCoords.z);
      } else {
        controllerRef.current.clearSelection();
      }
    }
  }, [selectedTileCoords]);

  // Sync atmospheric effects (time of day, smog vs clean skies, wind speed)
  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.updateAtmosphere(weather, cleanPercentage);
    }
  }, [weather.timeOfDay, weather.windSpeedMs, cleanPercentage]);

  // Sync 3D VR Holographic HUD telemetry (funds, clean %, grid load, objectives)
  useEffect(() => {
    if (controllerRef.current && vrHudData) {
      controllerRef.current.updateVRHUD(vrHudData);
    }
  }, [vrHudData]);

  const handleResetCamera = () => {
    sound.playClick();
    if (controllerRef.current) {
      controllerRef.current.resetCameraView();
    }
  };

  const handleToggleVR = async () => {
    sound.playClick();
    if (controllerRef.current) {
      const res = await controllerRef.current.toggleVR();
      setVrToast(res.message);
      setTimeout(() => {
        setVrToast((curr) => (curr === res.message ? null : curr));
      }, 4500);
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-[#090d16]">
      <canvas
        ref={canvasRef}
        onContextMenu={(e) => e.preventDefault()}
        className="w-full h-full block outline-none cursor-crosshair active:cursor-crosshair"
      />

      {/* VR Status & Toast Notification */}
      {vrToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/95 border border-cyan-500/50 text-cyan-200 text-xs font-medium rounded-xl shadow-2xl backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
            <span>{vrToast}</span>
          </div>
        </div>
      )}

      {/* Active VR Indicator Badge */}
      {vrStatus.isVR && (
        <div className="absolute top-4 left-5 z-20 pointer-events-auto">
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-cyan-950/95 border border-cyan-500/70 text-cyan-200 rounded-lg shadow-xl backdrop-blur-md text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>
              {vrStatus.mode === 'webxr'
                ? 'WebXR Immersive VR Active · 3D HUD Visible in Headset'
                : 'Stereoscopic 3D VR Active · 3D HUD Visible for Dual Lenses'}
            </span>
            <button
              onClick={handleToggleVR}
              className="ml-2 text-[11px] text-cyan-300 hover:text-white underline cursor-pointer font-bold"
            >
              Exit VR
            </button>
          </div>
        </div>
      )}

      {/* 3D Camera & VR Controls */}
      <div className="absolute bottom-6 left-5 z-20 flex items-center gap-2.5 pointer-events-auto">
        <button
          onClick={handleResetCamera}
          title="Center and Reset Camera View"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-900/85 hover:bg-slate-800 backdrop-blur-md rounded-md border border-slate-700/60 shadow-lg transition-colors cursor-pointer"
        >
          <Focus className="w-3.5 h-3.5 text-amber-400" />
          <span>Center Grid</span>
        </button>

        <button
          onClick={handleToggleVR}
          title={vrStatus.isVR ? 'Exit VR Mode' : 'Enter VR Mode (WebXR / Stereoscopic 3D)'}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md shadow-lg transition-all cursor-pointer backdrop-blur-md border ${
            vrStatus.isVR
              ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-cyan-500/20'
              : 'bg-slate-900/85 hover:bg-slate-800 border-slate-700/60 hover:border-cyan-500/50 text-slate-200 hover:text-cyan-200'
          }`}
        >
          <Glasses className={`w-4 h-4 ${vrStatus.isVR ? 'text-cyan-300 animate-pulse' : 'text-cyan-400'}`} />
          <span>{vrStatus.isVR ? 'Exit VR' : 'VR Mode'}</span>
          {vrStatus.isVR && (
            <span className="px-1.5 py-0.5 text-[9px] font-mono bg-cyan-500/40 text-cyan-200 rounded uppercase">
              {vrStatus.mode === 'webxr' ? 'XR' : '3D'}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
