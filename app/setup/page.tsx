"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSession } from "@/lib/auth-client";
import { STUDIENGAENGE } from "@/lib/studiengaenge";

export default function SetupPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const createOrLinkProfile = useMutation(api.auth.createOrLinkUserProfile);

  const currentUser = useQuery(api.auth.getCurrentUser, session ? {} : "skip");

  const userEmail = session?.user.email ?? "";
  const pendingReg = useQuery(
    api.auth.getPendingRegistration,
    userEmail ? { email: userEmail } : "skip",
  );

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [studiengang, setStudiengang] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [autoSubmitting, setAutoSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Nicht eingeloggt → Startseite
  useEffect(() => {
    if (!isPending && !session) router.replace("/");
  }, [isPending, session, router]);

  // Profil bereits vorhanden → /home
  useEffect(() => {
    if (currentUser) router.replace("/home");
  }, [currentUser, router]);

  // Pending-Daten aus Registrierung vorausfüllen
  useEffect(() => {
    if (!pendingReg) return;
    if (pendingReg.name) setName(pendingReg.name);
    if (pendingReg.username) setUsername(pendingReg.username);
    if (pendingReg.studiengang) setStudiengang(pendingReg.studiengang);
  }, [pendingReg]);

  // Vollständige Pending-Daten vorhanden → Profil automatisch anlegen
  useEffect(() => {
    if (!pendingReg || !session || autoSubmitting) return;
    if (!pendingReg.name || !pendingReg.username) return;

    setAutoSubmitting(true);
    setIsLoading(true);

    createOrLinkProfile({
      username: pendingReg.username,
      name: pendingReg.name,
      studiengang: pendingReg.studiengang || undefined,
    })
      .then(() => router.replace("/home"))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.toLowerCase().includes("username") || msg.toLowerCase().includes("benutzernamen")) {
          setError("Dieser Benutzername ist bereits vergeben. Bitte wähle einen anderen.");
        } else {
          setError("Profil konnte nicht erstellt werden. Bitte manuell ausfüllen.");
        }
        setAutoSubmitting(false);
        setIsLoading(false);
      });
  }, [pendingReg, session, autoSubmitting, createOrLinkProfile, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedUsername = username.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!trimmedName) { setError("Bitte gib deinen Namen ein."); return; }
    if (!/^[a-z0-9_]{3,20}$/.test(trimmedUsername)) {
      setError("Benutzername: 3–20 Zeichen, nur Kleinbuchstaben, Zahlen und _");
      return;
    }

    setIsLoading(true);
    try {
      await createOrLinkProfile({
        username: trimmedUsername,
        name: trimmedName,
        studiengang: studiengang || undefined,
      });
      router.replace("/home");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("username") || msg.toLowerCase().includes("benutzernamen")) {
        setError("Dieser Benutzername ist bereits vergeben. Bitte wähle einen anderen.");
      } else {
        setError("Profil konnte nicht erstellt werden. Bitte versuche es erneut.");
      }
      setIsLoading(false);
    }
  };

  // Ladezustand: nicht nur isPending — bei bekannter Session sonst Flackern nach Tab-Wechsel (Session-Refetch).
  if (
    (isPending && !session) ||
    (!!session && currentUser === undefined) ||
    (pendingReg !== null && pendingReg !== undefined && autoSubmitting)
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Profil wird eingerichtet…</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center bg-white"
      style={{
        paddingLeft: "max(1rem, env(safe-area-inset-left))",
        paddingRight: "max(1rem, env(safe-area-inset-right))",
      }}
    >
      <div className="w-full max-w-md flex flex-col items-center">
        <div className="flex items-center justify-center w-full mb-2">
          <img src="/hellouni.svg" alt="Hello Uni Logo" className="w-24 h-24 object-contain" />
        </div>
        <h1
          className="text-3xl font-semibold text-black text-center mb-1"
          style={{ fontFamily: "var(--font-poppins), sans-serif" }}
        >
          HelloUni
        </h1>

        <div
          className="rounded-3xl p-8 shadow-lg w-full mt-6"
          style={{ backgroundColor: "rgba(220, 198, 161)" }}
        >
          <h2 className="text-2xl font-bold text-black mb-1 text-center">Profil einrichten</h2>
          <p className="text-sm text-gray-700 mb-6 text-center">
            Fast geschafft! Richte dein Profil ein, um loszulegen.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <input
              type="text"
              placeholder="Dein Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
              maxLength={50}
              className="w-full h-12 px-4 rounded-full bg-white border border-gray-300 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            />

            {/* Benutzername */}
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">@</span>
              <input
                type="text"
                placeholder="benutzername"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                required
                disabled={isLoading}
                maxLength={20}
                className="w-full h-12 pl-8 pr-4 rounded-full bg-white border border-gray-300 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              />
            </div>
            <p className="text-xs text-gray-500 px-2">
              3–20 Zeichen · Kleinbuchstaben, Zahlen und _ erlaubt
            </p>

            {/* Studiengang */}
            <div className="relative">
              <select
                value={studiengang}
                onChange={(e) => setStudiengang(e.target.value)}
                disabled={isLoading}
                className={`w-full h-12 px-4 rounded-full bg-white border border-gray-300 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all appearance-none pr-10 cursor-pointer ${!studiengang ? "text-gray-400" : "text-black"}`}
              >
                <option value="" disabled>Studiengang wählen</option>
                {STUDIENGAENGE.map((sg: string) => (
                  <option key={sg} value={sg} className="text-black">{sg}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </span>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-full text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-full bg-black text-white font-medium text-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Wird gespeichert…
                </>
              ) : (
                "Los geht's"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
