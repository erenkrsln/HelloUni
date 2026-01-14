"use client";

import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { getCroppedImg } from "@/lib/utils/crop-image";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogOverlay,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface HeaderImageCropModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageSrc: string;
    onCropComplete: (croppedImageBlob: Blob) => void;
    isUploading?: boolean;
    className?: string;
}

export function HeaderImageCropModal({
    isOpen,
    onClose,
    imageSrc,
    onCropComplete,
    isUploading = false,
    className,
}: HeaderImageCropModalProps) {
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
            croppedAreaPixels: { x: number; y: number; width: number; height: number }
        ) => {
            setCroppedAreaPixels(croppedAreaPixels);
        },
        []
    );

    const handleApply = async () => {
        if (!croppedAreaPixels || isProcessing || isUploading) return;

        setIsProcessing(true);
        try {
            const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
            onCropComplete(croppedBlob);
            // Don't reset isProcessing here - it will be handled by isUploading state
            // Keep processing state until upload completes
        } catch (error) {
            console.error("Error cropping image:", error);
            alert("Fehler beim Zuschneiden des Bildes");
            setIsProcessing(false);
        }
    };

    // Reset processing state when upload completes
    React.useEffect(() => {
        if (!isUploading && isProcessing) {
            setIsProcessing(false);
        }
    }, [isUploading, isProcessing]);

    const handleCancel = () => {
        // Reset state
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
        onClose();
    };

    // Set z-index for overlay and content when used in drawer
    React.useEffect(() => {
        if (className && isOpen) {
            const setZIndex = () => {
                // Find overlay and content elements by various selectors
                const overlays = document.querySelectorAll('[data-radix-dialog-overlay], [class*="Overlay"]');
                const contents = document.querySelectorAll('[data-radix-dialog-content], [class*="Content"]');
                
                overlays.forEach((overlay) => {
                    const el = overlay as HTMLElement;
                    el.style.zIndex = '70';
                    el.style.setProperty('z-index', '70', 'important');
                });
                
                contents.forEach((content) => {
                    const el = content as HTMLElement;
                    el.style.zIndex = '70';
                    el.style.setProperty('z-index', '70', 'important');
                });
            };
            
            // Set immediately and also after delays to catch portal rendering
            setZIndex();
            const timeout1 = setTimeout(setZIndex, 50);
            const timeout2 = setTimeout(setZIndex, 200);
            
            // Also use MutationObserver to catch when elements are added
            const observer = new MutationObserver(() => {
                setZIndex();
            });
            observer.observe(document.body, { childList: true, subtree: true });
            
            return () => {
                clearTimeout(timeout1);
                clearTimeout(timeout2);
                observer.disconnect();
            };
        }
    }, [className, isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={handleCancel}>
            <DialogContent 
                className={`max-w-2xl w-[90vw] p-0 overflow-hidden ${className ? "!z-[70]" : ""}`}
                style={className ? { zIndex: 70 } : undefined}
            >
                <DialogHeader className="p-3 pb-2 border-b">
                    <DialogTitle className="text-base font-semibold">
                        Titelbild bearbeiten
                    </DialogTitle>
                </DialogHeader>

                {/* Crop Area */}
                <div className="relative w-full bg-black" style={{ height: "40vh", minHeight: "300px" }}>
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={3 / 1}
                        onCropChange={onCropChange}
                        onZoomChange={onZoomChange}
                        onCropComplete={onCropCompleteCallback}
                        objectFit="horizontal-cover"
                        showGrid={false}
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

                {/* Controls */}
                <div className="p-3 space-y-3 bg-white">
                    {/* Zoom Slider - Desktop only */}
                    <div className="hidden sm:block">
                        <label className="text-sm font-medium mb-2 block">Zoom</label>
                        <Slider
                            value={[zoom]}
                            onValueChange={(values: number[]) => setZoom(values[0])}
                            min={1}
                            max={3}
                            step={0.1}
                            className="w-full"
                        />
                    </div>

                    {/* Mobile hint */}
                    <p className="sm:hidden text-xs text-gray-500 text-center">
                        Pinch to zoom • Drag to reposition
                    </p>

                    {/* Action Buttons */}
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
