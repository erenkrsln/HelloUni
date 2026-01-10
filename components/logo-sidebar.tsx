"use client";

import { X, Info, FileText, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

interface LogoSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function LogoSidebar({ isOpen, onClose }: LogoSidebarProps) {
    const router = useRouter();

    // Body-Lock: Prevent scrolling when sidebar is open
    useEffect(() => {
        if (isOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = "hidden";

            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [isOpen]);

    return (
        <>
            {/* Overlay - Full-bleed */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-[55] transition-opacity"
                    onClick={onClose}
                    style={{
                        opacity: isOpen ? 1 : 0,
                        pointerEvents: isOpen ? "auto" : "none"
                    }}
                />
            )}

            {/* Sidebar Container - Slides from LEFT */}
            <div
                className="fixed top-0 left-0 bottom-0 w-80 bg-white z-[60] shadow-2xl transition-transform duration-300 ease-in-out"
                style={{
                    transform: isOpen ? "translateX(0)" : "translateX(-100%)",
                    willChange: "transform",
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                }}
            >
                {/* Inner Content Wrapper with Safe Area Padding */}
                <div
                    className="flex flex-col h-full overflow-y-auto"
                    style={{
                        paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))",
                        paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
                        paddingLeft: "calc(1rem + env(safe-area-inset-left, 0px))",
                        paddingRight: "calc(1rem + env(safe-area-inset-right, 0px))",
                        WebkitOverflowScrolling: "touch",
                        overflowY: "auto",
                    }}
                >
                    {/* Header Section: Close Button */}
                    <div className="flex justify-end p-2">
                        <button
                            onClick={onClose}
                            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors"
                            aria-label="Close sidebar"
                        >
                            <X className="w-6 h-6 text-black" />
                        </button>
                    </div>

                    {/* Branding Section */}
                    <div className="flex flex-col items-center justify-center pt-2 pb-10 border-b border-gray-100 mx-4">
                        <div className="w-24 h-24 mb-4 relative">
                            <img
                                src="/logo.svg"
                                alt="HelloUni Logo"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = "none";
                                    if (target.parentElement) {
                                        target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center text-4xl font-bold">C</div>';
                                    }
                                }}
                            />
                        </div>
                        <h1 className="text-2xl font-bold text-black mb-1" style={{ fontFamily: 'var(--font-poppins), sans-serif' }}>
                            HelloUni
                        </h1>
                        <p className="text-sm text-gray-500 font-medium">
                            Social Media für Studierende
                        </p>
                    </div>

                    {/* Menu Items */}
                    <div className="flex-1 flex flex-col gap-2 p-4">
                        <Link
                            href="/about"
                            onClick={onClose}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 active:bg-transparent focus:bg-transparent transition-colors text-black text-left"
                        >
                            <Info className="w-5 h-5 text-gray-600 flex-shrink-0" />
                            <span className="font-medium">Über Uns</span>
                        </Link>

                        <Link
                            href="/imprint"
                            onClick={onClose}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 active:bg-transparent focus:bg-transparent transition-colors text-black text-left"
                        >
                            <FileText className="w-5 h-5 text-gray-600 flex-shrink-0" />
                            <span className="font-medium">Impressum</span>
                        </Link>

                        <Link
                            href="/privacy"
                            onClick={onClose}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 active:bg-transparent focus:bg-transparent transition-colors text-black text-left"
                        >
                            <Shield className="w-5 h-5 text-gray-600 flex-shrink-0" />
                            <span className="font-medium">Datenschutz</span>
                        </Link>
                    </div>

                    {/* Footer Section (optional) */}
                    <div className="p-4 text-center text-xs text-gray-400 mt-auto">
                        &copy; {new Date().getFullYear()} HelloUni
                    </div>

                </div>
            </div>
        </>
    );
}
