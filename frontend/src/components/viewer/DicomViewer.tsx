"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sun,
  Contrast,
  Maximize2,
  Minimize2,
  FlipHorizontal2,
  Play,
  ImageIcon,
  Loader2,
  CheckCircle2,
  Sliders,
  Trash2,
  Sparkles,
} from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import type { ViewportSettings, InferenceStatus } from "@/lib/types";
import { STRINGS } from "@/config/strings";
import {
  ACCEPT_FILE_ATTR,
  MAX_FILE_SIZE_BYTES,
  DEFAULT_VIEWPORT_SETTINGS,
} from "@/config/imaging";

interface DicomViewerProps {
  previewUrl: string | null;
  uploadedFileName: string | null;
  uploadedFileSize: number | null;
  viewport: ViewportSettings;
  inferenceStatus: InferenceStatus;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isHeatmapActive?: boolean;
  onFileUpload: (file: File) => void;
  onClearImage: () => void;
  onViewportChange: (settings: ViewportSettings) => void;
  onRunDiagnostic: () => void;
  onToggleHeatmap?: () => void;
}

export default function DicomViewer({
  previewUrl,
  uploadedFileName,
  uploadedFileSize,
  viewport,
  inferenceStatus,
  fileInputRef,
  isHeatmapActive = false,
  onFileUpload,
  onClearImage,
  onViewportChange,
  onRunDiagnostic,
  onToggleHeatmap,
}: DicomViewerProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAdjustments, setShowAdjustments] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  const imageFilter = `brightness(${viewport.brightness}%) contrast(${viewport.contrast}%) ${
    viewport.invert ? "invert(100%)" : ""
  }`;

  const validateAndUpload = (file: File) => {
    setValidationError(null);
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setValidationError(`File size exceeds 25MB limit (${formatFileSize(file.size)}).`);
      return;
    }
    onFileUpload(file);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) validateAndUpload(file);
    },
    [validateAndUpload]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndUpload(file);
  };

  const updateViewport = (patch: Partial<ViewportSettings>) => {
    onViewportChange({ ...viewport, ...patch });
  };

  const resetViewport = () => onViewportChange(DEFAULT_VIEWPORT_SETTINGS);

  // Keyboard Navigation Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!previewUrl) return;
      if (e.key === "Escape") setIsFullscreen(false);
      if (e.key === "+" || e.key === "=") {
        updateViewport({ zoom: Math.min(viewport.zoom + 0.2, 3) });
      }
      if (e.key === "-" || e.key === "_") {
        updateViewport({ zoom: Math.max(viewport.zoom - 0.2, 0.6) });
      }
      if (e.key.toLowerCase() === "i") {
        updateViewport({ invert: !viewport.invert });
      }
      if (e.key.toLowerCase() === "r") {
        resetViewport();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewUrl, viewport]);

  const isLoading = inferenceStatus === "loading";
  const isComplete = inferenceStatus === "complete";
  const hasImage = !!previewUrl;

  return (
    <div
      className="clinical-card p-4 space-y-4"
      role="region"
      aria-label={STRINGS.viewport.title}
    >
      {/* ── Stage 1 Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-clinical-100 text-clinical-700 font-bold text-[12px] flex items-center justify-center">
            1
          </span>
          <div>
            <h2 className="text-[13px] font-bold text-slate-900 leading-tight">
              {STRINGS.viewport.title}
            </h2>
            <p className="text-[11px] text-slate-500">
              {STRINGS.viewport.subtitle}
            </p>
          </div>
        </div>

        {hasImage && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold text-clinical-700 bg-clinical-50 border border-clinical-200 hover:bg-clinical-100 transition-colors"
              aria-label={STRINGS.viewport.replaceButton}
            >
              <Upload className="w-3 h-3" />
              <span>{STRINGS.viewport.replaceButton}</span>
            </button>
            <button
              type="button"
              onClick={onClearImage}
              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title={STRINGS.viewport.removeButton}
              aria-label={STRINGS.viewport.removeButton}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Validation Alert */}
      {validationError && (
        <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-medium animate-fade-in">
          {validationError}
        </div>
      )}

      {/* ── Radiography Viewport / Drag & Drop Zone ── */}
      <div
        className={cn(
          "relative radiograph-viewer rounded-lg overflow-hidden border w-full flex items-center justify-center transition-all",
          hasImage ? "border-slate-800 bg-slate-950" : "border-dashed border-slate-300 bg-slate-50/70",
          isFullscreen
            ? "fixed inset-0 z-50 rounded-none border-none h-full w-full"
            : "h-[340px] max-h-[340px]"
        )}
        ref={viewerRef}
        tabIndex={0}
        role="figure"
        aria-label="Patient Radiographic Scan Viewport"
      >
        {/* HUD Viewport Controls (Visible when image is loaded) */}
        {hasImage && (
          <div
            className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 bg-slate-900/85 backdrop-blur-md rounded-lg p-1 border border-white/10 shadow-lg"
            role="toolbar"
            aria-label="Image manipulation tools"
          >
            <button
              type="button"
              onClick={() => updateViewport({ zoom: Math.min(viewport.zoom + 0.2, 3) })}
              className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Zoom In (+)"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => updateViewport({ zoom: Math.max(viewport.zoom - 0.2, 0.6) })}
              className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Zoom Out (-)"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => updateViewport({ invert: !viewport.invert })}
              className={cn(
                "p-1.5 rounded text-slate-300 hover:text-white hover:bg-white/10 transition-colors",
                viewport.invert && "bg-clinical-600 text-white"
              )}
              title={STRINGS.viewport.invertLut}
              aria-label={STRINGS.viewport.invertLut}
              aria-pressed={viewport.invert}
            >
              <FlipHorizontal2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setShowAdjustments(!showAdjustments)}
              className={cn(
                "p-1.5 rounded text-slate-300 hover:text-white hover:bg-white/10 transition-colors",
                showAdjustments && "bg-slate-700 text-white"
              )}
              title={STRINGS.viewport.toggleAdjustments}
              aria-label={STRINGS.viewport.toggleAdjustments}
              aria-expanded={showAdjustments}
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={resetViewport}
              className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title={STRINGS.viewport.resetViewport}
              aria-label={STRINGS.viewport.resetViewport}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {onToggleHeatmap && isComplete && (
              <>
                <div className="w-px h-3.5 bg-white/20 mx-0.5" />
                <button
                  type="button"
                  onClick={onToggleHeatmap}
                  className={cn(
                    "p-1.5 rounded transition-colors",
                    isHeatmapActive
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "text-slate-300 hover:text-white hover:bg-white/10"
                  )}
                  title={STRINGS.viewport.toggleHeatmap}
                  aria-label={STRINGS.viewport.toggleHeatmap}
                  aria-pressed={isHeatmapActive}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            <div className="w-px h-3.5 bg-white/20 mx-0.5" />
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title={STRINGS.viewport.toggleFullscreen}
              aria-label={STRINGS.viewport.toggleFullscreen}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {/* Anatomical Orientation Markers */}
        {hasImage && (
          <>
            <span className="absolute top-2 left-2.5 z-10 text-[10px] font-mono text-white/40 select-none font-bold">A</span>
            <span className="absolute bottom-2 left-2.5 z-10 text-[10px] font-mono text-white/40 select-none font-bold">P</span>
            <span className="absolute top-2 left-7 z-10 text-[10px] font-mono text-white/40 select-none font-bold">L</span>
            <span className="absolute top-2 right-14 z-10 text-[10px] font-mono text-white/40 select-none font-bold">R</span>
          </>
        )}

        {/* User Image Display */}
        {hasImage ? (
          <div
            className="w-full h-full flex items-center justify-center p-2 overflow-hidden relative"
            style={{ transform: `scale(${viewport.zoom})`, transition: "transform 0.15s ease" }}
          >
            <img
              src={previewUrl!}
              alt="Patient radiographic scan"
              className="max-h-full max-w-full object-contain select-none"
              style={{ filter: imageFilter }}
            />

            {/* Grad-CAM / Saliency Activation Heatmap Overlay */}
            {isHeatmapActive && (
              <div
                className="absolute inset-0 pointer-events-none flex items-center justify-center"
                aria-hidden="true"
              >
                <div
                  className="w-48 h-48 rounded-full blur-2xl opacity-70 animate-pulse"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(239,68,68,0.85) 0%, rgba(245,158,11,0.65) 45%, rgba(59,130,246,0.3) 75%, transparent 100%)",
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          /* Empty Drag & Drop Ingestion Zone */
          <div
            className={cn(
              "w-full h-full flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all",
              isDragOver ? "bg-clinical-50/70 border-2 border-clinical-600" : "hover:bg-slate-100/70"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            tabIndex={0}
            role="button"
            aria-label={STRINGS.viewport.dropzoneTitle}
          >
            <div className="w-12 h-12 rounded-full bg-clinical-50 text-clinical-600 flex items-center justify-center mb-3 shadow-2xs">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-[13px] font-bold text-slate-800">
              {STRINGS.viewport.dropzoneTitle}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
              {STRINGS.viewport.supportedFormatsNotice}
            </p>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[12px] font-bold bg-clinical-600 hover:bg-clinical-700 text-white shadow-xs transition-all active:scale-[0.98]"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{STRINGS.viewport.chooseFileButton}</span>
            </button>
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-30 animate-fade-in">
            <Loader2 className="w-8 h-8 text-clinical-400 animate-spin" />
            <p className="text-[12px] text-slate-200 font-bold">{STRINGS.viewport.analyzingPrompt}</p>
            <p className="text-[10px] text-slate-400">{STRINGS.viewport.analyzingSubtext}</p>
          </div>
        )}

        {/* Zoom Ratio Indicator */}
        {hasImage && (
          <div className="absolute bottom-2 right-2.5 z-10 text-[9px] font-mono text-white/50 select-none">
            {(viewport.zoom * 100).toFixed(0)}%
          </div>
        )}
      </div>

      {/* ── Collapsible Brightness & Contrast Controls ── */}
      {hasImage && showAdjustments && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5 animate-fade-in">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-slate-500" />
              {STRINGS.viewport.brightnessLabel}
            </span>
            <span className="font-mono text-slate-500 text-[10px]">{viewport.brightness}%</span>
          </div>
          <input
            type="range"
            min={30}
            max={180}
            value={viewport.brightness}
            onChange={(e) => updateViewport({ brightness: Number(e.target.value) })}
            className="clinical-slider"
            aria-label={STRINGS.viewport.brightnessLabel}
          />

          <div className="flex items-center justify-between text-[11px] pt-1">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Contrast className="w-3.5 h-3.5 text-slate-500" />
              {STRINGS.viewport.contrastLabel}
            </span>
            <span className="font-mono text-slate-500 text-[10px]">{viewport.contrast}%</span>
          </div>
          <input
            type="range"
            min={30}
            max={180}
            value={viewport.contrast}
            onChange={(e) => updateViewport({ contrast: Number(e.target.value) })}
            className="clinical-slider"
            aria-label={STRINGS.viewport.contrastLabel}
          />
        </div>
      )}

      {/* ── Ingested File Metadata Pill ── */}
      {uploadedFileName && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-[11px]">
          <div className="flex items-center gap-2 truncate">
            <ImageIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="font-medium text-slate-700 truncate">{uploadedFileName}</span>
          </div>
          {uploadedFileSize && (
            <span className="font-mono text-[10px] text-slate-400 flex-shrink-0">
              {formatFileSize(uploadedFileSize)}
            </span>
          )}
        </div>
      )}

      {/* ── Primary Diagnostic Action Execution Button ── */}
      <button
        type="button"
        onClick={onRunDiagnostic}
        disabled={!hasImage || isLoading}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold text-[13px] transition-all shadow-xs",
          hasImage && !isLoading
            ? "bg-clinical-600 hover:bg-clinical-700 text-white active:scale-[0.99] cursor-pointer"
            : "bg-slate-100 text-slate-400 border border-slate-300 cursor-not-allowed opacity-60"
        )}
        aria-disabled={!hasImage || isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{STRINGS.viewport.analyzingPrompt}</span>
          </>
        ) : isComplete ? (
          <>
            <CheckCircle2 className="w-4 h-4" />
            <span>{STRINGS.viewport.reRunDiagnostic}</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            <span>{STRINGS.viewport.runDiagnostic}</span>
          </>
        )}
      </button>

      {/* Accessible File Input */}
      <input
        id="patient-scan-file-input"
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_FILE_ATTR}
        className="sr-only"
        onChange={handleFileInput}
        aria-label="Select radiologic scan file"
      />
    </div>
  );
}
