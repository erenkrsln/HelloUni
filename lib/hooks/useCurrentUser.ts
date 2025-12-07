import { useSession } from "next-auth/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

/**
 * Hook zum Abrufen des aktuell eingeloggten Users
 * Verwendet die NextAuth Session, um die richtige User-ID zu erhalten
 * 
 * @returns Object mit currentUser, currentUserId, isLoading und session
 */
export function useCurrentUser() {
  const { data: session, status } = useSession();
  
  // Hole User-ID aus Session
  const currentUserId = (session?.user as any)?.id as Id<"users"> | undefined;
  
  // Query User-Daten von Convex
  const currentUser = useQuery(
    api.queries.getUserById,
    currentUserId ? { userId: currentUserId } : "skip"
  );

  return {
    currentUser,
    currentUserId,
    isLoading: status === "loading" || (currentUserId && currentUser === undefined),
    session,
  };
}







