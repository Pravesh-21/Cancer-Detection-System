"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Center, Grid } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import {
  Box,
  RotateCcw,
  Eye,
  Scissors,
  Layers,
  Activity,
  Maximize2,
  Minimize2,
  Compass,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sliders,
  ScanLine,
  Cpu,
} from "lucide-react";
import type { Domain } from "@/lib/types";
import {
  getRiskTierConfig,
  classifyClinicalRisk,
  ORGAN_SPATIAL_REGISTRY,
} from "@/utils/riskRegistry";
import OrganMeshes from "./OrganMeshes";
import { cn } from "@/lib/utils";

interface Organ3DViewerProps {
  domain: Domain | null;
  predictedClass?: string | null;
  displayName?: string | null;
  confidence?: number | null;
  isLoading?: boolean;
  hasResults?: boolean;
}

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[6, 8, 6]} intensity={1.2} />
      <directionalLight position={[-6, -4, -4]} intensity={0.4} color="#94A3B8" />
      <pointLight position={[0, 4, 3]} intensity={0.6} />
    </>
  );
}

export default function Organ3DViewer({
  domain,
  predictedClass,
  displayName,
  confidence,
  isLoading = false,
  hasResults = false,
}: Organ3DViewerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [opacity, setOpacity] = useState<number>(0.65);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [cutPlaneActive, setCutPlaneActive] = useState<boolean>(false);
  const [cutPlaneDepth, setCutPlaneDepth] = useState<number>(0.1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<string>("iso");

  const controlsRef = useRef<OrbitControlsImpl>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const riskTier = classifyClinicalRisk(predictedClass);
  const riskConfig = getRiskTierConfig(predictedClass);
  const safeDomain: Domain = domain ?? "brain";
  const spatialMeta = ORGAN_SPATIAL_REGISTRY[safeDomain] || ORGAN_SPATIAL_REGISTRY.brain;

  const resetCamera = (preset: "iso" | "ap" | "lat" | "axial" = "iso") => {
    setActivePreset(preset);
    if (!controlsRef.current) return;

    controlsRef.current.reset();
    const camera = controlsRef.current.object;

    if (preset === "iso") {
      camera.position.set(2.6, 2.0, 3.2);
    } else if (preset === "ap") {
      camera.position.set(0, 0, 4.2);
    } else if (preset === "lat") {
      camera.position.set(4.2, 0, 0);
    } else if (preset === "axial") {
      camera.position.set(0, 4.2, 0.01);
    }
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  };

  const organLabel = domain
    ? (ORGAN_SPATIAL_REGISTRY[domain]?.organName ?? domain.toUpperCase())
    : null;

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "clinical-card flex flex-col relative overflow-hidden transition-all",
        isFullscreen
          ? "fixed inset-0 z-50 rounded-none bg-white h-screen w-screen p-6"
          : "p-4 space-y-3.5"
      )}
      role="region"
      aria-label="3D Spatial Organ Informatics Viewer"
    >
      {/* ── Card Header: Title & Clinical Urgency Tier ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-clinical-100 text-clinical-700 font-bold text-[12px] flex items-center justify-center">
            3D
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[13px] font-bold text-slate-900 leading-tight">
                Spatial Organ Informatics
              </h2>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-clinical-50 text-clinical-700 border border-clinical-200">
                AuraMed 2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Interactive 3D Anatomical Volume & Lesion Geometry
            </p>
          </div>
        </div>

        {/* Dynamic Risk Urgency Badge */}
        {predictedClass ? (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-2xs transition-all",
              riskConfig.badgeClass,
              riskConfig.pulseClass
            )}
          >
            {riskTier === "high" && <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />}
            {riskTier === "moderate" && <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
            {riskTier === "normal" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
            <span>{riskConfig.label}</span>
          </span>
        ) : domain ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <Compass className="w-3.5 h-3.5 text-slate-400" />
            <span>Target: {domain.toUpperCase()}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            <span>Standby</span>
          </span>
        )}
      </div>

      {/* ── 3D Viewport Canvas Container ── */}
      <div className="relative w-full h-[80vh] rounded-lg border border-slate-200 bg-gradient-to-b from-[#0F172A] to-[#1E293B] overflow-hidden shadow-inner flex flex-col justify-between">

        {/* Empty Standby State — shown before pipeline runs */}
        {!hasResults && !isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 text-center px-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-600/60 flex items-center justify-center">
                <ScanLine className="w-9 h-9 text-slate-500" strokeWidth={1.2} />
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
              </span>
            </div>
            <div className="space-y-1.5">
              <p className="text-[13px] font-semibold text-slate-300">
                3D Reconstruction Standby
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed max-w-[220px]">
                Run the diagnostic pipeline to generate an interactive anatomical
                volume for the detected organ domain.
              </p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {["Brain", "Lung", "Bone", "Breast", "Skin"].map((organ) => (
                <span
                  key={organ}
                  className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wide rounded bg-slate-800 text-slate-500 border border-slate-700"
                >
                  {organ}
                </span>
              ))}
            </div>
          </div>
        )}
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-30 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2">
            <div className="w-7 h-7 border-2 border-white/20 border-t-sky-400 rounded-full animate-spin" />
            <span className="text-[12px] font-medium text-slate-200">
              Reconstructing 3D Spatial Volume…
            </span>
          </div>
        )}

        {/* Viewport Floating HUD - Top Left: Organ & Coordinate Telemetry */}
        {hasResults && (
          <div className="absolute top-3 left-3 z-20 pointer-events-none space-y-1">
            <div className="px-2.5 py-1.5 rounded-md bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-white shadow-lg space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                <span className="text-[11px] font-bold tracking-wide uppercase text-slate-200">
                  {spatialMeta.organName}
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2">
                <span>
                  X: {spatialMeta.anatomicalCoordinates.x.toFixed(1)} mm
                </span>
                <span>•</span>
                <span>
                  Y: {spatialMeta.anatomicalCoordinates.y.toFixed(1)} mm
                </span>
                <span>•</span>
                <span>
                  Z: {spatialMeta.anatomicalCoordinates.z.toFixed(1)} mm
                </span>
              </div>
            </div>

            {predictedClass && (
              <div className="px-2.5 py-1 rounded-md bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-white shadow-lg flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: riskConfig.accentHex }}
                />
                <span className="text-[10px] font-medium text-slate-300">
                  Lesion Vol:{" "}
                  <strong className="text-white font-mono">
                    {spatialMeta.estimatedVolumeCm3} cm³
                  </strong>
                </span>
                <span className="text-slate-500">|</span>
                <span className="text-[10px] font-mono text-slate-300">
                  Slice: {spatialMeta.sliceThicknessMm} mm
                </span>
              </div>
            )}
          </div>
        )}

        {/* Viewport Floating HUD - Top Right: Quick Controls & Fullscreen */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => resetCamera("iso")}
            className="p-1.5 rounded bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 shadow-lg transition-colors cursor-pointer"
            title="Reset Camera View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setWireframe(!wireframe)}
            className={cn(
              "p-1.5 rounded border border-slate-700/60 shadow-lg transition-colors cursor-pointer",
              wireframe
                ? "bg-sky-500 text-white"
                : "bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white"
            )}
            title="Toggle Wireframe Mesh"
          >
            <Box className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 shadow-lg transition-colors cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Three.js R3F WebGL Canvas — only mounted after results arrive */}
        {isMounted && hasResults && domain ? (
          <Canvas
            gl={{
              localClippingEnabled: true,
              antialias: true,
              alpha: true,
            }}
            camera={{ position: [2.6, 2.0, 3.2], fov: 42 }}
            className="w-full h-full cursor-grab active:cursor-grabbing"
          >
            <SceneLighting />
            <Suspense
              fallback={
                <mesh>
                  <sphereGeometry args={[0.6, 32, 32]} />
                  <meshStandardMaterial
                    color="#334155"
                    wireframe
                    transparent
                    opacity={0.4}
                  />
                </mesh>
              }
            >
              <Center>
                <OrganMeshes
                  domain={domain}
                  predictedClass={predictedClass}
                  opacity={opacity}
                  wireframe={wireframe}
                  cutPlaneActive={cutPlaneActive}
                  cutPlaneDepth={cutPlaneDepth}
                />
              </Center>
            </Suspense>

            {/* Subtle Clinical Floor Grid */}
            <Grid
              position={[0, -1.8, 0]}
              args={[10, 10]}
              cellSize={0.5}
              cellThickness={0.6}
              cellColor="#334155"
              sectionSize={2.0}
              sectionThickness={1.2}
              sectionColor="#475569"
              fadeDistance={7}
            />

            <OrbitControls
              ref={controlsRef}
              enableDamping
              dampingFactor={0.08}
              rotateSpeed={0.8}
              zoomSpeed={1.0}
              panSpeed={0.8}
              minDistance={1.8}
              maxDistance={8.5}
            />
          </Canvas>
        ) : isMounted && isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-slate-600 border-t-sky-400 rounded-full animate-spin" />
          </div>
        ) : null}

        {/* Viewport Floating HUD - Bottom Left: Orientation Landmarker */}
        {hasResults && (
          <div className="absolute bottom-3 left-3 z-20 pointer-events-none flex items-center gap-1 text-[9px] font-mono text-slate-400 bg-slate-900/80 px-2 py-1 rounded border border-slate-700/60">
            <span className="text-rose-400 font-bold">A</span>: Anterior |{" "}
            <span className="text-sky-400 font-bold">P</span>: Posterior |{" "}
            <span className="text-emerald-400 font-bold">S</span>: Superior
          </div>
        )}

        {/* Viewport Floating HUD - Bottom Right: Camera Angle Presets */}
        {hasResults && (
          <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1">
            {(["iso", "ap", "lat", "axial"] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => resetCamera(preset)}
                className={cn(
                  "px-2 py-0.5 text-[10px] font-bold rounded uppercase transition-colors cursor-pointer border",
                  activePreset === preset
                    ? "bg-sky-500 text-white border-sky-400 shadow-xs"
                    : "bg-slate-900/80 text-slate-300 border-slate-700/60 hover:bg-slate-800"
                )}
              >
                {preset}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Interactive 3D Control Sliders Toolbar — only shown when model is active ── */}
      {hasResults && (
        <div className="space-y-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
          {/* Tissue Opacity Slider (0% to 100%) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-clinical-600" />
                Tissue Opacity
              </span>
              <span className="font-mono text-slate-600 font-bold">
                {Math.round(opacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="1.0"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-clinical-600"
              aria-label="Anatomical tissue opacity slider"
            />
          </div>

          {/* Cross-Sectional Cut Plane Toggle & Depth Slider */}
          <div className="pt-2 border-t border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                <Scissors className="w-3.5 h-3.5 text-clinical-600" />
                <span>Cross-Sectional Cut Plane</span>
              </div>
              <button
                type="button"
                onClick={() => setCutPlaneActive(!cutPlaneActive)}
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-extrabold transition-all cursor-pointer",
                  cutPlaneActive
                    ? "bg-clinical-600 text-white shadow-2xs"
                    : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-100"
                )}
              >
                {cutPlaneActive ? "Slicing Active" : "Enable Cut"}
              </button>
            </div>

            {cutPlaneActive && (
              <div className="space-y-1 pl-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>Transverse Depth</span>
                  <span>{cutPlaneDepth > 0 ? `+${cutPlaneDepth.toFixed(2)}` : cutPlaneDepth.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="-1.2"
                  max="1.2"
                  step="0.05"
                  value={cutPlaneDepth}
                  onChange={(e) => setCutPlaneDepth(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-clinical-600"
                  aria-label="Cross-sectional cut plane depth slider"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Lesion Finding Alert Strip ── */}
      {predictedClass ? (
        <div
          className={cn(
            "p-2.5 rounded-lg border text-[11px] flex items-center justify-between",
            riskConfig.bgLightClass,
            riskConfig.borderClass,
            riskConfig.textClass
          )}
        >
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-ping"
              style={{ backgroundColor: riskConfig.accentHex }}
            />
            <span className="font-semibold">
              {displayName || predictedClass} (
              {confidence ? `${(confidence * 100).toFixed(1)}%` : "Detected"}
              )
            </span>
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-wide">
            {riskConfig.urgencyCode}
          </span>
        </div>
      ) : (
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
          <span>
            {isLoading
              ? "Generating 3D reconstruction…"
              : "Run the diagnostic pipeline to generate the 3D model"}
          </span>
          <span className="font-mono text-[10px] text-slate-400">
            {isLoading ? "Processing" : "Awaiting Pipeline"}
          </span>
        </div>
      )}
    </div>
  );
}
