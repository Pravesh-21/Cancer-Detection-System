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
      className="clinical-card p-5 space-y-4 overflow-hidden"
      role="region"
      aria-label={STRINGS.viewport.title}
    >
      {/* Top Card Color Accent Line */}
      <div className="h-[3px] bg-gradient-to-r from-[#0F74C9] via-[#0E9F8E] to-transparent -mx-5 -mt-5 mb-4 rounded-t-[16px]" />

      {/* ── Viewport Header: Dark & Light Contrast ── */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-[#0B2239] to-[#07131F] border border-[#16385C] flex items-center justify-center text-[#38BDF8] shadow-xs flex-shrink-0">
            <ImageIcon className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-[16px] font-bold text-[#0B2239] tracking-tight">
            Radiological Scan Viewport
          </h2>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F74C9] bg-[#EBF4FC] border border-[#BAE6FD] px-2 py-0.5 rounded-[6px]">
            PACS Display
          </span>
        </div>

        {hasImage && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-semibold text-[#0F74C9] bg-[#F3F8FB] border border-[#DCE8F0] hover:bg-[#E8F2FA] transition-colors cursor-pointer"
              aria-label={STRINGS.viewport.replaceButton}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{STRINGS.viewport.replaceButton}</span>
            </button>
            <button
              type="button"
              onClick={onClearImage}
              className="p-2 rounded-[10px] text-[#7A91A6] hover:text-[#C8353B] hover:bg-[#FDF2F2] transition-colors cursor-pointer"
              title={STRINGS.viewport.removeButton}
              aria-label={STRINGS.viewport.removeButton}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Validation Alert */}
      {validationError && (
        <div className="p-3 rounded-[10px] bg-[#FDF2F2] border border-[#F8B4B7] text-[#C8353B] text-[12px] font-medium animate-fade-rise">
          {validationError}
        </div>
      )}

      {/* ── Radiography Viewport / Drag & Drop Zone ── */}
      <div
        className={cn(
          "relative radiograph-viewer overflow-hidden w-full flex items-center justify-center transition-all",
          isFullscreen
            ? "fixed inset-0 z-50 rounded-none border-none h-full w-full"
            : "h-[500px] min-h-[460px] lg:h-[560px]"
        )}
        style={{ backgroundColor: "#07131F" }}
        ref={viewerRef}
        tabIndex={0}
        role="figure"
        aria-label="Patient Radiographic Scan Viewport"
      >
        {/* HUD Viewport Controls (Visible when image is loaded) */}
        {hasImage && (
          <div
            className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-[#0B2239]/90 backdrop-blur-md rounded-[10px] p-1 border border-white/10 shadow-lg"
            role="toolbar"
            aria-label="Image manipulation tools"
          >
            <button
              type="button"
              onClick={() => updateViewport({ zoom: Math.min(viewport.zoom + 0.2, 3) })}
              className="p-1.5 rounded-[8px] text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Zoom In (+)"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => updateViewport({ zoom: Math.max(viewport.zoom - 0.2, 0.6) })}
              className="p-1.5 rounded-[8px] text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Zoom Out (-)"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => updateViewport({ invert: !viewport.invert })}
              className={cn(
                "p-1.5 rounded-[8px] text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer",
                viewport.invert && "bg-[#0F74C9] text-white"
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
                "p-1.5 rounded-[8px] text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer",
                showAdjustments && "bg-white/20 text-white"
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
              className="p-1.5 rounded-[8px] text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
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
                    "p-1.5 rounded-[8px] transition-colors cursor-pointer",
                    isHeatmapActive
                      ? "bg-[#C98A0A] text-[#07131F] font-bold"
                      : "text-white/70 hover:text-white hover:bg-white/10"
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
              className="p-1.5 rounded-[8px] text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
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
            <span className="absolute top-3 left-3 z-10 text-[11px] font-mono text-white/40 select-none font-bold">A</span>
            <span className="absolute bottom-3 left-3 z-10 text-[11px] font-mono text-white/40 select-none font-bold">P</span>
            <span className="absolute top-3 left-8 z-10 text-[11px] font-mono text-white/40 select-none font-bold">L</span>
            <span className="absolute top-3 right-16 z-10 text-[11px] font-mono text-white/40 select-none font-bold">R</span>
          </>
        )}

        {/* User Image Display */}
        {hasImage ? (
          <div
            className="w-full h-full flex items-center justify-center p-3 overflow-hidden relative"
            style={{ transform: `scale(${viewport.zoom})`, transition: "transform 0.15s ease-out" }}
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
                  className="w-52 h-52 rounded-full blur-2xl opacity-75 animate-pulse"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(200,53,59,0.85) 0%, rgba(201,138,10,0.65) 45%, rgba(15,116,201,0.3) 75%, transparent 100%)",
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          /* Empty Drag & Drop Ingestion Zone: High contrast, readable, calm modern hospital feel */
          <div
            className={cn(
              "w-full h-full m-3 dropzone-container flex flex-col items-center justify-center p-8 text-center cursor-pointer",
              isDragOver && "is-dragover"
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
            <div className="w-14 h-14 rounded-[14px] bg-[#102A43] border border-[#244260] text-[#0E9F8E] flex items-center justify-center mb-4 shadow-sm transition-transform duration-200 hover:scale-105">
              <Upload className="w-7 h-7 text-[#0E9F8E]" />
            </div>

            {/* Title: High Contrast Crisp Cool White #F3F8FB (Fixes dark title on dark dropzone!) */}
            <h3 className="text-[18px] font-bold text-[#F3F8FB] tracking-tight leading-tight">
              {STRINGS.viewport.dropzoneTitle}
            </h3>

            {/* Subtext: Crisp Muted Blue-Gray #7A91A6 */}
            <p className="text-[13px] text-[#7A91A6] mt-1.5 max-w-md leading-relaxed font-normal">
              Drag and drop clinical scans here, or browse files from your workstation.
            </p>

            {/* Supported Formats Pills */}
            <div className="flex items-center gap-2 mt-4 text-[11px] font-mono text-[#DCE8F0] font-medium flex-wrap justify-center">
              <span className="px-2.5 py-1 rounded-[6px] bg-[#102A43] border border-[#244260]">DICOM (.dcm)</span>
              <span className="px-2.5 py-1 rounded-[6px] bg-[#102A43] border border-[#244260]">PNG</span>
              <span className="px-2.5 py-1 rounded-[6px] bg-[#102A43] border border-[#244260]">JPEG</span>
              <span className="px-2.5 py-1 rounded-[6px] bg-[#102A43] border border-[#244260]">TIFF</span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[13px] font-semibold bg-[#0F74C9] hover:bg-[#0A5BA8] text-white shadow-[0_1px_3px_rgba(15,116,201,0.3)] transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>{STRINGS.viewport.chooseFileButton}</span>
            </button>
          </div>
        )}

        {/* Teal Scan-Line Sweep Overlay (While Analysis Runs) */}
        {isLoading && (
          <>
            <div className="scanline-sweep-overlay" aria-hidden="true" />
            <div className="absolute inset-0 bg-[#07131F]/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-30 animate-fade-rise">
              <div className="w-12 h-12 rounded-full bg-[#0E9F8E]/10 border border-[#0E9F8E]/30 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-[#0E9F8E] animate-spin" />
              </div>
              <p className="text-[14px] text-[#F3F8FB] font-bold tracking-tight">
                {STRINGS.viewport.analyzingPrompt}
              </p>
              <p className="text-[12px] text-[#7A91A6]">
                {STRINGS.viewport.analyzingSubtext}
              </p>
            </div>
          </>
        )}

        {/* Zoom Ratio Indicator */}
        {hasImage && (
          <div className="absolute bottom-3 right-3 z-10 text-[10px] font-mono text-white/50 select-none">
            {(viewport.zoom * 100).toFixed(0)}%
          </div>
        )}
      </div>

      {/* ── Collapsible Brightness & Contrast Controls ── */}
      {hasImage && showAdjustments && (
        <div className="p-3.5 bg-[#F3F8FB] border border-[#DCE8F0] rounded-[10px] space-y-3 animate-fade-rise">
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-semibold text-[#0B2239] flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-[#7A91A6]" />
              {STRINGS.viewport.brightnessLabel}
            </span>
            <span className="font-mono text-[#3C566E] text-[11px]">{viewport.brightness}%</span>
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

          <div className="flex items-center justify-between text-[12px] pt-1">
            <span className="font-semibold text-[#0B2239] flex items-center gap-1.5">
              <Contrast className="w-3.5 h-3.5 text-[#7A91A6]" />
              {STRINGS.viewport.contrastLabel}
            </span>
            <span className="font-mono text-[#3C566E] text-[11px]">{viewport.contrast}%</span>
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
        <div className="flex items-center justify-between px-3.5 py-2 bg-[#F3F8FB] border border-[#DCE8F0] rounded-[10px] text-[12px]">
          <div className="flex items-center gap-2 truncate">
            <ImageIcon className="w-4 h-4 text-[#7A91A6] flex-shrink-0" />
            <span className="font-medium text-[#0B2239] truncate">{uploadedFileName}</span>
          </div>
          {uploadedFileSize && (
            <span className="font-mono text-[11px] text-[#7A91A6] flex-shrink-0">
              {formatFileSize(uploadedFileSize)}
            </span>
          )}
        </div>
      )}

      {/* ── Primary Diagnostic Action Execution Button ── */}
      <button
        type="button"
        onClick={onRunDiagnostic}
        disabled={isLoading || !hasImage}
        title={!hasImage ? "Upload scan first to run analysis" : undefined}
        className={cn(
          "w-full btn-clinical",
          hasImage && !isLoading
            ? "bg-gradient-to-r from-[#0F74C9] via-[#0284C7] to-[#0F74C9] hover:from-[#0A5BA8] hover:to-[#0284C7] text-white shadow-[0_2px_10px_rgba(15,116,201,0.28)]"
            : "bg-[#E6EFF5] text-[#7A91A6] border border-[#DCE8F0] cursor-not-allowed opacity-75"
        )}
        aria-disabled={isLoading || !hasImage}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>{STRINGS.viewport.analyzingPrompt}</span>
          </>
        ) : isComplete ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>{STRINGS.viewport.reRunDiagnostic}</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4 fill-white text-white" />
            <span>{hasImage ? STRINGS.viewport.runDiagnostic : "Upload Scan to Run Diagnostic"}</span>
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
