"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { LoadingScreen } from "@/components/ui/spinner";

export default function ImprintPage() {
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
            <main className="min-h-screen w-full max-w-[428px] md:max-w-3xl mx-auto bg-background flex items-center justify-center">
                <LoadingScreen text="" />
            </main>
        );
    }

    return (
        <main className="min-h-screen w-full max-w-[428px] md:max-w-3xl mx-auto">
            <header
                className="fixed top-0 left-0 right-0 w-full bg-background z-[70] pt-safe-top border-b border-border"
                style={{
                    height: `calc(80px + env(safe-area-inset-top, 0px))`,
                    minHeight: `calc(80px + env(safe-area-inset-top, 0px))`
                }}
            >
                <div className="relative flex h-full w-full items-center px-4">
                    <button
                        onClick={() => router.back()}
                        className="absolute left-4 p-2 hover:bg-muted rounded-full transition-colors"
                        aria-label="Zurück"
                    >
                        <ArrowLeft className="w-6 h-6 text-foreground" />
                    </button>

                    <h1 className="flex-1 text-center text-3xl font-bold text-foreground">
                        Impressum
                    </h1>
                </div>
            </header>

            {/* Content with padding for header */}
            <div className="pt-[110px] px-5 pb-10">
                <section className="mb-8 bg-background p-6 input-card">
                    <h2 className="text-2xl font-semibold mb-4 text-foreground ">Anschrift</h2>
                    <p className="text-foreground leading-relaxed mb-4 font-semibold ">
                        Franziska Winkler
                    </p>
                    <p className="text-foreground leading-relaxed mb-4 ">
                        Gebäudeteile WB, WD und WE <br />
                        Wassertorstraße 10 <br />
                        90489 Nürnberg
                    </p>
                </section>

                <section className="mb-8 bg-background p-6 input-card">
                    <h2 className="text-2xl font-semibold mb-4 text-foreground ">Kontakt</h2>
                    <p className="text-foreground leading-relaxed mb-4 ">
                        E-Mail: f.winkler@hello-uni.de <br />
                        Telefon: 0123/0123456 <br />
                        Fax: 0123/0123458 <br />
                    </p>
                    <p className="text-foreground leading-relaxed mb-4 ">
                        <a href="https://www.hello-uni.de" target="_blank" rel="noopener noreferrer" className="underline">
                            www.hello-uni.de
                        </a>
                    </p>
                </section>
            </div>
        </main>
    );
}
