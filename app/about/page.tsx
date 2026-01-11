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
        <main className="min-h-screen w-full max-w-[428px] mx-auto bg-white">
            <header
                className="fixed top-0 left-0 right-0 w-full bg-white z-[70] pt-safe-top"
                style={{
                    height: `calc(94px + env(safe-area-inset-top, 0px))`,
                    minHeight: `calc(94px + env(safe-area-inset-top, 0px))`
                }}
            >
                <div className="relative flex h-full w-full items-center px-2">
                    <button
                        onClick={() => router.back()}
                        className="absolute left-2 p-2 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label="Zurück"
                    >
                        <ArrowLeft className="w-6 h-6 text-black" />
                    </button>

                    <h1 className="flex-1 text-center text-3xl font-bold">
                        Über Uns
                    </h1>
                </div>
            </header>

            {/* Content with padding for header */}
            <div className="pt-[100px] px-5 pb-10 text-center">
                <section className="mb-10">
                    <h2 className="text-2xl font-semibold mb-4">Unsere Idee</h2>
                    <p className="text-gray-700 leading-relaxed mb-4">
                        Im digitalen Zeitalter sollte es leicht sein, neue Kontakte zu knüpfen und trotzdem fällt es vielen Studierenden überraschend schwer, wirklich anzukommen und Freundschaften zu finden.
                    </p>
                    <p className="text-gray-700 leading-relaxed mb-4">
                        Genau hier möchten wir mit unserem semesterübergreifendem Projekt HelloUni ansetzen: Wir bringen Studierende einer Hochschule gezielt zusammen, basierend auf Interessen, Studiengang und Hobbys.
                    </p>
                    <p className="text-gray-700 leading-relaxed">
                        Kein Chaos, keine Anonymität. Stattdessen ein übersichtlicher Raum für Lerngruppen, Events, Sport, Projekte oder einfach neue Freundschaften. <br />
                        Denn ein gutes Studium lebt vor allem von den Menschen, die man dabei trifft.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold mb-4">Unser Team</h2>
                    <p className="text-gray-700 leading-relaxed mb-6">
                        Da wir ein relativ kleines Team aus Media Engineering-Studierenden der TH Nürnberg sind, gibt es bei uns keine starren Zuständigkeiten. Wir helfen mit, wo es gerade nötig ist und bringen unsere Stärken ein. <br />
                        Dennoch gibt es hier einen kleinen Einblick, wer hauptsächlich in welchen Bereichen gearbeitet hat.
                    </p>

                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xl font-medium mb-2">Branding und Design</h3>
                            <p className="text-gray-700">Im ersten der beiden Semster gab es viel im gestalterischen Bereich zu tun.</p>
                        </div>

                        <div>
                            <h3 className="text-xl font-medium mb-2">Entwicklung</h3>
                            <p className="text-gray-700">Die Grundlagen der Entwicklung mussten ebenfalls geschaffen werden.</p>
                        </div>

                        <div>
                            <h3 className="text-xl font-medium mb-2">Social Media</h3>
                            <p className="text-gray-700">Auch unsere Social Media Profile mussten erstellt und verwaltet werden.</p>
                        </div>

                        <div>
                            <h3 className="text-xl font-medium mb-2">Organisation</h3>
                            <p className="text-gray-700">Damit wir zusammenarbeiten konnten, brauchte es auch eine gute Organisation.</p>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
