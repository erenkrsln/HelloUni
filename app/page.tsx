"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import AuthPage from "./auth-page";

/**
 * Landing Page — zeigt Login/Registrierung oder leitet zu /home um.
 */
export default function LandingPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  /** Nach erster Session-Antwort kein Vollbild-Lädt mehr bei kurzen isPending-Spitzen (z. B. Hintergrund-Refetch). */
  const authResolvedOnce = useRef(false);

  useEffect(() => {
    if (!isPending) authResolvedOnce.current = true;
  }, [isPending]);

  useEffect(() => {
    if (!isPending && session) {
      router.push("/home");
    }
  }, [isPending, session, router]);

  if (isPending && !authResolvedOnce.current) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white">
        <p className="text-sm text-gray-600">Lädt...</p>
      </div>
    );
  }

  if (session) return null;

  return <AuthPage />;
}
