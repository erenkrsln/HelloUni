/**
 * SpeechService — Zentraler Wrapper für die Web Speech API.
 *
 * Kapselt `window.speechSynthesis` und `SpeechSynthesisUtterance`,
 * damit bei Bedarf eine alternative Lösung ergänzt werden kann.
 *
 * Verwendet ausschließlich die lokale Browser-/OS-Sprachausgabe.
 * Es werden keine Daten an externe Dienste gesendet.
 */

let cachedVoice: SpeechSynthesisVoice | null = null;
let voiceSearchDone = false;

/** Prüft, ob die Web Speech API im Browser verfügbar ist. */
export function isSpeechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined"
  );
}

/**
 * Sucht die beste verfügbare deutsche Stimme.
 * Cached das Ergebnis, damit nicht bei jedem Aufruf gesucht wird.
 */
function getGermanVoice(): SpeechSynthesisVoice | null {
  if (voiceSearchDone) return cachedVoice;

  if (!isSpeechSupported()) {
    voiceSearchDone = true;
    return null;
  }

  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) {
    // Stimmen noch nicht geladen — bei nächstem Aufruf erneut versuchen
    return null;
  }

  // Bevorzuge de-DE, dann de-*, dann beliebige
  cachedVoice =
    voices.find((v) => v.lang === "de-DE") ??
    voices.find((v) => v.lang.startsWith("de")) ??
    null;

  voiceSearchDone = true;
  return cachedVoice;
}

/**
 * Spricht den angegebenen Text auf Deutsch vor.
 *
 * - Bricht vorherige Ausgaben sofort ab (kein Queuing).
 * - Ignoriert leeren/leerzeichenreichen Text.
 * - Fängt API-Fehler sicher ab.
 */
export function speak(text: string): void {
  if (!isSpeechSupported()) return;

  const trimmed = text.trim();
  if (!trimmed) return;

  try {
    // Vorherige Ausgabe abbrechen
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(trimmed);
    utterance.lang = "de-DE";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voice = getGermanVoice();
    if (voice) {
      utterance.voice = voice;
    }

    // Fehler leise behandeln
    utterance.onerror = (event) => {
      // "interrupted" und "canceled" sind erwartete Fehler beim cancel()
      if (event.error !== "interrupted" && event.error !== "canceled") {
        console.warn("[SpeechService] Fehler bei Sprachausgabe:", event.error);
      }
    };

    speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("[SpeechService] Sprachausgabe fehlgeschlagen:", err);
  }
}

/** Bricht die aktuelle Sprachausgabe sofort ab. */
export function cancelSpeech(): void {
  if (!isSpeechSupported()) return;
  try {
    speechSynthesis.cancel();
  } catch {
    // Sicher ignorieren
  }
}

/**
 * Initialisiert die Stimmenliste.
 * Manche Browser laden Stimmen asynchron — dieser Aufruf sorgt dafür,
 * dass sie beim ersten `speak()` verfügbar sind.
 */
export function initVoices(): void {
  if (!isSpeechSupported()) return;

  // Stimmen sofort abfragen (kann leer sein)
  getGermanVoice();

  // Auf asynchrones Laden reagieren
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = () => {
      voiceSearchDone = false;
      cachedVoice = null;
      getGermanVoice();
    };
  }
}
