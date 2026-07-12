import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  try {
    const { name, username, email, major, semester } = await request.json();

    if (!name || !username || !email || !major) {
      return NextResponse.json({ error: "Alle Felder sind erforderlich." }, { status: 400 });
    }

    // Semester kommt aus dem Formular als String -> in Zahl umwandeln (nur 1-10 gültig)
    const semesterNumber = Number(semester);
    const validSemester =
      Number.isFinite(semesterNumber) && semesterNumber >= 1 && semesterNumber <= 10
        ? semesterNumber
        : undefined;

    await convex.mutation(api.auth.registerMagicLinkUser, {
      name,
      username,
      email,
      major,
      semester: validSemester,
    });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Registrierung fehlgeschlagen." },
      { status: 400 },
    );
  }
}
