import NextAuth from "next-auth";

/**
 * NextAuth-Typen erweitern, um benutzerdefinierte Felder einzuschließen
 */
declare module "next-auth" {
  interface User {
    username?: string;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      username?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    username?: string;
  }
}

