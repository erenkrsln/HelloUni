import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// Convex-Client für Server-seitige Aufrufe
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * NextAuth-Konfiguration
 * Verwendet CredentialsProvider für Authentifizierung mit Benutzername und Passwort
 * Convex wird als Datenbank zum Speichern und Überprüfen von Benutzern verwendet
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Benutzername", type: "text" },
        password: { label: "Passwort", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Benutzername und Passwort sind erforderlich");
        }

        try {
          // Benutzer in Convex suchen
          const user = await convex.query(api.auth.getUserByUsername, {
            username: credentials.username,
          });

          if (!user) {
            throw new Error("Ungültige Anmeldedaten");
          }

          // Passwort überprüfen
          const isValidPassword = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          );

          if (!isValidPassword) {
            throw new Error("Ungültige Anmeldedaten");
          }

          // Benutzer zurückgeben (ohne passwordHash)
          return {
            id: user._id,
            name: user.name,
            username: user.username,
            image: user.image,
          };
        } catch (error) {
          console.error("Fehler bei der Autorisierung:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/", // Zur Landing Page für Login umleiten
  },
  callbacks: {
    async jwt({ token, user }) {
      // Benutzerinformationen zum JWT-Token hinzufügen
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
      }
      return token;
    },
    async session({ session, token }) {
      // Token-Informationen zur Session hinzufügen
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).username = token.username;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

