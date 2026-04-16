"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const ALLOWED_DOMAIN = "@th-nuernberg.de";
const MAJORS = [
  "Angewandte Chemie (B.Sc.)",
  "Angewandte Materialwissenschaften (B.Eng.)",
  "Angewandte Mathematik und Physik (B.Sc.)",
  "Architektur (B.A.)",
  "Bauingenieurwesen (B.Eng.)",
  "Betriebswirtschaft (B.A.)",
  "Betriebswirtschaft berufsbegleitend (B.A.)",
  "Computational Materials Engineering mit KI (B.Eng.)",
  "Design (B.A.)",
  "Digitales Gesundheitsmanagement (B.Sc.)",
  "Elektrotechnik und Informationstechnik (B.Eng.)",
  "Energie- und Gebäudetechnik (B.Eng.)",
  "Energie- und regenerative Technik (B.Eng.)",
  "Energie- und Wasserstofftechnik (B.Eng.)",
  "Fahrzeugtechnik (B.Eng.)",
  "Hebammenwissenschaft (B.Sc.)",
  "Informatik (B.Sc.)",
  "Ingenieurpädagogik (B.Sc.)",
  "International Business (B.A.)",
  "International Business and Technology (B.Eng.)",
  "Maschinenbau (B.Eng.)",
  "Management in der Ökobranche (B.A.)",
  "Mechanical Engineering (B.Eng.)",
  "Media Engineering (B.Eng.)",
  "Medieninformatik (B.Sc.)",
  "Medizintechnik (B.Eng.)",
  "Mechatronik / Feinwerktechnik (B.Eng.)",
  "Prozessingenieurwesen (B.Eng.)",
  "Public Management (B.A.)",
  "Social Data Science & Communication (B.Sc.)",
  "Soziale Arbeit (B.A.)",
  "Soziale Arbeit: Erziehung und Bildung im Lebenslauf (B.A.)",
  "Technikjournalismus / Technik-PR (B.A.)",
  "Wirtschaftsinformatik (B.Sc.)",
];

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [registerData, setRegisterData] = useState({
    name: "",
    username: "",
    email: "",
    major: "",
  });

  const isAllowedDomain = (email: string) =>
    email.trim().toLowerCase().endsWith(ALLOWED_DOMAIN);

  const parseApiJson = async (response: Response) => {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return response.json();
    }

    const responseText = await response.text();
    const shortText = responseText.slice(0, 120).replace(/\s+/g, " ").trim();
    throw new Error(
      `Unerwartete Server-Antwort (${response.status}). Erwartet wurde JSON, erhalten: ${shortText || "leer"}`,
    );
  };

  const sendMagicLink = async (email: string, displayName?: string) => {
    const trimmedName = displayName?.trim();
    const { error: signInError } = await authClient.signIn.magicLink({
      email: email.trim().toLowerCase(),
      name: trimmedName,
      metadata: trimmedName ? { displayName: trimmedName } : undefined,
      callbackURL: "/auth/callback",
      newUserCallbackURL: "/auth/callback",
      errorCallbackURL: "/",
    });

    if (signInError) {
      throw new Error(signInError.message || "Magic Link konnte nicht versendet werden.");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!isAllowedDomain(loginEmail)) {
      setError(`Nur E-Mails mit ${ALLOWED_DOMAIN} sind erlaubt.`);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/check-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail }),
      });
      const data = await parseApiJson(response);
      if (!response.ok || !data.exists) {
        throw new Error("Für diese E-Mail wurde kein Konto gefunden.");
      }

      const savedName = typeof data.name === "string" ? data.name : undefined;
      await sendMagicLink(loginEmail, savedName);
      setSuccess("Magic Link wurde versendet. Bitte prüfe dein Postfach.");
    } catch (err: any) {
      setError(err.message || "Fehler beim Versenden des Magic Links.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!registerData.name || !registerData.username || !registerData.email || !registerData.major) {
      setError("Bitte alle Felder ausfüllen.");
      return;
    }

    if (!isAllowedDomain(registerData.email)) {
      setError(`Nur E-Mails mit ${ALLOWED_DOMAIN} sind erlaubt.`);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/register-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerData),
      });
      const data = await parseApiJson(response);
      if (!response.ok) {
        throw new Error(data.error || "Registrierung fehlgeschlagen.");
      }

      await sendMagicLink(registerData.email, registerData.name);
      setSuccess("Registrierung gespeichert. Prüfe dein Postfach für den Magic Link.");
    } catch (err: any) {
      setError(err.message || "Fehler bei der Registrierung.");
    } finally {
      setIsLoading(false);
    }
  };

  const fieldClassName =
    "w-full h-12 px-4 rounded-full bg-white border border-gray-300 text-black outline-none transition-colors focus:border-black focus:ring-0 disabled:opacity-50";

  const majorSelectClassName = `${fieldClassName} auth-major-select !pr-12 cursor-pointer disabled:cursor-not-allowed`;

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-white px-4 pb-4">
      <div className="w-full max-w-md flex flex-col items-center">
        <div className="flex items-center justify-center mt-0 sm:mt-4 w-full">
          <img src="/hellouni.svg" alt="Hello Uni Logo" className="w-56 h-56 object-contain ml-24" />
        </div>

        <h1 className="text-4xl font-semibold text-black text-center -mt-16 w-full" style={{ fontFamily: "var(--font-poppins), sans-serif" }}>
          HelloUni
        </h1>

        <div className="rounded-3xl p-8 shadow-lg w-full" style={{ backgroundColor: "rgba(220, 198, 161)", marginTop: "40px" }}>
          <h2 className="text-2xl font-bold text-black mb-2 text-center">
            {isSignUp ? "Registrieren" : "Anmelden"}
          </h2>
          <p className="text-sm text-gray-700 mb-6 text-center">
            {isSignUp
              ? "Name, Benutzername, E-Mail und Studiengang eintragen. Danach erhältst du einen Magic Link."
              : "E-Mail eingeben und Magic Link erhalten."}
          </p>

          <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-4">
            {isSignUp && (
              <>
                <input
                  type="text"
                  placeholder="Name"
                  value={registerData.name}
                  onChange={(e) => setRegisterData((p) => ({ ...p, name: e.target.value }))}
                  disabled={isLoading}
                  className={fieldClassName}
                />
                <input
                  type="text"
                  placeholder="Benutzername"
                  value={registerData.username}
                  onChange={(e) => setRegisterData((p) => ({ ...p, username: e.target.value }))}
                  disabled={isLoading}
                  className={fieldClassName}
                />
              </>
            )}

            <input
              type="email"
              placeholder={`E-Mail (${ALLOWED_DOMAIN})`}
              value={isSignUp ? registerData.email : loginEmail}
              onChange={(e) =>
                isSignUp
                  ? setRegisterData((p) => ({ ...p, email: e.target.value }))
                  : setLoginEmail(e.target.value)
              }
              disabled={isLoading}
              className={fieldClassName}
            />

            {isSignUp && (
              <select
                value={registerData.major}
                onChange={(e) => setRegisterData((p) => ({ ...p, major: e.target.value }))}
                disabled={isLoading}
                className={majorSelectClassName}
              >
                <option value="">Studiengang auswählen</option>
                {MAJORS.map((major) => (
                  <option key={major} value={major}>
                    {major}
                  </option>
                ))}
              </select>
            )}

            {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-full text-center">{error}</div>}
            {success && <div className="text-sm text-green-700 bg-green-50 p-3 rounded-full text-center">{success}</div>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-full bg-black text-white font-medium text-sm transition-transform duration-200 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            >
              {isLoading ? "Wird verarbeitet..." : "Magic Link senden"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
                setSuccess("");
              }}
              className="text-sm text-gray-700 hover:text-black underline transition-colors"
            >
              {isSignUp ? "Bereits ein Konto? Anmelden" : "Noch kein Konto? Registrieren"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
