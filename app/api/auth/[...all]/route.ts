import { handler } from "@/lib/auth-server";

// Leitet alle /api/auth/* Anfragen an Better Auth auf Convex weiter
export const { GET, POST } = handler;
