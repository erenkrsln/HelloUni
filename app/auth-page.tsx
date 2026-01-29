"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

/**
 * Authentifizierungsseite mit Login/Registrierung
 * Design basierend auf dem Screenshot: Weißer Hintergrund, beige Card, pill-shaped Inputs/Buttons
 */
export default function AuthPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Zustand für Login
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });

  // Zustand für Registrierung
  const [registerData, setRegisterData] = useState({
    name: "",
    username: "",
    password: "",
    confirmPassword: "",
  });


  /**
   * Behandelt den Login mit NextAuth
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        username: loginData.username,
        password: loginData.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Benutzername oder Passwort falsch");
      } else if (result?.ok) {
        router.push("/home");
        router.refresh();
      }
    } catch (error) {
      setError("Fehler beim Anmelden");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Behandelt die Registrierung neuer Benutzer
   */
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Felder validieren
    if (!registerData.name || !registerData.username || !registerData.password || !registerData.confirmPassword) {
      setError("Alle Felder sind erforderlich");
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      setError("Die Passwörter stimmen nicht überein");
      return;
    }

    if (registerData.password.length < 6) {
      setError("Das Passwort muss mindestens 6 Zeichen lang sein");
      return;
    }

    setIsLoading(true);

    try {
      // Echte Registrierung über API-Route
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: registerData.name,
          username: registerData.username,
          password: registerData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Fehler von der API anzeigen
        setError(data.error || "Fehler bei der Registrierung");
        return;
      }

      // Automatischer Login nach erfolgreicher Registrierung
      const loginResult = await signIn("credentials", {
        username: registerData.username,
        password: registerData.password,
        redirect: false,
      });

      if (loginResult?.ok) {
        router.push("/home");
        router.refresh();
      } else {
        setError("Registrierung erfolgreich, aber Anmeldung fehlgeschlagen. Bitte melde dich manuell an.");
      }
    } catch (error: any) {
      console.error("Registrierungsfehler:", error);
      setError(error.message || "Fehler bei der Registrierung");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center bg-white"
      style={{
        paddingTop: "0",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(1rem, env(safe-area-inset-left))",
        paddingRight: "max(1rem, env(safe-area-inset-right))",
      }}
    >
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Logo - zentriert über Hello Uni */}
        <div className="flex items-center justify-center mt-0 sm:mt-4 w-full">
          <img
            src="/hellouni.svg"
            alt="Hello Uni Logo"
            className="w-56 h-56 object-contain ml-24"
          />
        </div>

        {/* Headline - zentriert unter Logo */}
        <h1 className="text-4xl font-semibold text-black text-center -mt-16 w-full" style={{ fontFamily: 'var(--font-poppins), sans-serif' }}>
          Hello Uni
        </h1>

        {/* Beige Card - fester Abstand, unabhängig von Logo/Headline-Position */}
        <div
          className="rounded-3xl p-8 shadow-lg w-full"
          style={{ backgroundColor: "rgba(220, 198, 161)", marginTop: "40px" }}
        >
          {/* Titel */}
          <h2 className="text-2xl font-bold text-black mb-2 text-center">
            {isSignUp ? "Konto erstellen" : "Anmelden"}
          </h2>
          <p className="text-sm text-gray-700 mb-6 text-center">
            {isSignUp
              ? "Gib deine Informationen ein, um dich für diese App zu registrieren"
              : "Gib deine Anmeldedaten ein, um dich anzumelden"
            }
          </p>

          {/* Formular */}
          <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-4">
            {/* Name-Feld nur bei Registrierung */}
            {isSignUp && (
              <input
                type="text"
                placeholder="Name"
                value={registerData.name}
                onChange={(e) =>
                  setRegisterData({ ...registerData, name: e.target.value })
                }
                required
                disabled={isLoading}
                className="w-full h-12 px-4 rounded-full bg-white border border-gray-300 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-[#D08945] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              />
            )}

            {/* Benutzername */}
            <input
              type="text"
              placeholder="Benutzername"
              value={isSignUp ? registerData.username : loginData.username}
              onChange={(e) =>
                isSignUp
                  ? setRegisterData({ ...registerData, username: e.target.value })
                  : setLoginData({ ...loginData, username: e.target.value })
              }
              required
              disabled={isLoading}
              className="w-full h-12 px-4 rounded-full bg-white border border-gray-300 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            />

            {/* Passwort */}
            <input
              type="password"
              placeholder="Passwort"
              value={isSignUp ? registerData.password : loginData.password}
              onChange={(e) =>
                isSignUp
                  ? setRegisterData({ ...registerData, password: e.target.value })
                  : setLoginData({ ...loginData, password: e.target.value })
              }
              required
              disabled={isLoading}
              className="w-full h-12 px-4 rounded-full bg-white border border-gray-300 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            />

            {/* Passwort bestätigen nur bei Registrierung */}
            {isSignUp && (
              <input
                type="password"
                placeholder="Passwort bestätigen"
                value={registerData.confirmPassword}
                onChange={(e) =>
                  setRegisterData({ ...registerData, confirmPassword: e.target.value })
                }
                required
                disabled={isLoading}
                className="w-full h-12 px-4 rounded-full bg-white border border-gray-300 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-[#D08945] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              />
            )}

            {/* Fehleranzeige */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-full text-center">
                {error}
              </div>
            )}

            {/* Continue Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-full bg-black text-white font-medium text-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {isSignUp ? "Wird registriert..." : "Wird angemeldet..."}
                </span>
              ) : (
                "Continue"
              )}
            </button>
          </form>

          {/* Toggle zwischen Login und Sign Up */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
                // Formular zurücksetzen
                setLoginData({ username: "", password: "" });
                setRegisterData({ name: "", username: "", password: "", confirmPassword: "" });
              }}
              className="text-sm text-gray-700 hover:text-black underline transition-colors"
            >
              {isSignUp
                ? "Bereits einen Account? Anmelden"
                : "Noch keinen Account? Registrieren"
              }
            </button>
          </div>
        </div>
      </div>

      {/* Terms and Privacy */}
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
