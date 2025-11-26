import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AppLayoutClient } from "./app-layout-client";
import { convexClient } from "@/lib/convex-client";
import { api } from "@/convex/_generated/api";
import { UserDataProvider } from "./user-context";
import { AppInitializationProvider } from "@/lib/app-initialization-context";
import { ScrollProvider } from "@/lib/scroll-context";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  let currentUser = null;
  let userPosts = null;
  
  if (session.user.username) {
    try {
      currentUser = await convexClient.query(api.users.getUserByUsername, {
        username: session.user.username,
      });
      
      if (currentUser?._id) {
        userPosts = await convexClient.query(api.posts.getUserPosts, {
          userId: currentUser._id,
        });
      }
    } catch (error) {
      console.error("Fehler beim Laden der User-Daten:", error);
    }
  }

  return (
    <AppInitializationProvider>
      <UserDataProvider userData={currentUser} userPosts={userPosts}>
        <ScrollProvider>
          <AppLayoutClient user={session.user} initialUserData={currentUser}>
            {children}
          </AppLayoutClient>
        </ScrollProvider>
      </UserDataProvider>
    </AppInitializationProvider>
  );
}

