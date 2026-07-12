"use client";

import { X, Shell, FileText, Shield } from "lucide-react";
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
                    aria-hidden="true"
                    className="fixed inset-0 bg-black/50 z-[75] transition-opacity"
                    onClick={onClose}
                    style={{
                        opacity: isOpen ? 1 : 0,
                        pointerEvents: isOpen ? "auto" : "none"
                    }}
                />
            )}

            {/* Sidebar Container - Slides from LEFT */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Hauptmenü"
                className="fixed top-0 left-0 bottom-0 w-80 bg-background z-[80] shadow-2xl transition-transform duration-300 ease-in-out"
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

                    {/* Branding Section */}
                    <div className="flex items-center justify-between pb-6 border-b border-border mb-6">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="w-12 h-12 flex-shrink-0">
                                <img
                                    src="/logo2.svg"
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
                            <div className="flex flex-col flex-1 min-w-0">
                                <h2 className="text-lg font-semibold text-foreground truncate">
                                    HelloUni
                                </h2>
                                <p className="text-sm text-muted-foreground truncate">
                                    Your Campus. Your People.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-accent transition-colors ml-2 flex-shrink-0"
                            aria-label="Sidebar schließen"
                        >
                            <X className="w-6 h-6 text-foreground" />
                        </button>
                    </div>

                    {/* Menu Items */}
                    <nav className="flex-1 flex flex-col gap-2" aria-label="Seitenmenü">
                        <Link
                            href="/about"
                            onClick={onClose}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#D08945]/10 active:bg-[#D08945]/20 focus:bg-[#D08945]/10 focus:outline-none focus:ring-2 focus:ring-[#D08945]/50 transition-colors text-foreground text-left"
                        >
                            <Shell aria-hidden="true" className="w-5 h-5 text-[#D08945] flex-shrink-0" />
                            <span>Über Uns</span>
                        </Link>

                        <Link
                            href="/imprint"
                            onClick={onClose}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#D08945]/10 active:bg-[#D08945]/20 focus:bg-[#D08945]/10 focus:outline-none focus:ring-2 focus:ring-[#D08945]/50 transition-colors text-foreground text-left"
                        >
                            <FileText aria-hidden="true" className="w-5 h-5 text-[#D08945] flex-shrink-0" />
                            <span>Impressum</span>
                        </Link>

                        <Link
                            href="/privacy"
                            onClick={onClose}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#D08945]/10 active:bg-[#D08945]/20 focus:bg-[#D08945]/10 focus:outline-none focus:ring-2 focus:ring-[#D08945]/50 transition-colors text-foreground text-left"
                        >
                            <Shield aria-hidden="true" className="w-5 h-5 text-[#D08945] flex-shrink-0" />
                            <span>Datenschutz</span>
                        </Link>
                    </nav>
                </div>
            </div>
        </>
    );
}
