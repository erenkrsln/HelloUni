"use client";

import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { getCroppedImg } from "@/lib/utils/crop-image";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface HeaderImageCropModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageSrc: string;
    onCropComplete: (croppedImageBlob: Blob) => void;
}

export function HeaderImageCropModal({
    isOpen,
    onClose,
    imageSrc,
    onCropComplete,
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
        if (!croppedAreaPixels) return;

        setIsProcessing(true);
        try {
            const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
            onCropComplete(croppedBlob);
        } catch (error) {
            console.error("Error cropping image:", error);
            alert("Fehler beim Zuschneiden des Bildes");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCancel = () => {
        // Reset state
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleCancel}>
            <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden">
                <DialogHeader className="p-4 pb-2 border-b">
                    <DialogTitle className="text-lg font-semibold">
                        Titelbild bearbeiten
                    </DialogTitle>
                </DialogHeader>

                {/* Crop Area */}
                <div className="relative w-full bg-black" style={{ height: "60vh", minHeight: "400px" }}>
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
                <div className="p-4 space-y-4 bg-white">
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
                            disabled={isProcessing}
                        >
                            Abbrechen
                        </Button>
                        <Button
                            type="button"
                            onClick={handleApply}
                            disabled={isProcessing}
                            className="bg-[#D08945] hover:bg-[#C07835] text-white"
                        >
                            {isProcessing ? "Wird verarbeitet..." : "Anwenden"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
