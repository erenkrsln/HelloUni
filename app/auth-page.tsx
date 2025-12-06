"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Authentifizierungsseite mit Tabs für Login und Registrierung
 * Ermöglicht Benutzern, sich anzumelden oder ein neues Konto zu erstellen
 */
export default function AuthPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("login");

  // Zustand für Login
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Zustand für Registrierung
  const [registerData, setRegisterData] = useState({
    name: "",
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [registerError, setRegisterError] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);

  /**
   * Behandelt den Login mit NextAuth
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const result = await signIn("credentials", {
        username: loginData.username,
        password: loginData.password,
        redirect: false,
      });

      if (result?.error) {
        setLoginError("Benutzername oder Passwort falsch");
      } else if (result?.ok) {
        // Weiterleitung zu /home nach erfolgreichem Login
        router.push("/home");
        router.refresh();
      }
    } catch (error) {
      setLoginError("Fehler beim Anmelden");
    } finally {
      setLoginLoading(false);
    }
  };

  /**
   * Behandelt die Registrierung neuer Benutzer
   */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError("");

    // Felder validieren
    if (!registerData.name || !registerData.username || !registerData.password || !registerData.confirmPassword) {
      setRegisterError("Alle Felder sind erforderlich");
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      setRegisterError("Die Passwörter stimmen nicht überein");
      return;
    }

    if (registerData.password.length < 6) {
      setRegisterError("Das Passwort muss mindestens 6 Zeichen lang sein");
      return;
    }

    setRegisterLoading(true);

    try {
      // Registrierungs-API aufrufen
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
        setRegisterError(data.error || "Fehler bei der Registrierung");
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
      }
    } catch (error) {
      setRegisterError("Fehler bei der Registrierung");
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: "url('/feed-background-v3.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}
    >
      {/* Dunkles Overlay für bessere Lesbarkeit */}
      <div className="absolute inset-0 bg-black/40"></div>
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo/Titel */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">HelloUni</h1>
          <p className="text-white/90 drop-shadow-md">Social Media für Studierende</p>
        </div>

        {/* Auth-Karte */}
        <Card className="shadow-2xl backdrop-blur-md bg-white/90 border-white/20">
          <CardHeader>
            <CardTitle className="text-center" style={{ color: "var(--color-text-beige-dark, #8B6F47)" }}>
              Willkommen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="login">Anmelden</TabsTrigger>
                <TabsTrigger value="register">Registrieren</TabsTrigger>
              </TabsList>

              {/* Login-Tab */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-username">Benutzername</Label>
                    <Input
                      id="login-username"
                      type="text"
                      placeholder="dein_benutzername"
                      value={loginData.username}
                      onChange={(e) =>
                        setLoginData({ ...loginData, username: e.target.value })
                      }
                      required
                      disabled={loginLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Passwort</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={(e) =>
                        setLoginData({ ...loginData, password: e.target.value })
                      }
                      required
                      disabled={loginLoading}
                    />
                  </div>

                  {loginError && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                      {loginError}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginLoading}
                  >
                    {loginLoading ? "Wird angemeldet..." : "Anmelden"}
                  </Button>
                </form>
              </TabsContent>

              {/* Registrierungs-Tab */}
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Vollständiger Name</Label>
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="Max Mustermann"
                      value={registerData.name}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, name: e.target.value })
                      }
                      required
                      disabled={registerLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-username">Benutzername</Label>
                    <Input
                      id="register-username"
                      type="text"
                      placeholder="dein_benutzername"
                      value={registerData.username}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, username: e.target.value })
                      }
                      required
                      disabled={registerLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Passwort</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="••••••••"
                      value={registerData.password}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, password: e.target.value })
                      }
                      required
                      disabled={registerLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password">
                      Passwort bestätigen
                    </Label>
                    <Input
                      id="register-confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={registerData.confirmPassword}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          confirmPassword: e.target.value,
                        })
                      }
                      required
                      disabled={registerLoading}
                    />
                  </div>

                  {registerError && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                      {registerError}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerLoading}
                  >
                    {registerLoading ? "Wird registriert..." : "Konto erstellen"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Fußzeile */}
        <p className="text-center text-sm text-white/80 mt-6 drop-shadow-md">
          Durch Fortfahren akzeptierst du unsere Nutzungsbedingungen
        </p>
      </div>
    </div>
  );
}

