"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, X, Download, ExternalLink } from "lucide-react";

interface ChatFilesModalProps {
    isOpen: boolean;
    onClose: () => void;
    conversationId: Id<"conversations">;
    currentUserId: Id<"users">;
}

export function ChatFilesModal({ isOpen, onClose, conversationId, currentUserId }: ChatFilesModalProps) {
    const files = useQuery(api.queries.getConversationFiles, { conversationId, userId: currentUserId });
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className={selectedImage
                ? "w-[100vw] h-[100vh] max-w-none p-0 border-none bg-black/95 flex items-center justify-center overflow-hidden"
                : "w-[90vw] sm:w-[80vw] max-w-[600px] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl bg-white"
            }>
                {selectedImage ? (
                    <div className="relative w-full h-full flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
                        <button
                            className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 z-50"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImage(null);
                            }}
                        >
                            <X size={32} />
                        </button>
                        <img
                            src={selectedImage}
                            alt="Vorschau"
                            className="max-w-full max-h-full object-contain"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                ) : (
                    <>
                        <div className="p-4 border-b flex items-center justify-between bg-white z-10">
                            <DialogTitle className="text-lg font-bold">Geteilte Dateien</DialogTitle>
                            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 bg-[#FDFBF7]">
                            {!files ? (
                                <div className="text-center text-gray-400 py-8">Lade Dateien...</div>
                            ) : files.length === 0 ? (
                                <div className="text-center text-gray-400 py-8">Keine Dateien geteilt.</div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {files.map((file) => (
                                        <div
                                            key={file._id}
                                            className="bg-white rounded-lg shadow-sm border border-[#efeadd] overflow-hidden flex flex-col hover:shadow-md transition-shadow cursor-pointer block text-left"
                                            onClick={() => {
                                                if (file.type === "image" && file.url) {
                                                    setSelectedImage(file.url);
                                                } else if (file.url) {
                                                    window.open(file.url, '_blank');
                                                }
                                            }}
                                        >
                                            <div className="w-full pt-[100%] relative bg-gray-100 overflow-hidden">
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    {file.type === "image" && file.url ? (
                                                        <img
                                                            src={file.url}
                                                            alt={file.fileName || "Bild"}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <FileText size={40} className="text-[#8C531E] opacity-50" />
                                                    )}
                                                </div>
                                            </div>
                                            <div className="p-2 border-t border-[#efeadd]">
                                                <div className="w-full">
                                                    <p className="text-xs font-medium truncate text-gray-700" title={file.fileName}>
                                                        {file.fileName || (file.type === "image" ? "Bild" : "Dokument")}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400">
                                                        {new Date(file.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
