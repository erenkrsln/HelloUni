import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  try {
    const { name, username, email, major } = await request.json();

    if (!name || !username || !email || !major) {
      return NextResponse.json({ error: "Alle Felder sind erforderlich." }, { status: 400 });
    }

    await convex.mutation(api.auth.registerMagicLinkUser, { name, username, email, major });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Registrierung fehlgeschlagen." },
      { status: 400 },
    );
  }
}
