"use client";

import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { ZoomIn, ZoomOut, RotateCcw, ArrowLeft } from "lucide-react";
import { getCroppedImg } from "@/lib/utils/crop-image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedImageBlob: Blob) => void;
  isUploading?: boolean;
  className?: string;
  /** Seitenverhältnis des Zuschnitts. Standard: 3/1 (Titelbild) */
  aspect?: number;
  /** Form des Zuschnittbereichs. "round" für Avatare. Standard: "rect" */
  cropShape?: "rect" | "round";
  /** Form auf Mobilgeräten (< 640px). Falls gesetzt, überschreibt sie cropShape auf dem Handy. */
  cropShapeMobile?: "rect" | "round";
  /** Titel des Dialogs. Standard: "Titelbild bearbeiten" */
  title?: string;
  /** Visuelles Design. "twitter" = dunkles Theme im Twitter-Stil. Standard: "default" */
  variant?: "default" | "twitter";
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

export function ImageCropModal({
  isOpen,
  onClose,
  imageSrc,
  onCropComplete,
  isUploading = false,
  className,
  aspect = 3 / 1,
  cropShape = "rect",
  cropShapeMobile,
  title = "Titelbild bearbeiten",
  variant = "default",
}: ImageCropModalProps) {
  // Auf dem Handy (< 640px) ggf. eine andere Crop-Form verwenden (z. B. Kreis)
  const [isMobile, setIsMobile] = useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const effectiveCropShape =
    isMobile && cropShapeMobile ? cropShapeMobile : cropShape;
  const isRound = effectiveCropShape === "round";
  const isTwitter = variant === "twitter";

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = useCallback((location: { x: number; y: number }) => {
    setCrop(location);
  }, []);

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom);
  }, []);

  const onCropCompleteCallback = useCallback(
    (
      _croppedArea: { x: number; y: number; width: number; height: number },
      croppedAreaPixels: {
        x: number;
        y: number;
        width: number;
        height: number;
      },
    ) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    [],
  );

  const clampZoom = (value: number) =>
    Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 10) / 10));

  const handleApply = async () => {
    if (!croppedAreaPixels || isProcessing || isUploading) return;

    setIsProcessing(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedBlob);
    } catch (error) {
      console.error("Error cropping image:", error);
      alert("Fehler beim Zuschneiden des Bildes");
      setIsProcessing(false);
    }
  };

  // Verarbeitungsstatus zurücksetzen, wenn der Upload abgeschlossen ist
  React.useEffect(() => {
    if (!isUploading && isProcessing) {
      setIsProcessing(false);
    }
  }, [isUploading, isProcessing]);

  const resetView = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleCancel = () => {
    // State zurücksetzen
    resetView();
    setCroppedAreaPixels(null);
    onClose();
  };

  const isBusy = isProcessing || isUploading;

  // Twitter-Stil: dunkles Theme, Zurück-Pfeil, "Anwenden"-Pill, blauer Crop-Rahmen
  if (isTwitter) {
    return (
      <Dialog open={isOpen} onOpenChange={handleCancel}>
        <DialogContent
          hideCloseButton
          className={`max-w-lg w-[92vw] p-0 overflow-hidden rounded-2xl border border-border bg-background text-foreground ${className ?? ""}`}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-5 min-w-0">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isBusy}
                aria-label="Zurück"
                className="flex-shrink-0 text-foreground transition-opacity hover:opacity-70 disabled:opacity-50"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <DialogTitle className="truncate text-lg font-bold text-foreground">
                {title}
              </DialogTitle>
            </div>
            <button
              type="button"
              onClick={handleApply}
              disabled={isBusy}
              className="flex-shrink-0 rounded-full bg-[#D08945] px-4 py-1.5 text-sm font-bold text-white transition-colors hover:bg-[#C07835] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBusy ? "..." : "Anwenden"}
            </button>
          </div>

          <div className="px-4">
            <div
              className="relative w-full overflow-hidden rounded-xl bg-muted"
              style={{ height: "min(70vw, 440px)", minHeight: "300px" }}
            >
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                minZoom={MIN_ZOOM}
                maxZoom={MAX_ZOOM}
                aspect={aspect}
                cropShape={effectiveCropShape}
                onCropChange={onCropChange}
                onZoomChange={onZoomChange}
                onCropComplete={onCropCompleteCallback}
                objectFit={isRound ? "cover" : "horizontal-cover"}
                showGrid={false}
                restrictPosition
                style={{
                  containerStyle: {
                    width: "100%",
                    height: "100%",
                    backgroundColor: "#f3f4f6",
                  },
                  cropAreaStyle: {
                    border: "3px solid #D08945",
                    boxShadow: "0 0 0 9999em rgba(0, 0, 0, 0.45)",
                    color: "rgba(0, 0, 0, 0.45)",
                  },
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 px-6 py-5">
            <ZoomOut className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <SliderPrimitive.Root
              value={[zoom]}
              onValueChange={(values: number[]) => setZoom(values[0])}
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={ZOOM_STEP}
              disabled={isBusy}
              className="relative flex w-full touch-none select-none items-center"
            >
              <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-accent">
                <SliderPrimitive.Range className="absolute h-full bg-[#D08945]" />
              </SliderPrimitive.Track>
              <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full bg-[#D08945] shadow-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D08945] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
            </SliderPrimitive.Root>
            <ZoomIn className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent
        className={`p-0 overflow-hidden max-w-[560px] ${className ?? ""}`}
      >
        <DialogHeader className="p-4 pb-3 border-b">
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
        </DialogHeader>

        {/* Crop-Bereich */}
        <div
          className="relative w-full bg-black"
          style={{
            height: isRound ? "min(58vh, 420px)" : "40vh",
            minHeight: isRound ? "320px" : "300px",
          }}
        >
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            aspect={aspect}
            cropShape={cropShape}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropCompleteCallback}
            objectFit={isRound ? "cover" : "horizontal-cover"}
            showGrid={!isRound}
            restrictPosition
            style={{
              containerStyle: {
                width: "100%",
                height: "100%",
              },
              cropAreaStyle: {
                border: "2px solid #fff",
                boxShadow: "0 0 0 9999em rgba(0, 0, 0, 0.5)",
              },
            }}
          />
        </div>

        {/* Steuerung */}
        <div className="p-4 space-y-3 bg-background">
          {/* Zoom-Slider mit Buttons – nur Desktop */}
          <div className="hidden sm:block">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Zoom</label>
              <button
                type="button"
                onClick={resetView}
                disabled={isProcessing || isUploading}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Zurücksetzen
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
                disabled={isProcessing || isUploading || zoom <= MIN_ZOOM}
                className="flex-shrink-0 p-1.5 rounded-md text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                aria-label="Verkleinern"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <Slider
                value={[zoom]}
                onValueChange={(values: number[]) => setZoom(values[0])}
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={ZOOM_STEP}
                className="w-full"
              />
              <button
                type="button"
                onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
                disabled={isProcessing || isUploading || zoom >= MAX_ZOOM}
                className="flex-shrink-0 p-1.5 rounded-md text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                aria-label="Vergrößern"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground text-center">
              Mit dem Mausrad zoomen · zum Verschieben ziehen
            </p>
          </div>

          {/* Hinweis – nur Mobil */}
          <p className="sm:hidden text-xs text-muted-foreground text-center">
            Zum Zoomen zusammenziehen · zum Verschieben ziehen
          </p>

          {/* Aktions-Buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isProcessing || isUploading}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={handleApply}
              disabled={isProcessing || isUploading}
              className="bg-[#D08945] hover:bg-[#C07835] text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing || isUploading ? "Wird verarbeitet..." : "Anwenden"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Rückwärtskompatibler Alias – bestehende Aufrufe für das Titelbild (3:1) bleiben unverändert.
 */
export const HeaderImageCropModal = ImageCropModal;
