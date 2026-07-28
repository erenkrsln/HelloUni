"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { usePathname } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import {
  speak,
  cancelSpeech,
  initVoices,
  isSpeechSupported,
} from "@/lib/speech";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Timeout in ms nach dem die Auswahl automatisch zurückgesetzt wird. */
const SELECTION_TIMEOUT_MS = 8_000;

const STORAGE_KEY = "hellouni_speech_assistance";

/** Interaktive Elemente, die abgefangen werden. */
const INTERACTIVE_SELECTOR = [
  "a[href]",
  "button",
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="option"]',
].join(",");

/** Eingabefelder, die beim ersten Tap fokussiert + vorgelesen werden. */
const INPUT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface SpeechAssistanceContextValue {
  /** Ob die Vorlesefunktion aktiviert ist. */
  enabled: boolean;
  /** Ob die Web Speech API im Browser verfügbar ist. */
  supported: boolean;
  /** Toggled die Einstellung und speichert sie. */
  setEnabled: (value: boolean) => void;
}

const SpeechAssistanceContext =
  createContext<SpeechAssistanceContextValue | null>(null);

export function useSpeechAssistance(): SpeechAssistanceContextValue {
  const ctx = useContext(SpeechAssistanceContext);
  if (!ctx) {
    throw new Error(
      "useSpeechAssistance must be used within SpeechAssistanceProvider"
    );
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Accessible name resolution
// ---------------------------------------------------------------------------

function resolveAccessibleName(el: HTMLElement): string {
  // 1. aria-label
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel?.trim()) return ariaLabel.trim();

  // 2. aria-labelledby
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const parts = labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent?.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts.join(" ");
  }

  // 3. Sichtbarer Textinhalt (ohne versteckte Kinder)
  const text = el.textContent?.trim().replace(/\s+/g, " ");
  if (text && text.length > 0 && text.length < 200) return text;

  // 4. alt-Text eines enthaltenen Bildes
  const img = el.querySelector("img[alt]") as HTMLImageElement | null;
  if (img?.alt?.trim()) return img.alt.trim();

  // 5. title
  const title = el.getAttribute("title");
  if (title?.trim()) return title.trim();

  return "";
}

/**
 * Ergänzt den zugänglichen Namen um Zustandsinformationen
 * (z.B. für Switches, Checkboxen, Radio Buttons).
 */
function resolveAccessibleDescription(el: HTMLElement, name: string): string {
  const role = el.getAttribute("role");
  const tagName = el.tagName.toLowerCase();

  // Switch
  if (role === "switch") {
    const checked = el.getAttribute("aria-checked") === "true";
    return `${name}, ${checked ? "eingeschaltet" : "ausgeschaltet"}`;
  }

  // Checkbox
  if (
    role === "checkbox" ||
    (tagName === "input" &&
      (el as HTMLInputElement).type === "checkbox")
  ) {
    const checked =
      el.getAttribute("aria-checked") === "true" ||
      (el as HTMLInputElement).checked;
    return `${name}, ${checked ? "ausgewählt" : "nicht ausgewählt"}`;
  }

  // Radio
  if (
    role === "radio" ||
    (tagName === "input" &&
      (el as HTMLInputElement).type === "radio")
  ) {
    const checked =
      el.getAttribute("aria-checked") === "true" ||
      (el as HTMLInputElement).checked;
    return `${name}, ${checked ? "ausgewählt" : "nicht ausgewählt"}`;
  }

  // Tab
  if (role === "tab") {
    const selected = el.getAttribute("aria-selected") === "true";
    return `${name}, Tab${selected ? ", ausgewählt" : ""}`;
  }

  // Link
  if (tagName === "a" || role === "link") {
    return `${name}, Link`;
  }

  // Button (default)
  if (tagName === "button" || role === "button") {
    return `${name}, Schaltfläche`;
  }

  return name;
}

/**
 * Ermittelt den vorzulesenden Text für ein Eingabefeld.
 */
function resolveInputLabel(el: HTMLElement): string {
  // Passwortfelder: niemals Werte vorlesen
  if (
    el.tagName === "INPUT" &&
    (el as HTMLInputElement).type === "password"
  ) {
    return "Passwortfeld";
  }

  // aria-label
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel?.trim()) return ariaLabel.trim();

  // <label for="...">
  const id = el.getAttribute("id");
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label?.textContent?.trim()) return label.textContent.trim();
  }

  // Placeholder
  const placeholder = el.getAttribute("placeholder");
  if (placeholder?.trim()) return placeholder.trim();

  // title
  const title = el.getAttribute("title");
  if (title?.trim()) return title.trim();

  return "Eingabefeld";
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function SpeechAssistanceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { currentUser, session } = useCurrentUser();
  const email = session?.user?.email;

  // ----- State -----
  const [supported] = useState(() =>
    typeof window !== "undefined" ? isSpeechSupported() : false
  );
  const [enabled, setEnabledState] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Ref für das aktuell markierte Element
  const selectedRef = useRef<HTMLElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enabledRef = useRef(false);

  // ----- Convex -----
  const storedSetting = useQuery(
    api.settings.getSpeechAssistance,
    email ? { email } : "skip"
  );
  const saveSetting = useMutation(api.settings.setSpeechAssistance);

  // ----- Initialization -----
  useEffect(() => {
    setMounted(true);
    if (supported) initVoices();
  }, [supported]);

  // Sync from Convex → state + localStorage
  useEffect(() => {
    if (!mounted) return;
    if (storedSetting !== undefined && storedSetting !== null) {
      const val = !!storedSetting;
      setEnabledState(val);
      enabledRef.current = val;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
      } catch {}
    }
  }, [storedSetting, mounted]);

  // On mount: read localStorage as fast initial value
  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached !== null) {
        const val = JSON.parse(cached) === true;
        setEnabledState(val);
        enabledRef.current = val;
      }
    } catch {}
  }, []);

  // ----- Selection helpers -----

  const clearSelection = useCallback(() => {
    if (selectedRef.current) {
      selectedRef.current.removeAttribute("data-speech-selected");
      selectedRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const selectElement = useCallback(
    (el: HTMLElement) => {
      clearSelection();
      selectedRef.current = el;
      el.setAttribute("data-speech-selected", "true");

      // Timeout nach dem die Auswahl zurückgesetzt wird
      timeoutRef.current = setTimeout(() => {
        clearSelection();
      }, SELECTION_TIMEOUT_MS);
    },
    [clearSelection]
  );

  // ----- setEnabled (public API) -----

  const setEnabled = useCallback(
    (value: boolean) => {
      setEnabledState(value);
      enabledRef.current = value;

      // Speichere lokal
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      } catch {}

      // Speichere in Convex
      if (currentUser?._id) {
        saveSetting({ userId: currentUser._id, enabled: value }).catch(() => {
          // Fehler leise ignorieren — lokale Einstellung bleibt
        });
      }

      if (!value) {
        cancelSpeech();
        clearSelection();
      } else if (supported) {
        speak("Vorlesefunktion aktiviert");
      }
    },
    [currentUser?._id, saveSetting, clearSelection, supported]
  );

  // ----- Route change → reset -----

  useEffect(() => {
    cancelSpeech();
    clearSelection();
  }, [pathname, clearSelection]);

  // ----- Escape key → reset -----

  useEffect(() => {
    if (!enabled) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cancelSpeech();
        clearSelection();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [enabled, clearSelection]);

  // ----- Focus handler: Vorlesen bei Tastaturfokus -----

  useEffect(() => {
    if (!enabled || !supported) return;

    const handleFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      if (!el || !enabledRef.current) return;

      // Nur interaktive Elemente
      if (!el.matches(INTERACTIVE_SELECTOR) && !INPUT_TAGS.has(el.tagName))
        return;

      let name: string;
      if (INPUT_TAGS.has(el.tagName)) {
        name = resolveInputLabel(el);
      } else {
        name = resolveAccessibleName(el);
        if (name) name = resolveAccessibleDescription(el, name);
      }

      if (name) speak(name);
    };

    document.addEventListener("focusin", handleFocus);
    return () => document.removeEventListener("focusin", handleFocus);
  }, [enabled, supported]);

  // ----- Global pointer interceptor -----

  useEffect(() => {
    if (!enabled || !supported) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (!enabledRef.current) return;

      // Nur echte Pointer-Events (Maus, Touch, Pen)
      if (!e.pointerType || e.pointerType === "") return;

      // Modifier-Tasten auf Desktop → durchlassen (Ctrl+Click, etc.)
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;

      // Mittlere Maustaste → durchlassen
      if (e.button !== 0) return;

      const target = e.target as HTMLElement;
      if (!target) return;

      // Eingabefelder: durchlassen, Label wird via focusin gelesen
      if (
        INPUT_TAGS.has(target.tagName) ||
        target.getAttribute("contenteditable") === "true"
      ) {
        return;
      }

      // Nächstes interaktives Element finden
      const interactive = target.closest(INTERACTIVE_SELECTOR) as HTMLElement | null;
      if (!interactive) return;

      // Eingabefelder innerhalb von Switches/Checkboxen: behandeln als interaktiv
      // Prüfe ob das Element selbst ein Input-Wrapper ist
      const containsInput =
        interactive.querySelector("input, textarea, select");
      // Wenn das interaktive Element selbst NICHT role="switch"/etc ist
      // und ein reines Input enthält, durchlassen
      if (
        containsInput &&
        !interactive.getAttribute("role")?.match(
          /^(switch|checkbox|radio|button|tab|menuitem)$/
        ) &&
        interactive.tagName !== "BUTTON"
      ) {
        return;
      }

      // === Zweiter Tap auf dasselbe Element → Aktion ausführen ===
      if (selectedRef.current === interactive) {
        clearSelection();
        cancelSpeech();
        // Event durchlassen → originale Aktion wird ausgeführt
        return;
      }

      // === Erster Tap → Vorlesen, Aktion blockieren ===
      e.preventDefault();
      e.stopImmediatePropagation();

      selectElement(interactive);

      let name = resolveAccessibleName(interactive);
      if (name) {
        name = resolveAccessibleDescription(interactive, name);
      }

      if (name) {
        speak(name);
      }
    };

    // Capturing phase, damit wir VOR allen anderen Handlern sind
    document.addEventListener("pointerdown", handlePointerDown, true);

    // Auch click blockieren (für Links, die auf click navigieren)
    const handleClick = (e: MouseEvent) => {
      if (!enabledRef.current) return;
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      if (e.button !== 0) return;

      const target = e.target as HTMLElement;
      if (!target) return;
      if (INPUT_TAGS.has(target.tagName)) return;

      const interactive = target.closest(INTERACTIVE_SELECTOR) as HTMLElement | null;
      if (!interactive) return;

      // Wenn dieses Element gerade ausgewählt ist, wurde es schon im
      // pointerdown freigegeben — hier durchlassen
      // Ansonsten blockieren (erster Tap)
      if (interactive.hasAttribute("data-speech-selected")) {
        // Es ist ausgewählt und wird gerade freigegeben —
        // Wir müssen prüfen ob selectedRef noch darauf zeigt.
        // Wenn selectedRef null ist, bedeutet das, der pointerdown
        // hat es bereits freigegeben → durchlassen.
        if (selectedRef.current === null) return;
      }

      // Wenn es ein frisch markiertes Element ist → blockieren
      if (selectedRef.current === interactive) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("click", handleClick, true);
    };
  }, [enabled, supported, clearSelection, selectElement]);

  // ----- Cleanup bei Unmount -----

  useEffect(() => {
    return () => {
      cancelSpeech();
      clearSelection();
    };
  }, [clearSelection]);

  // ----- Render -----

  const value: SpeechAssistanceContextValue = {
    enabled,
    supported,
    setEnabled,
  };

  return (
    <SpeechAssistanceContext.Provider value={value}>
      {children}
    </SpeechAssistanceContext.Provider>
  );
}
