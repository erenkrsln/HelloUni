"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { LoadingScreen } from "@/components/ui/spinner";

export default function AboutPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    if (isLoading) {
        return (
            <main className="min-h-screen w-full max-w-[428px] mx-auto bg-white flex items-center justify-center">
                <LoadingScreen text="" />
            </main>
        );
    }

    return (
        <main className="min-h-screen w-full max-w-[428px] mx-auto bg-[#FAFAFA]">
            <header
                className="fixed top-0 left-0 right-0 w-full bg-white z-[70] pt-safe-top border-b border-gray-100"
                style={{
                    height: `calc(94px + env(safe-area-inset-top, 0px))`,
                    minHeight: `calc(94px + env(safe-area-inset-top, 0px))`
                }}
            >
                <div className="relative flex h-full w-full items-center px-4">
                    <button
                        onClick={() => router.back()}
                        className="absolute left-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label="Zurück"
                    >
                        <ArrowLeft className="w-6 h-6 text-black" />
                    </button>

                    <h1 className="flex-1 text-center text-3xl font-bold text-black">
                        Über Uns
                    </h1>
                </div>
            </header>

            {/* Content with padding for header */}
            <div className="pt-[110px] px-5 pb-10">
                <section className="mb-8 bg-white rounded-3xl shadow-sm p-6 border border-[#F4CFAB]/20 input-card">
                    <h2 className="text-2xl font-semibold mb-4 text-black text-center">Unsere Idee</h2>
                    <p className="text-gray-700 leading-relaxed mb-4 text-center">
                        Im digitalen Zeitalter sollte es leicht sein, neue Kontakte zu knüpfen und trotzdem fällt es vielen Studierenden überraschend schwer, wirklich anzukommen und Freundschaften zu finden.
                    </p>
                    <p className="text-gray-700 leading-relaxed mb-4 text-center">
                        Genau hier möchten wir mit unserem semesterübergreifendem Projekt HelloUni ansetzen: Wir bringen Studierende einer Hochschule gezielt zusammen, basierend auf Interessen, Studiengang und Hobbys.
                    </p>
                    <p className="text-gray-700 leading-relaxed text-center">
                        Kein Chaos, keine Anonymität. <br />
                        Stattdessen ein übersichtlicher Raum für Lerngruppen, Events, Sport, Projekte oder einfach neue Kontakte, denn ein gutes Studium lebt vor allem von den Menschen, die man dabei trifft.
                    </p>
                </section>

                <section className="bg-white rounded-3xl shadow-sm p-6 border border-[#F4CFAB]/20 input-card space-y-6">
                    <h2 className="text-2xl font-semibold mb-6 text-black text-center">Unser Team</h2>
                    <div>
                        <p className="text-gray-700 leading-relaxed text-center">
                            Da wir ein relativ kleines Team aus Media Engineering-Studierenden der TH Nürnberg sind, gibt es bei uns keine starren Zuständigkeiten. Wir helfen mit, wo es gerade nötig ist und bringen unsere Stärken ein.
                        </p>
                    </div>

                    <div>
                        {/* Branding und Design – 3 Bilder */}
                        <div className="p-6 space-y-6">
                            <div className="text-center">
                                <h3 className="text-xl font-medium text-[#8C531E]">Branding und Design</h3>
                                <p className="text-gray-600 mt-2 text-md">
                                    Im ersten der beiden Semester gab es viel im gestalterischen Bereich zu tun.
                                </p>
                            </div>

                            <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                <div className="flex gap-5">
                                    {/* Linke Spalte */}
                                    <div className="flex-shrink-0 w-[calc(50%_-_10px)] flex flex-col items-center">
                                        <div className="w-full aspect-square overflow-hidden rounded-full bg-[#d08945] mb-3">
                                            <img
                                                src="/about/lia.png"
                                                alt="Lia"
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                        <p className="text-md font-medium text-[#8C531E] text-center">Lia</p>
                                    </div>

                                    {/* Rechte Spalte */}
                                    <div className="flex-shrink-0 w-[calc(50%_-_10px)] flex flex-col items-center">
                                        <div className="w-full aspect-square overflow-hidden rounded-full bg-[#d08945] mb-3">
                                            <img
                                                src="/about/jannis.png"
                                                alt="Jannis"
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                        <p className="text-md font-medium text-[#8C531E] text-center">Jannis</p>
                                    </div>

                                    {/* Scroll Item */}
                                    <div className="flex-shrink-0 w-[calc(50%_-_10px)] flex flex-col items-center">
                                        <div className="w-full aspect-square overflow-hidden rounded-full bg-[#d08945] mb-3">
                                            <img
                                                src="/about/saly.png"
                                                alt="Saly"
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                        <p className="text-md font-medium text-[#8C531E] text-center">Saly</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Entwicklung – 2 Bilder */}
                        <div className="p-6 space-y-6">
                            <div className="text-center">
                                <h3 className="text-xl font-medium text-[#8C531E]">Entwicklung</h3>
                                <p className="text-gray-600 mt-2 text-md">
                                    Die Grundlagen der Entwicklung mussten ebenfalls geschaffen werden.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div className="flex flex-col items-center">
                                    <div className="w-full aspect-square overflow-hidden rounded-full bg-[#d08945] mb-3">
                                        <img
                                            src="/about/eren.png"
                                            alt="Eren"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <p className="text-md font-medium text-[#8C531E] text-center">Eren</p>
                                </div>

                                <div className="flex flex-col items-center">
                                    <div className="w-full aspect-square overflow-hidden rounded-full bg-[#d08945]    mb-3">
                                        <img
                                            src="/about/tanja.png"
                                            alt="Tanja"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <p className="text-md font-medium text-[#8C531E] text-center">Tanja</p>
                                </div>
                            </div>
                        </div>

                        {/* Social Media – 1 Bild */}
                        <div className="p-6 space-y-6">
                            <div className="text-center">
                                <h3 className="text-xl font-medium text-[#8C531E]">Social Media</h3>
                                <p className="text-gray-600 mt-2 text-md">
                                    Auch unsere Social Media Profile mussten erstellt und verwaltet werden.
                                </p>
                            </div>

                            <div className="flex justify-center">
                                <div className="flex flex-col items-center w-[calc(50%_-_10px)] max-w-[220px]">
                                    <div className="w-full aspect-square overflow-hidden rounded-full bg-[#d08945] mb-3">
                                        <img
                                            src="/about/lana.png"
                                            alt="Lana"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <p className="text-md font-medium text-[#8C531E] text-center">Lana</p>
                                </div>
                            </div>
                        </div>

                        {/* Organisation – 1 Bild */}
                        <div className="p-6 space-y-6">
                            <div className="text-center">
                                <h3 className="text-xl font-medium text-[#8C531E]">Organisation</h3>
                                <p className="text-gray-600 mt-2 text-md">
                                    Damit wir zusammenarbeiten konnten, brauchte es auch eine gute Organisation.
                                </p>
                            </div>

                            <div className="flex justify-center">
                                <div className="flex flex-col items-center w-[calc(50%_-_10px)] max-w-[220px]">
                                    <div className="w-full aspect-square overflow-hidden rounded-full bg-[#d08945] mb-3">
                                        <img
                                            src="/about/lexi.png"
                                            alt="Lexi"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <p className="text-md font-medium text-[#8C531E] text-center">Lexi</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
