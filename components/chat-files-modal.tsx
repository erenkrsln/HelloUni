"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, X, Download, ExternalLink, Image } from "lucide-react";

interface ChatFilesModalProps {
    isOpen: boolean;
    onClose: () => void;
    conversationId: Id<"conversations">;
    currentUserId: Id<"users">;
}

export function ChatFilesModal({ isOpen, onClose, conversationId, currentUserId }: ChatFilesModalProps) {
    const files = useQuery(api.queries.getConversationFiles, { conversationId, userId: currentUserId });
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"images" | "pdfs" | "links">("images");

    // Separate and sort files by type
    const imageFiles = files?.filter(f => f.type === "image").sort((a, b) => b.createdAt - a.createdAt) || [];
    const pdfFiles = files?.filter(f => f.type === "pdf").sort((a, b) => b.createdAt - a.createdAt) || [];
    const linkFiles = files?.filter(f => f.type === "link").sort((a, b) => b.createdAt - a.createdAt) || [];

    // Group files by date
    const groupFilesByDate = (fileList: typeof files) => {
        if (!fileList) return {};

        const grouped: Record<string, typeof fileList> = {};
        fileList.forEach(file => {
            const date = new Date(file.createdAt).toLocaleDateString('de-DE', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(file);
        });
        return grouped;
    };

    const groupedImages = groupFilesByDate(imageFiles);
    const groupedPdfs = groupFilesByDate(pdfFiles);
    const groupedLinks = groupFilesByDate(linkFiles);

    const currentFiles = activeTab === "images" ? groupedImages : activeTab === "pdfs" ? groupedPdfs : groupedLinks;
    const currentCount = activeTab === "images" ? imageFiles.length : activeTab === "pdfs" ? pdfFiles.length : linkFiles.length;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className={selectedImage
                ? "w-[100vw] h-[100vh] max-w-none p-0 border-none bg-black/95 flex items-center justify-center overflow-hidden"
                : "w-[90vw] sm:w-[80vw] max-w-[600px] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl bg-white"
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
                            <DialogTitle className="text-lg font-bold">Geteilte Medien</DialogTitle>
                            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b bg-white">
                            <button
                                onClick={() => setActiveTab("images")}
                                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "images"
                                    ? "text-[#8C531E] border-b-2 border-[#8C531E]"
                                    : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                Bilder
                            </button>
                            <button
                                onClick={() => setActiveTab("pdfs")}
                                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "pdfs"
                                    ? "text-[#8C531E] border-b-2 border-[#8C531E]"
                                    : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                PDFs
                            </button>
                            <button
                                onClick={() => setActiveTab("links")}
                                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "links"
                                    ? "text-[#8C531E] border-b-2 border-[#8C531E]"
                                    : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                Links
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 bg-[#FDFBF7]">
                            {!files ? (
                                <div className="text-center text-gray-400 py-8">Lade Dateien...</div>
                            ) : currentCount === 0 ? (
                                <div className="text-center text-gray-400 py-8">
                                    Keine {activeTab === "images" ? "Bilder" : activeTab === "pdfs" ? "PDFs" : "Links"} geteilt.
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {Object.entries(currentFiles).map(([date, filesForDate]) => (
                                        <div key={date}>
                                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                                {date}
                                            </h3>
                                            <div className={activeTab === "links" ? "space-y-2" : "grid grid-cols-2 sm:grid-cols-3 gap-4"}>
                                                {filesForDate.map((file) => (
                                                    <div
                                                        key={file._id}
                                                        className={`bg-white rounded-lg shadow-sm border border-[#efeadd] overflow-hidden flex transition-shadow cursor-pointer hover:shadow-md ${activeTab === "links" ? "flex-row items-center p-3" : "flex-col"}`}
                                                        onClick={() => {
                                                            if (file.type === "image" && file.url) {
                                                                setSelectedImage(file.url);
                                                            } else if (file.url) {
                                                                window.open(file.url, '_blank');
                                                            }
                                                        }}
                                                    >
                                                        {activeTab === "links" ? (
                                                            <>
                                                                <div className="w-10 h-10 rounded-lg bg-[#f6efe4] flex items-center justify-center text-[#8C531E] mr-3 flex-shrink-0">
                                                                    <ExternalLink size={20} />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-gray-900 truncate" title={file.url}>
                                                                        {file.url}
                                                                    </p>
                                                                    <p className="text-[10px] text-gray-400">
                                                                        {new Date(file.createdAt).toLocaleTimeString('de-DE', {
                                                                            hour: '2-digit',
                                                                            minute: '2-digit'
                                                                        })}
                                                                    </p>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <>
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
                                                                            {new Date(file.createdAt).toLocaleTimeString('de-DE', {
                                                                                hour: '2-digit',
                                                                                minute: '2-digit'
                                                                            })}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
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
