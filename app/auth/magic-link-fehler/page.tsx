"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function messageForError(code: string | null): string {
  switch (code) {
    case "INVALID_TOKEN":
      return "Dieser Magic Link ist ungültig oder wurde bereits verwendet.";
    case "EXPIRED_TOKEN":
      return "Dieser Magic Link ist abgelaufen. Bitte fordere einen neuen Link an.";
    case "ATTEMPTS_EXCEEDED":
      return "Der Magic Link wurde zu oft geöffnet. Bitte fordere einen neuen Link an.";
    case "new_user_signup_disabled":
      return "Mit dieser E-Mail ist keine neue Registrierung möglich.";
    case "failed_to_create_user":
    case "failed_to_create_session":
      return "Die Anmeldung konnte technisch nicht abgeschlossen werden. Bitte versuche es erneut.";
    default:
      if (code) return "Die Anmeldung über den Link ist fehlgeschlagen. Bitte versuche es erneut.";
      return "Die Anmeldung über den Link ist fehlgeschlagen.";
  }
}

function MagicLinkFehlerInner() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white px-6">
      <h1
        className="text-2xl font-semibold text-black text-center mb-4"
        style={{ fontFamily: "var(--font-poppins), sans-serif" }}
      >
        Hello Uni
      </h1>
      <p className="text-center text-gray-700 text-sm max-w-md mb-8 leading-relaxed">
        {messageForError(error)}
      </p>
      <Link
        href="/"
        replace
        className="rounded-full bg-black text-white px-8 py-3 text-sm font-medium hover:bg-gray-800 transition-colors"
      >
        Zur Anmeldung
      </Link>
    </div>
  );
}

export default function MagicLinkFehlerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-white text-gray-500 text-sm">
          Wird geladen…
        </div>
      }
    >
      <MagicLinkFehlerInner />
    </Suspense>
  );
}
