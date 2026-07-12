"use client";

import { useTheme } from "next-themes";
import { useEffect, useState, useRef, useCallback } from "react";
import { Sun, Moon, Monitor, Check, Loader2 } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useToast } from "@/components/toast";

type ThemeOption = "light" | "dark" | "system";

const THEME_OPTIONS: {
  value: ThemeOption;
  label: string;
  description: string;
  icon: typeof Sun;
}[] = [
  {
    value: "light",
    label: "Hell",
    description: "Helle Hintergründe und dunkle Schrift",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dunkel",
    description: "Dunkle Hintergründe und helle Schrift",
    icon: Moon,
  },
  {
    value: "system",
    label: "Systemeinstellung",
    description: "Übernimmt die Einstellung des Geräts",
    icon: Monitor,
  },
];

/**
 * Theme-Auswahl-Komponente für die Einstellungsseite.
 * 
 * - Zeigt drei Auswahlkarten (Hell, Dunkel, System)
 * - Wechselt das Theme sofort lokal via next-themes
 * - Speichert die Auswahl in Convex (mit Debounce)
 * - Zeigt Fehler-Toast bei Speicherfehlern
 * - Keyboard-navigierbar (Arrow Keys)
 */
export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<ThemeOption | null>(null);
  const { currentUser } = useCurrentUser();
  const setUserTheme = useMutation(api.settings.setUserTheme);
  const toast = useToast();

  // Debounce-Timer für schnelles Wechseln
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydration: Erst nach Mount den Theme-Wert anzeigen
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = useCallback(
    (newTheme: ThemeOption) => {
      // Sofortige lokale Änderung
      setTheme(newTheme);

      // Debounced Convex-Speicherung
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (!currentUser?._id) return;

      debounceRef.current = setTimeout(async () => {
        setIsSaving(true);
        try {
          await setUserTheme({
            userId: currentUser._id,
            theme: newTheme,
          });
          setLastSaved(newTheme);
          // Automatisch nach 2s den Haken ausblenden
          setTimeout(() => setLastSaved(null), 2000);
        } catch {
          toast.error("Theme konnte nicht gespeichert werden.");
        } finally {
          setIsSaving(false);
        }
      }, 500);
    },
    [currentUser?._id, setTheme, setUserTheme, toast]
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Keyboard-Navigation innerhalb der Radiogroup
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, currentIndex: number) => {
      let nextIndex = currentIndex;

      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        nextIndex = (currentIndex + 1) % THEME_OPTIONS.length;
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        nextIndex =
          (currentIndex - 1 + THEME_OPTIONS.length) % THEME_OPTIONS.length;
      } else {
        return;
      }

      const newTheme = THEME_OPTIONS[nextIndex].value;
      handleThemeChange(newTheme);

      // Fokus auf die nächste Option setzen
      const container = e.currentTarget.parentElement;
      const nextElement = container?.children[nextIndex] as HTMLElement;
      nextElement?.focus();
    },
    [handleThemeChange]
  );

  // Vor Hydration: Platzhalter anzeigen
  if (!mounted) {
    return (
      <div className="space-y-3">
        {THEME_OPTIONS.map((option) => (
          <div
            key={option.value}
            className="h-[76px] rounded-2xl bg-muted animate-pulse"
          />
        ))}
      </div>
    );
  }

  const currentTheme = (theme as ThemeOption) || "light";

  return (
    <div>
      {/* Radiogroup */}
      <div
        role="radiogroup"
        aria-label="Farbmodus auswählen"
        className="space-y-3"
      >
        {THEME_OPTIONS.map((option, index) => {
          const isSelected = currentTheme === option.value;
          const Icon = option.icon;

          return (
            <button
              key={option.value}
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => handleThemeChange(option.value)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`
                w-full flex items-center gap-4 px-4 py-3 rounded-2xl border-2 transition-all duration-200
                text-left cursor-pointer touch-manipulation
                focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
                ${
                  isSelected
                    ? "border-[#D08945] bg-[#D08945]/5 dark:bg-[#D08945]/10"
                    : "border-border bg-card hover:border-[#D08945]/40 hover:bg-accent/50"
                }
              `}
              style={{ minHeight: "68px" }}
            >
              {/* Icon */}
              <div
                className={`
                  flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 transition-colors
                  ${
                    isSelected
                      ? "bg-[#D08945] text-white"
                      : "bg-muted text-muted-foreground"
                  }
                `}
              >
                <Icon className="w-5 h-5" />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">
                  {option.label}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {option.description}
                </div>
              </div>

              {/* Check-Indikator */}
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-[#D08945] flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Speicherstatus */}
      <div className="mt-3 h-5 flex items-center">
        {isSaving && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Wird gespeichert…</span>
          </div>
        )}
        {!isSaving && lastSaved && (
          <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
            <Check className="w-3 h-3" />
            <span>Gespeichert</span>
          </div>
        )}
      </div>
    </div>
  );
}
