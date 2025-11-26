import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { convexClient } from "./lib/convex-client";
import { api } from "./convex/_generated/api";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Benutzername", type: "text" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          // User aus Convex abrufen
          const user = await convexClient.query(api.users.getUserByUsername, {
            username: credentials.username as string,
          });

          if (!user) {
            return null;
          }

          // Passwort prüfen
          const isValidPassword = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash
          );

          if (!isValidPassword) {
            return null;
          }

          // User-Objekt für NextAuth zurückgeben
          return {
            id: user._id,
            name: user.name,
            email: user.email || "",
            username: user.username,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
      }
      return session;
    },
  },
});

