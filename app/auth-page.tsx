"use client";

import { useState } from "react";
import { useMutation, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { STUDIENGAENGE } from "@/lib/studiengaenge";
import {
  ALLOWED_EMAIL_ERROR,
  isAllowedUniversityEmail,
} from "@/convex/allowedEmail";

type Tab = "login" | "register";
type State = "idle" | "loading" | "sent";

const inputCls =
  "w-full h-12 px-4 rounded-full bg-white border border-gray-300 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all";

/** Nach Klick auf Magic Link: zuerst Splash, dann /home. */
const MAGIC_LINK_CALLBACK = "/splash?ml=1";
const MAGIC_LINK_ERROR = "/auth/magic-link-fehler";

export default function AuthPage() {
  const [tab, setTab] = useState<Tab>("login");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");
  const [sentEmail, setSentEmail] = useState("");

  // Anmelden
  const [loginEmail, setLoginEmail] = useState("");

  // Registrieren
  const [regData, setRegData] = useState({
    name: "",
    username: "",
    email: "",
    studiengang: "",
  });

  const savePending = useMutation(api.auth.savePendingRegistration);
  const convex = useConvex();

  const switchTab = (t: Tab) => {
    setTab(t);
    setError("");
    setState("idle");
    setSentEmail("");
    setLoginEmail("");
    setRegData({ name: "", username: "", email: "", studiengang: "" });
  };

  /* ── Anmelden ─────────────────────────────────────────────── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const email = loginEmail.trim().toLowerCase();
    if (!email.includes("@")) {
      setError("Bitte gib eine gültige E-Mail-Adresse ein.");
      return;
    }
    if (!isAllowedUniversityEmail(email)) {
      setError(ALLOWED_EMAIL_ERROR);
      return;
    }

    setState("loading");
    try {
      // Prüfen ob ein Konto mit dieser E-Mail existiert
      const existingUser = await convex.query(api.auth.getUserByEmail, { email });
      if (!existingUser) {
        setError("Kein Konto mit dieser E-Mail-Adresse gefunden. Bitte registriere dich.");
        setState("idle");
        return;
      }

      const result = await authClient.signIn.magicLink({
        email,
        callbackURL: MAGIC_LINK_CALLBACK,
        errorCallbackURL: MAGIC_LINK_ERROR,
      });
      if (result?.error) {
        setError(result.error.message ?? "Magic Link konnte nicht gesendet werden.");
        setState("idle");
        return;
      }
      setSentEmail(email);
      setState("sent");
    } catch {
      setError("Etwas ist schiefgelaufen. Bitte versuche es erneut.");
      setState("idle");
    }
  };

  /* ── Registrieren ─────────────────────────────────────────── */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedName = regData.name.trim();
    const trimmedUsername = regData.username.trim().toLowerCase();
    const trimmedEmail = regData.email.trim().toLowerCase();

    if (!trimmedName) { setError("Bitte gib deinen Namen ein."); return; }
    if (!/^[a-z0-9_]{3,20}$/.test(trimmedUsername)) {
      setError("Benutzername: 3–20 Zeichen, nur Kleinbuchstaben, Zahlen und _");
      return;
    }
    if (!trimmedEmail.includes("@")) {
      setError("Bitte gib eine gültige E-Mail-Adresse ein.");
      return;
    }
    if (!isAllowedUniversityEmail(trimmedEmail)) {
      setError(ALLOWED_EMAIL_ERROR);
      return;
    }

    setState("loading");
    try {
      // Registrierungsdaten in Convex sichern – können nach dem Login fürs Auto-Setup genutzt werden
      await savePending({
        email: trimmedEmail,
        name: trimmedName,
        username: trimmedUsername,
        studiengang: regData.studiengang || undefined,
      });

      const result = await authClient.signIn.magicLink({
        email: trimmedEmail,
        callbackURL: MAGIC_LINK_CALLBACK,
        errorCallbackURL: MAGIC_LINK_ERROR,
      });

      if (result?.error) {
        setError(result.error.message ?? "Magic Link konnte nicht gesendet werden.");
        setState("idle");
        return;
      }

      setSentEmail(trimmedEmail);
      setState("sent");
    } catch {
      setError("Etwas ist schiefgelaufen. Bitte versuche es erneut.");
      setState("idle");
    }
  };

  /* ── Bestätigungs-Screen ──────────────────────────────────── */
  if (state === "sent") {
    return (
      <PageShell>
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="white" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5a2.25 2.25 0 00-2.25 2.25m19.5 0-9.75 7.5-9.75-7.5" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-black">Schau in dein Postfach!</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            Wir haben einen Magic Link an{" "}
            <span className="font-semibold text-black">{sentEmail}</span> gesendet.
            <br />
            Klicke auf den Link in der E-Mail, um fortzufahren.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Kein E-Mail erhalten?{" "}
            <button type="button" className="underline hover:text-black" onClick={() => { setState("idle"); setError(""); }}>
              Erneut senden
            </button>
          </p>
        </div>
      </PageShell>
    );
  }

  /* ── Haupt-UI ─────────────────────────────────────────────── */
  return (
    <PageShell>
      {tab === "login" ? (
        /* ── Anmelden-Formular ── */
        <form onSubmit={handleLogin} className="space-y-4">
          <h2 className="text-2xl font-bold text-black text-center mb-4">Anmelden</h2>
          <input
            type="email"
            placeholder="vorname.nachname@th-nuernberg.de"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            required
            disabled={state === "loading"}
            autoComplete="email"
            className={inputCls}
          />
          {error && <ErrorBox message={error} />}
          <SubmitButton loading={state === "loading"} label="Magic Link senden" />

          <p className="text-center text-sm text-gray-600 pt-1">
            Noch kein Konto?{" "}
            <button type="button" onClick={() => switchTab("register")} className="font-medium text-black underline hover:opacity-70">
              Registrieren
            </button>
          </p>
        </form>
      ) : (
        /* ── Registrierungs-Formular ── */
        <form onSubmit={handleRegister} className="space-y-4">
          <h2 className="text-2xl font-bold text-black text-center mb-1">Registrieren</h2>
          <p className="text-sm text-gray-700 text-center mb-4">
            Erstelle dein HelloUni-Konto (nur @th-nuernberg.de).
          </p>

          {/* Name */}
          <input
            type="text"
            placeholder="Dein Name"
            value={regData.name}
            onChange={(e) => setRegData({ ...regData, name: e.target.value })}
            required
            disabled={state === "loading"}
            maxLength={50}
            className={inputCls}
          />

          {/* Benutzername */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">@</span>
            <input
              type="text"
              placeholder="benutzername"
              value={regData.username}
              onChange={(e) =>
                setRegData({ ...regData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })
              }
              required
              disabled={state === "loading"}
              maxLength={20}
              className={`${inputCls} pl-8`}
            />
          </div>
          <p className="text-xs text-gray-500 px-2 -mt-2">
            3–20 Zeichen · Kleinbuchstaben, Zahlen und _ erlaubt
          </p>

          {/* E-Mail */}
          <input
            type="email"
            placeholder="vorname.nachname@th-nuernberg.de"
            value={regData.email}
            onChange={(e) => setRegData({ ...regData, email: e.target.value })}
            required
            disabled={state === "loading"}
            autoComplete="email"
            className={inputCls}
          />

          {/* Studiengang Dropdown */}
          <div className="relative">
            <select
              value={regData.studiengang}
              onChange={(e) => setRegData({ ...regData, studiengang: e.target.value })}
              disabled={state === "loading"}
              className={`${inputCls} appearance-none pr-10 cursor-pointer ${!regData.studiengang ? "text-gray-400" : "text-black"}`}
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

          {error && <ErrorBox message={error} />}
          <SubmitButton loading={state === "loading"} label="Konto erstellen & Magic Link senden" />

          <p className="text-center text-sm text-gray-600 pt-1">
            Bereits ein Konto?{" "}
            <button type="button" onClick={() => switchTab("login")} className="font-medium text-black underline hover:opacity-70">
              Anmelden
            </button>
          </p>
        </form>
      )}
    </PageShell>
  );
}

/* ── Hilfskomponenten ─────────────────────────────────────────── */

function ErrorBox({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="text-sm text-red-600 bg-red-50 p-3 rounded-full text-center">{message}</div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full h-12 rounded-full bg-black text-white font-medium text-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Wird gesendet…
        </>
      ) : (
        label
      )}
    </button>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen w-full flex flex-col items-center bg-white"
      style={{
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(1rem, env(safe-area-inset-left))",
        paddingRight: "max(1rem, env(safe-area-inset-right))",
      }}
    >
      <div className="w-full max-w-md flex flex-col items-center">
        <div className="flex items-center justify-center mt-0 sm:mt-4 w-full">
          <img src="/hellouni.svg" alt="Hello Uni Logo" className="w-56 h-56 object-contain ml-24" />
        </div>
        <h1
          className="text-4xl font-semibold text-black text-center -mt-16 w-full"
          style={{ fontFamily: "var(--font-poppins), sans-serif" }}
        >
          HelloUni
        </h1>
        <div
          className="rounded-3xl p-8 shadow-lg w-full"
          style={{ backgroundColor: "rgba(220, 198, 161)", marginTop: "40px" }}
        >
          {children}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 mt-6 text-sm text-gray-700">
        <a href="/about" className="underline hover:text-black">Über Uns</a>
        <span>•</span>
        <a href="/imprint" className="underline hover:text-black">Impressum</a>
        <span>•</span>
        <a href="/privacy" className="underline hover:text-black">Datenschutz</a>
      </div>
    </div>
  );
}
