"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

/** Mindestens so lange Splash nach erfolgreichem Magic-Link (Callback mit ?ml=1). */
const SPLASH_MIN_MS = 1000;

function SplashFallback() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white px-6">
      <img
        src="/logo_background.png"
        alt=""
        className="w-32 h-32 sm:w-40 sm:h-40 object-contain animate-pulse"
        width={208}
        height={208}
      />
    </div>
  );
}

function SplashInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMagicLinkFlow = searchParams.get("ml") === "1";

  const { data: session, isPending } = useSession();
  const { currentUser, needsSetup, isLoading } = useCurrentUser();
  const mountedAt = useRef(Date.now());

  // Direktaufruf /splash ohne Magic-Link-Parameter: kein erzwungener Splash (Lesezeichen, alte Links)
  useEffect(() => {
    if (isMagicLinkFlow) return;
    if (isPending) return;
    if (!session) router.replace("/");
    else router.replace("/home");
  }, [isMagicLinkFlow, isPending, session, router]);

  // Erfolgreicher Magic-Link: Session + Profilstatus, dann mindestens SPLASH_MIN_MS auf dieser Route
  useEffect(() => {
    if (!isMagicLinkFlow) return;
    if (isPending) return;
    if (!session) {
      router.replace("/");
      return;
    }
    if (isLoading) return;

    const elapsed = Date.now() - mountedAt.current;
    const remaining = Math.max(0, SPLASH_MIN_MS - elapsed);
    const id = window.setTimeout(() => {
      router.replace(needsSetup ? "/setup" : "/home");
    }, remaining);
    return () => window.clearTimeout(id);
  }, [isMagicLinkFlow, isPending, session, isLoading, needsSetup, router]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white px-6">
      <img
        src="/logo_background.png"
        alt=""
        className="w-32 h-32 sm:w-40 sm:h-40 object-contain"
        width={208}
        height={208}
      />
    </div>
  );
}

export default function SplashPage() {
  return (
    <Suspense fallback={<SplashFallback />}>
      <SplashInner />
    </Suspense>
  );
}
