import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ exists: false, error: "Ungültige E-Mail." }, { status: 400 });
    }

    const user = await convex.query(api.auth.getUserByEmail, { email });
    if (!user) {
      return NextResponse.json({ exists: false });
    }
    return NextResponse.json({ exists: true, name: user.name });
  } catch {
    return NextResponse.json({ exists: false, error: "Prüfung fehlgeschlagen." }, { status: 500 });
  }
}
