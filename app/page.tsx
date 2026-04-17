"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuthPage from "./auth-page";
import { authClient } from "@/lib/auth-client";

/**
 * Landing Page - Zeigt Login/Registrierung oder leitet zu /home um, wenn authentifiziert
 */
export default function LandingPage() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const [showLoading, setShowLoading] = useState(true);

  // Zu /home umleiten, wenn bereits authentifiziert
  useEffect(() => {
    if (session) {
      router.push("/home");
    }
  }, [session, router]);

  // Schutz gegen dauerhaftes "Lädt..."
  useEffect(() => {
    if (!isPending) {
      setShowLoading(false);
      return;
    }

    const timeout = setTimeout(() => {
      setShowLoading(false);
    }, 1500);

    return () => clearTimeout(timeout);
  }, [isPending]);

  // Ladeindikator anzeigen, während Authentifizierung überprüft wird
  if (isPending && showLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-sm text-gray-600">Lädt...</p>
        </div>
      </div>
    );
  }

  // Wenn authentifiziert, nichts anzeigen (wird umgeleitet)
  if (session) {
    return null;
  }

  // Authentifizierungsseite anzeigen
  return <AuthPage />;
}
