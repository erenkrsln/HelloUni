import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSession } from "@/lib/auth-client";

/**
 * Hook zum Abrufen des aktuell eingeloggten Nutzers.
 *
 * needsSetup: true  → Nutzer ist authentifiziert, hat aber noch kein Convex-Profil.
 *                     Weiterleitung zu /setup erforderlich.
 * needsSetup: false → Profil existiert oder Nutzer ist nicht eingeloggt.
 */
export function useCurrentUser() {
  const { data: session, isPending } = useSession();

  const currentUser = useQuery(
    api.auth.getCurrentUser,
    session ? {} : "skip",
  );

  // Ohne „session“-Check: kurzes isPending bei Session-Refetch würde die ganze UI blockieren, obwohl die Session schon bekannt ist.
  const isLoading =
    (isPending && !session) || (!!session && currentUser === undefined);

  // Authentifiziert, aber kein Profil vorhanden → Setup erforderlich
  const needsSetup = !isLoading && !!session && currentUser === null;

  return {
    currentUser: currentUser ?? null,
    currentUserId: currentUser?._id ?? undefined,
    isLoading,
    needsSetup,
    session,
  };
}
