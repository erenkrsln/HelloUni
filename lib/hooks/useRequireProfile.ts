import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "./useCurrentUser";
import { useSession } from "@/lib/auth-client";

/**
 * Wie useCurrentUser, behandelt aber automatisch den Fall "eingeloggt, kein Profil":
 *
 * A) Registrierungsdaten (pendingRegistration) vorhanden
 *    → Profil wird im Hintergrund erstellt, Nutzer bleibt auf der aktuellen Seite.
 *
 * B) Keine Registrierungsdaten
 *    → Weiterleitung zu /setup (manuelle Eingabe von Name/Username/Studiengang).
 */
export function useRequireProfile() {
  const result = useCurrentUser();
  const router = useRouter();
  const { data: session } = useSession();
  const createOrLinkProfile = useMutation(api.auth.createOrLinkUserProfile);
  const [autoSetupAttempted, setAutoSetupAttempted] = useState(false);

  const userEmail = session?.user.email ?? "";

  // Pending-Registrierung nur abfragen wenn Setup nötig
  const pendingReg = useQuery(
    api.auth.getPendingRegistration,
    result.needsSetup && userEmail ? { email: userEmail } : "skip",
  );

  useEffect(() => {
    if (!result.needsSetup || autoSetupAttempted) return;
    // Noch am Laden
    if (pendingReg === undefined) return;

    if (pendingReg?.name && pendingReg?.username) {
      // Registrierungsdaten vorhanden → Profil automatisch anlegen
      setAutoSetupAttempted(true);
      createOrLinkProfile({
        username: pendingReg.username,
        name: pendingReg.name,
        studiengang: pendingReg.studiengang ?? undefined,
      }).catch((err) => {
        console.error("Auto-Setup fehlgeschlagen:", err);
        // Fallback: manuelle Eingabe
        router.replace("/setup");
      });
    } else {
      // Keine Registrierungsdaten → manuelles Onboarding
      router.replace("/setup");
    }
  }, [result.needsSetup, pendingReg, autoSetupAttempted, createOrLinkProfile, router]);

  return result;
}
