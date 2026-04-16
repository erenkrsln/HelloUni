import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { authClient } from "@/lib/auth-client";

/**
 * Hook zum Abrufen des aktuell eingeloggten Users
 * Verwendet die NextAuth Session, um die richtige User-ID zu erhalten
 * 
 * @returns Object mit currentUser, currentUserId, isLoading und session
 */
export function useCurrentUser() {
  const { data: session, isPending } = authClient.useSession();

  const email = session?.user?.email;
  const currentUser = useQuery(api.auth.getUserByEmail, email ? { email } : "skip");
  const currentUserId = currentUser?._id as Id<"users"> | undefined;

  return {
    currentUser,
    currentUserId,
    isLoading: isPending || (email !== undefined && currentUser === undefined),
    session,
  };
}







