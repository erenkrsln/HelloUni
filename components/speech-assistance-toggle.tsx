"use client";

import { useSpeechAssistance } from "@/lib/contexts/SpeechAssistanceContext";

/**
 * Barrierefreiheit-Einstellung: Vorlesefunktion.
 *
 * Rendert einen zugänglichen Switch mit Beschreibung und Hinweistext.
 * Verwendet den SpeechAssistanceContext für Zustand und Persistierung.
 */
export function SpeechAssistanceToggle() {
  const { enabled, supported, setEnabled } = useSpeechAssistance();

  const descriptionId = "speech-assistance-description";
  const hintId = "speech-assistance-hint";

  return (
    <div className="space-y-4">
      {/* Toggle-Zeile */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <label
            htmlFor="speech-assistance-toggle"
            className="text-sm font-medium text-foreground cursor-pointer select-none"
          >
            Vorlesefunktion
          </label>
          <p
            id={descriptionId}
            className="text-xs text-muted-foreground mt-1 leading-relaxed"
          >
            Liest Schaltflächen, Symbole und Navigationselemente beim ersten
            Antippen vor. Durch erneutes Antippen wird die ausgewählte Funktion
            ausgeführt.
          </p>
        </div>

        {/* Switch */}
        <button
          id="speech-assistance-toggle"
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-describedby={`${descriptionId} ${hintId}`}
          disabled={!supported}
          onClick={() => setEnabled(!enabled)}
          className={`
            relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full
            transition-colors duration-200 ease-in-out
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D08945] focus-visible:ring-offset-2 focus-visible:ring-offset-background
            disabled:opacity-50 disabled:cursor-not-allowed
            ${enabled ? "bg-[#D08945]" : "bg-muted"}
          `}
        >
          <span className="sr-only">
            {enabled ? "Vorlesefunktion deaktivieren" : "Vorlesefunktion aktivieren"}
          </span>
          <span
            aria-hidden="true"
            className={`
              inline-block h-5 w-5 rounded-full bg-white shadow-sm
              transform transition-transform duration-200 ease-in-out
              ${enabled ? "translate-x-6" : "translate-x-1"}
            `}
          />
        </button>
      </div>

      {/* Hinweis zu Screenreadern */}
      <p
        id={hintId}
        className="text-xs text-muted-foreground leading-relaxed bg-muted/50 rounded-lg px-3 py-2"
      >
        Bei aktiviertem VoiceOver, TalkBack oder einem anderen Screenreader wird
        die Verwendung des systemeigenen Screenreaders empfohlen.
      </p>

      {/* Browser-Warnung */}
      {!supported && (
        <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">
          Dein Browser unterstützt die Sprachausgabe nicht. Die Vorlesefunktion
          ist daher nicht verfügbar.
        </p>
      )}
    </div>
  );
}
