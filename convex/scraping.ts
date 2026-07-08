"use node";
import { internalAction, action } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { v } from "convex/values";
import { extractText } from "unpdf";
import studiengangLinks from "../lib/studiengang-links.json";

const normalizeMajorName = (name: string) =>
  name.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

// ─── Shared helpers ───────────────────────────────────────────────────────────

const cleanText = (rawHtml: string) =>
  rawHtml
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;/gi, "")
    .replace(/\s+/g, " ")
    .trim();

const cleanMealName = (rawHtml: string) =>
  rawHtml
    .replace(/<sup>.*?<\/sup>/g, "")
    .replace(/<\/br>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s*[\(\[][A-Za-z0-9,\s]+[\)\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const makeAbsolute = (href: string) => {
  if (href.startsWith("http")) return href;
  if (href.startsWith("/")) return `https://www.th-nuernberg.de${href}`;
  if (href.startsWith("../"))
    return `https://www.th-nuernberg.de/${href.replace(/^\.\.\//, "")}`;
  return `https://www.th-nuernberg.de/${href}`;
};

// ─── Mensa ────────────────────────────────────────────────────────────────────

async function fetchMensaMeals(): Promise<Array<{ name: string; price: string }>> {
  const response = await fetch("https://www.werkswelt.de/?id=mohm");
  if (!response.ok) return [];

  const html = await response.text();
  const mealBlocks = html.split(/Aktionsessen \d+|Essen \d+/);

  return mealBlocks
    .slice(1)
    .map((block) => {
      const match = block.match(/<\/br>([\s\S]*?)(\d+,\d+)&nbsp;€&nbsp;\(Stud\.\)/);
      if (!match) return null;
      const name = cleanMealName(match[1]);
      return name ? { name, price: `${match[2]} €` } : null;
    })
    .filter((m): m is { name: string; price: string } => m !== null);
}

/** Wird täglich um 08:00 Uhr MEZ vom Cron aufgerufen.
 *  Kann auch manuell im Convex Dashboard unter scraping → scrapeMensa gestartet werden. */
export const scrapeMensa = action({
  args: {},
  handler: async (ctx) => {
    const meals = await fetchMensaMeals();
    await ctx.runMutation(api.scrapingMutations.upsertMensaCache, { meals });
    console.log(`[scrapeMensa] ${meals.length} Gerichte gecacht.`);
  },
});

// ─── Studiengang ──────────────────────────────────────────────────────────────

async function fetchStudiengangData(url: string) {
  const response = await fetch(url);
  if (!response.ok) return null;

  const html = await response.text();

  const paragraphs = Array.from(html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi))
    .map((m) => cleanText(m[1]))
    .filter((t) => t.length > 30 && !t.match(/^(\/|Home|Startseite|Navigation|×)/i));

  const headings = Array.from(html.matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi))
    .map((m) => cleanText(m[1]))
    .filter((t) => t.length > 3);

  const fullContent = [...headings, ...paragraphs].join("\n\n");

  const targetDocs = ["Modulhandbuch", "Studienplan", "Studien- und Prüfungsordnung"];

  const allPdfMatches = Array.from(
    html.matchAll(/<a[^>]*href=["']([^"']*\.pdf[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)
  )
    .map((m) => ({
      href: makeAbsolute(m[1]),
      text: cleanText(m[2]),
      targetIndex: targetDocs.findIndex((t) => cleanText(m[2]).startsWith(t)),
    }))
    .filter((m) => m.targetIndex !== -1);

  const pdfLinks = targetDocs
    .map((_, i) =>
      allPdfMatches
        .filter((m) => m.targetIndex === i)
        .sort((a, b) => a.text.length - b.text.length)[0]
    )
    .filter((m): m is NonNullable<typeof m> => m !== null && m !== undefined)
    .map(({ text, href }) => ({ text, href }));

  return { fullContent, pdfLinks };
}

async function parsePdfFromUrl(href: string): Promise<string> {
  const res = await fetch(href);
  if (!res.ok) return '';
  const buffer = new Uint8Array(await res.arrayBuffer());
  const { text } = await extractText(buffer, { mergePages: true });
  return text.trim();
}

/** Scrapt einen einzelnen Studiengang und speichert ihn im Cache.
 *  Wird vom Dispatcher (scrapeAllStudiengaenge) per Scheduler gestartet. */
export const scrapeOneStudiengang = internalAction({
  args: { major: v.string(), url: v.string() },
  handler: async (ctx, { major, url }) => {
    const data = await fetchStudiengangData(url);
    if (!data) {
      console.warn(`[scrapeOneStudiengang] Seite nicht erreichbar: ${url}`);
      return;
    }

    // PDFs parallel herunterladen und parsen – Fehler eines einzelnen PDFs brechen nicht ab
    const pdfContents = await Promise.all(
      data.pdfLinks.map(async ({ text, href }) => {
        try {
          const content = await parsePdfFromUrl(href);
          return { text, href, content };
        } catch {
          console.warn(`[scrapeOneStudiengang] PDF nicht parsebar: ${href}`);
          return { text, href, content: '' };
        }
      })
    );

    await ctx.runMutation(api.scrapingMutations.upsertStudiengangCache, {
      major,
      fullContent: data.fullContent,
      pdfLinks: data.pdfLinks,
      pdfContents,
    });
    console.log(`[scrapeOneStudiengang] Gecacht: ${major}`);
  },
});

// ─── Semestertermine ──────────────────────────────────────────────────────────

const SOSE_URL = "https://www.th-nuernberg.de/studium-karriere/wichtiges-zum-studienstart/termine-im-ueberblick/sommersemester/";
const SOSE_LABEL = "Sommersemester 2026";

async function fetchSemesterTermine(): Promise<{
  label: string;
  termine: Array<{ date: string; description: string }>;
}> {
  const response = await fetch(SOSE_URL);
  if (!response.ok) return { label: SOSE_LABEL, termine: [] };

  const html = await response.text();

  const tableMatch = html.match(/<table[^>]*class="[^"]*contenttable[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return { label: SOSE_LABEL, termine: [] };

  const cleanCell = (raw: string) =>
    raw
      .replace(/<sup>[\s\S]*?<\/sup>/gi, "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const rowMatches = Array.from(tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi));

  const termine = rowMatches
    .map((rowMatch) => {
      const cells = Array.from(rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi));
      if (cells.length < 2) return null;

      const dateRaw = cells[0][1];
      const descRaw = cells[1][1];

      const date = cleanCell(dateRaw);
      const description = cleanCell(descRaw);

      return date && description ? { date, description } : null;
    })
    .filter((t): t is NonNullable<typeof t> => t !== null);

  return { label: SOSE_LABEL, termine };
}

/** Scrapt die Semestertermine (SoSe 2026) und cacht sie.
 *  Wird zum Semesterbeginn vom Cron aufgerufen; kann auch manuell im Convex Dashboard gestartet werden. */
export const scrapeSemesterTermine = action({
  args: {},
  handler: async (ctx) => {
    const { label, termine } = await fetchSemesterTermine();
    await ctx.runMutation(api.scrapingMutations.upsertSemesterTermineCache, { label, termine });
    console.log(`[scrapeSemesterTermine] ${termine.length} Termine gecacht (${label}).`);
  },
});

/** Dispatcht pro Studiengang eine eigene Action via Scheduler.
 *  So blockiert kein einzelner Fehler den Rest, und das Action-Timeout greift nicht.
 *  Wird monatlich vom Cron aufgerufen; kann auch manuell im Convex Dashboard gestartet werden. */
export const scrapeAllStudiengaenge = action({
  args: {},
  handler: async (ctx) => {
    const entries = Object.entries(studiengangLinks) as Array<[string, string]>;
    for (let i = 0; i < entries.length; i++) {
      const [rawMajor, url] = entries[i];
      // HTML-Entities normalisieren damit der Key mit dem User-Profil übereinstimmt
      const major = normalizeMajorName(rawMajor);
      // 2 Sekunden Abstand zwischen den Requests → kein Rate-Limiting
      await ctx.scheduler.runAfter(
        i * 2000,
        internal.scraping.scrapeOneStudiengang,
        { major, url }
      );
    }
    console.log(`[scrapeAllStudiengaenge] ${entries.length} Jobs eingeplant.`);
  },
});
