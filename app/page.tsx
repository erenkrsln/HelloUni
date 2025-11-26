"use client";
import { LogoMark } from "@/components/logo";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useInvalidateConvexQueries } from "@/lib/convex-query-hooks";
import bcrypt from "bcryptjs";

export default function Home() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const isLogin = mode === "login";
  const invalidateQueries = useInvalidateConvexQueries();
  
  const createUser = useMutation(api.users.createUser);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    if (isLogin) {
      // Login mit NextAuth
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Ungültige Anmeldedaten");
        setLoading(false);
      } else {
        router.refresh();
        router.push("/feed");
      }
    } else {
      // Registrierung mit Convex
      try {
        const name = formData.get("name") as string;
        
        // Validierung
        if (!name || !username || !password) {
          setError("Bitte fülle alle Felder aus");
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          setError("Passwort muss mindestens 6 Zeichen lang sein");
          setLoading(false);
          return;
        }

        // Passwort hashen
        const passwordHash = await bcrypt.hash(password, 10);

        // User in Convex erstellen
        await createUser({
          name,
          username,
          passwordHash,
        });

        invalidateQueries();

        // Automatisch einloggen nach Registrierung
        const result = await signIn("credentials", {
          username,
          password,
          redirect: false,
        });

        if (result?.error) {
          setError("Registrierung erfolgreich, aber Login fehlgeschlagen");
          setLoading(false);
        } else {
          router.refresh();
          router.push("/feed");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Registrierung fehlgeschlagen");
        setLoading(false);
      }
    }
  };

  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-[#f6f7fb] px-4 py-6 sm:py-8 lg:py-12">
      <div className="w-full max-w-lg space-y-4 text-center sm:space-y-6 lg:space-y-8">
        <div className="space-y-0 sm:space-y-1">
          <div className="mx-auto flex h-16 w-16 items-center justify-center sm:h-24 sm:w-24 lg:h-28 lg:w-28">
            <LogoMark className="h-14 w-14 sm:h-20 sm:w-20 lg:h-24 lg:w-24" />
          </div>
          <p className="text-[22px] font-semibold tracking-tight text-slate-900 sm:text-[26px] lg:text-[28px]">
            HelloUni
          </p>
          <div className="text-xs leading-relaxed text-slate-600 sm:text-sm lg:text-base">
            <p className="text-slate-700">Die Plattform für Studierende.</p>
            <p>Verbinde dich und lerne gemeinsam.</p>
          </div>
        </div>

        <div className="rounded-[24px] bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:rounded-[28px] sm:p-6 lg:rounded-[32px] lg:p-7">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 lg:space-y-5">
            <div className="space-y-0.5 text-center">
              <p className="text-sm font-semibold text-slate-900 sm:text-base lg:text-lg">
                {isLogin ? "Willkommen zurück" : "Konto erstellen"}
              </p>
              <p className="text-xs text-slate-500 sm:text-sm">
                {isLogin
                  ? "Melde dich mit deinen Zugangsdaten an."
                  : "Erstelle dein HelloUni Konto in wenigen Sekunden."}
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {!isLogin && (
              <label className="block text-left text-xs font-semibold text-slate-700 sm:text-sm">
                Name
                <input
                  name="name"
                  type="text"
                  placeholder="Vor- und Nachname"
                  required={!isLogin}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[var(--brand)] focus:bg-white focus:ring-2 focus:ring-[var(--brand)]/30 sm:px-4 sm:py-2.5"
                  style={{ fontSize: '16px' }}
                />
              </label>
            )}

            <label className="block text-left text-xs font-semibold text-slate-700 sm:text-sm">
              Benutzername
              <input
                name="username"
                type="text"
                placeholder="Benutzername"
                required
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[var(--brand)] focus:bg-white focus:ring-2 focus:ring-[var(--brand)]/30 sm:px-4 sm:py-2.5"
                style={{ fontSize: '16px' }}
              />
            </label>

            <label className="block text-left text-xs font-semibold text-slate-700 sm:text-sm">
              Passwort
              <input
                name="password"
                type="password"
                placeholder="Passwort"
                required
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[var(--brand)] focus:bg-white focus:ring-2 focus:ring-[var(--brand)]/30 sm:px-4 sm:py-2.5"
                style={{ fontSize: '16px' }}
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-lg shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed sm:text-base lg:py-3"
            >
              {loading ? "Lädt..." : isLogin ? "Einloggen" : "Registrieren"}
              {!loading && <ArrowRightIcon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />}
            </button>

            <div className="text-center text-sm text-slate-500">
              {isLogin ? "Noch kein Konto?" : "Du hast bereits ein Konto?"}{" "}
              <button
                type="button"
                onClick={() => setMode(isLogin ? "register" : "login")}
                className="font-semibold text-[var(--brand)]"
          >
                {isLogin ? "Registrieren" : "Zum Login"}
              </button>
            </div>
          </form>
        </div>
        </div>
      </main>
  );
}

