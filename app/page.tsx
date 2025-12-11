"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AuthPage from "./auth-page";

/**
 * Landing Page - Zeigt Login/Registrierung oder leitet zu /home um, wenn authentifiziert
 */
export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Zu /home umleiten, wenn bereits authentifiziert
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/home");
    }
  }, [status, router]);

  // Ladeindikator anzeigen, während Authentifizierung überprüft wird
  if (status === "loading") {
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
