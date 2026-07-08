import "server-only";

import { api } from "@/convex/_generated/api";
import { defaultSpoSourceId, spoSources } from "@/lib/spo-sources";
import studiengangLinks from "@/lib/studiengang-links.json";
import { fetchQuery } from "convex/nextjs";
import { promises as fs } from "fs";
import type { ChatFunctionTool, ChatToolCall } from "@openrouter/sdk/models";
import { join } from "path";

type ToolExecutionResult = {
  content: string;
  toolCallId: string;
};

export type SearchToolHit = {
  excerpt: string;
  score: number;
  href: string | null;
  sourceLabel: string;
  sourceType: "spo" | "website" | "pdf";
};

export type SearchSpoResult = {
  query: string;
  source: string;
  sourceId: string;
  title: string;
  documentUrl: string | null;
  sourcePageUrl: string | null;
  scrapedAt: number | null;
  major: string | null;
  usingFallback: boolean;
  hits: SearchToolHit[];
  message: string;
};

export type SpoSourceResult = {
  sourceId: string;
  available: boolean;
  title: string;
  major?: string | null;
  documentUrl: string | null;
  sourcePageUrl: string | null;
  scrapedAt: number | null;
  message: string;
};

export type HelloUniToolRuntimeContext = {
  currentMajor?: string;
  currentSemester?: number;
};

type SearchArgs = {
  query?: unknown;
  maxResults?: unknown;
  major?: unknown;
  sourceId?: unknown;
};

type StudiengangOverviewArgs = {
  major?: unknown;
};

type SpoSourceArgs = {
  sourceId?: unknown;
};

type KnownSourcesArgs = {
  includeStudiengaenge?: unknown;
};

type StudiengangCacheRecord = {
  major: string;
  fullContent: string;
  pdfLinks: Array<{ text: string; href: string }>;
  pdfContents?: Array<{ text: string; href: string; content: string }>;
  scrapedAt?: number;
};

type SpoCacheRecord = {
  sourceId: string;
  title: string;
  major: string;
  documentUrl: string;
  sourcePageUrl: string;
  content: string;
  scrapedAt?: number;
};

type SearchChunk = {
  content: string;
  href: string | null;
  sourceLabel: string;
  sourceType: "spo" | "website" | "pdf";
};

const SPO_TOOL_NAME = "search_spo";
const SPO_SOURCE_TOOL_NAME = "get_spo_source";
const MENSA_TOOL_NAME = "get_mensa_meals";
const STUDIENGANG_SEARCH_TOOL_NAME = "search_studiengang_documents";
const STUDIENGANG_OVERVIEW_TOOL_NAME = "get_studiengang_overview";
const KNOWN_SOURCES_TOOL_NAME = "list_known_sources";
const DEFAULT_MAX_RESULTS = 3;
const MAX_RESULTS_LIMIT = 5;
const MIN_CHUNK_LENGTH = 80;
const MAX_CHUNK_LENGTH = 1100;
const CHUNK_OVERLAP = 180;

const GERMAN_STOPWORDS = new Set([
  "aber",
  "als",
  "am",
  "an",
  "auch",
  "auf",
  "aus",
  "bei",
  "bin",
  "bis",
  "bist",
  "da",
  "dadurch",
  "daher",
  "darum",
  "das",
  "dass",
  "dein",
  "deine",
  "dem",
  "den",
  "der",
  "des",
  "dessen",
  "deshalb",
  "die",
  "dies",
  "dieser",
  "dieses",
  "doch",
  "dort",
  "du",
  "durch",
  "ein",
  "eine",
  "einem",
  "einen",
  "einer",
  "eines",
  "er",
  "es",
  "euer",
  "eure",
  "für",
  "hatte",
  "hatten",
  "hattest",
  "hattet",
  "hier",
  "hinter",
  "ich",
  "ihr",
  "ihre",
  "im",
  "in",
  "ist",
  "ja",
  "jede",
  "jedem",
  "jeden",
  "jeder",
  "jedes",
  "jener",
  "jenes",
  "jetzt",
  "kann",
  "kannst",
  "können",
  "könnt",
  "machen",
  "mein",
  "meine",
  "mit",
  "muss",
  "musst",
  "müssen",
  "müsst",
  "nach",
  "nachdem",
  "nein",
  "nicht",
  "nun",
  "oder",
  "seid",
  "sein",
  "seine",
  "sich",
  "sie",
  "sind",
  "soll",
  "sollen",
  "sollst",
  "sollt",
  "sonst",
  "soweit",
  "sowie",
  "und",
  "unser",
  "unsere",
  "unter",
  "vom",
  "von",
  "vor",
  "wann",
  "warum",
  "was",
  "weiter",
  "weitere",
  "wenn",
  "wer",
  "werde",
  "werden",
  "werdet",
  "weshalb",
  "wie",
  "wieder",
  "wieso",
  "wir",
  "wird",
  "wirst",
  "wo",
  "woher",
  "wohin",
  "zu",
  "zum",
  "zur",
  "über",
]);

const MAJOR_ALIAS_MAP = new Map<string, string>([
  [normalizeAliasKey("ME"), "Media Engineering (B.Eng.)"],
  [normalizeAliasKey("BME"), "Media Engineering (B.Eng.)"],
  [normalizeAliasKey("B-ME"), "Media Engineering (B.Eng.)"],
]);

let spoContentCache: string | null = null;
const studiengangCacheByMajor = new Map<string, StudiengangCacheRecord>();
const spoCacheBySourceId = new Map<string, SpoCacheRecord>();

function decodeHtmlEntities(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeMajorLabel(text: string) {
  return decodeHtmlEntities(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s*\((b|m)\.\s*(eng|sc|a)\.\)\s*/gi, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAliasKey(text: string) {
  return normalizeMajorLabel(text);
}

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasNormalizedTerm(text: string, term: string) {
  if (!text || !term) return false;
  const pattern = term
    .split(/\s+/)
    .map((part) => escapeRegex(part))
    .join("\\s+");

  return new RegExp(`(^|\\s)${pattern}(\\s|$)`, "i").test(text);
}

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ");
}

function tokenize(text: string) {
  return Array.from(
    new Set(
      normalizeText(text)
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3 && !GERMAN_STOPWORDS.has(token)),
    ),
  );
}

function clampMaxResults(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) return DEFAULT_MAX_RESULTS;
  return Math.max(1, Math.min(MAX_RESULTS_LIMIT, Math.floor(value)));
}

function scoreChunk(chunk: SearchChunk, query: string, queryTokens: string[]) {
  const normalizedChunk = normalizeText(chunk.content);
  const normalizedLabel = normalizeText(chunk.sourceLabel);
  const normalizedQuery = normalizeText(query);
  let score = 0;

  if (normalizedChunk.includes(normalizedQuery)) {
    score += 6;
  }

  if (normalizedLabel.includes(normalizedQuery)) {
    score += 3;
  }

  for (const token of queryTokens) {
    if (normalizedChunk.includes(token)) {
      score += 2;
    }
    if (normalizedLabel.includes(token)) {
      score += 1;
    }
  }

  return score;
}

function splitTextIntoChunks(text: string) {
  const paragraphs = text
    .split(/\n\s*\n+/)
    .map((chunk) => normalizeWhitespace(chunk))
    .filter((chunk) => chunk.length >= MIN_CHUNK_LENGTH);

  const chunks: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.length <= MAX_CHUNK_LENGTH) {
      chunks.push(paragraph);
      continue;
    }

    let start = 0;
    while (start < paragraph.length) {
      const end = Math.min(start + MAX_CHUNK_LENGTH, paragraph.length);
      const slice = paragraph.slice(start, end).trim();
      if (slice.length >= MIN_CHUNK_LENGTH) {
        chunks.push(slice);
      }
      if (end >= paragraph.length) break;
      start = Math.max(end - CHUNK_OVERLAP, start + 1);
    }
  }

  return chunks;
}

function rankChunks(chunks: SearchChunk[], query: string, maxResults: number) {
  const queryTokens = tokenize(query);

  return chunks
    .map((chunk) => ({
      ...chunk,
      excerpt: chunk.content.slice(0, 700),
      score: scoreChunk(chunk, query, queryTokens),
    }))
    .filter((chunk) => chunk.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, maxResults)
    .map(({ content, ...chunk }) => chunk);
}

function resolveMajor(rawMajor: unknown, runtimeContext: HelloUniToolRuntimeContext) {
  const knownMajors = getKnownStudiengaenge();

  const matchKnownMajor = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const aliasMatch = MAJOR_ALIAS_MAP.get(normalizeAliasKey(trimmed));
    if (aliasMatch) return aliasMatch;

    const directMatch = knownMajors.find((major) => major === trimmed);
    if (directMatch) return directMatch;

    const caseInsensitiveMatch = knownMajors.find(
      (major) => major.toLowerCase() === trimmed.toLowerCase(),
    );
    if (caseInsensitiveMatch) return caseInsensitiveMatch;

    const normalizedTarget = normalizeMajorLabel(trimmed);
    const normalizedMatches = knownMajors.filter(
      (major) => normalizeMajorLabel(major) === normalizedTarget,
    );
    if (normalizedMatches.length === 1) {
      return normalizedMatches[0];
    }

    const partialMatches = knownMajors.filter((major) => {
      const normalizedMajor = normalizeMajorLabel(major);
      return normalizedMajor.includes(normalizedTarget) || normalizedTarget.includes(normalizedMajor);
    });

    if (partialMatches.length === 1) {
      return partialMatches[0];
    }

    return trimmed;
  };

  if (typeof rawMajor === "string" && rawMajor.trim() !== "") {
    return matchKnownMajor(rawMajor);
  }

  if (typeof runtimeContext.currentMajor === "string" && runtimeContext.currentMajor.trim() !== "") {
    return matchKnownMajor(runtimeContext.currentMajor);
  }

  return null;
}

function resolveSpoSourceId(rawSourceId: unknown) {
  if (typeof rawSourceId === "string" && rawSourceId.trim() !== "") {
    return rawSourceId.trim();
  }

  return defaultSpoSourceId;
}

function getSpoSourceConfig(sourceId: string) {
  return spoSources.find((source) => source.sourceId === sourceId) ?? null;
}

function getKnownStudiengaenge() {
  const entries = Object.keys(studiengangLinks);
  return entries.map((major) => decodeHtmlEntities(major).trim());
}

export function findKnownMajorMention(text: string) {
  const normalizedText = normalizeMajorLabel(text);
  if (!normalizedText) return null;

  const aliasMatch = Array.from(MAJOR_ALIAS_MAP.entries())
    .sort((left, right) => right[0].length - left[0].length)
    .find(([alias]) => hasNormalizedTerm(normalizedText, alias));

  if (aliasMatch) {
    return aliasMatch[1];
  }

  return (
    getKnownStudiengaenge()
      .sort((left, right) => right.length - left.length)
      .find((major) => hasNormalizedTerm(normalizedText, normalizeMajorLabel(major))) ?? null
  );
}

async function getSpoContentFallback() {
  if (spoContentCache) return spoContentCache;

  const filePath = join(process.cwd(), "assets", "data", "spo.md");
  spoContentCache = await fs.readFile(filePath, "utf8");
  return spoContentCache;
}

async function getSpoCache(sourceId = defaultSpoSourceId) {
  const cached = spoCacheBySourceId.get(sourceId);
  if (cached) {
    return cached;
  }

  let cache: SpoCacheRecord | null = null;

  try {
    cache = await fetchQuery(api.queries.getSpoCache, {
      sourceId,
    }) as SpoCacheRecord | null;
  } catch (error) {
    console.warn(`[helloUniTools] getSpoCache fallback for ${sourceId}:`, error);
    return null;
  }

  if (cache) {
    spoCacheBySourceId.set(sourceId, cache);
  }
  return cache;
}

async function getStudiengangCache(major: string) {
  const cached = studiengangCacheByMajor.get(major);
  if (cached) {
    return cached;
  }

  let cache: StudiengangCacheRecord | null = null;

  try {
    cache = await fetchQuery(api.queries.getStudiengangCache, {
      major,
    }) as StudiengangCacheRecord | null;
  } catch (error) {
    console.warn(`[helloUniTools] getStudiengangCache fallback for ${major}:`, error);
    return null;
  }

  if (cache) {
    studiengangCacheByMajor.set(major, cache);
  }
  return cache;
}

function buildSpoChunks(content: string): SearchChunk[] {
  return splitTextIntoChunks(content).map((chunk) => ({
    content: chunk,
    href: null,
    sourceLabel: "SPO",
    sourceType: "spo",
  }));
}

function buildStudiengangChunks(cache: StudiengangCacheRecord): SearchChunk[] {
  const websiteChunks = splitTextIntoChunks(cache.fullContent).map((chunk) => ({
    content: chunk,
    href: null,
    sourceLabel: `${cache.major} Studiengangsseite`,
    sourceType: "website" as const,
  }));

  const pdfChunks = (cache.pdfContents ?? []).flatMap((pdf) =>
    splitTextIntoChunks(pdf.content).map((chunk) => ({
      content: chunk,
      href: pdf.href,
      sourceLabel: pdf.text,
      sourceType: "pdf" as const,
    })),
  );

  return [...websiteChunks, ...pdfChunks];
}

async function searchSpo(args: SearchArgs): Promise<SearchSpoResult> {
  const query = typeof args.query === "string" ? args.query.trim() : "";
  const maxResults = clampMaxResults(args.maxResults);
  const sourceId = resolveSpoSourceId(args.sourceId);
  const sourceConfig = getSpoSourceConfig(sourceId);

  if (!query) {
    return {
      query,
      source: "SPO",
      sourceId,
      title: sourceConfig?.title ?? "Studien- und Prüfungsordnung",
      documentUrl: sourceConfig?.documentUrl ?? null,
      sourcePageUrl: sourceConfig?.sourcePageUrl ?? null,
      scrapedAt: null,
      major: sourceConfig?.major ?? null,
      usingFallback: false,
      hits: [],
      message: "Die Suche wurde nicht ausgeführt, weil keine Suchanfrage übergeben wurde.",
    };
  }

  const cache = await getSpoCache(sourceId);
  const spoContent = cache?.content || await getSpoContentFallback();
  const hits = rankChunks(buildSpoChunks(spoContent), query, maxResults);

  return {
    query,
    source: "SPO",
    sourceId,
    title: cache?.title ?? sourceConfig?.title ?? "Studien- und Prüfungsordnung",
    documentUrl: cache?.documentUrl ?? sourceConfig?.documentUrl ?? null,
    sourcePageUrl: cache?.sourcePageUrl ?? sourceConfig?.sourcePageUrl ?? null,
    scrapedAt: cache?.scrapedAt ?? null,
    major: cache?.major ?? sourceConfig?.major ?? null,
    usingFallback: !cache,
    hits,
    message: hits.length
      ? `Es wurden ${hits.length} relevante SPO-Abschnitte gefunden.`
      : "Es wurden keine klar relevanten SPO-Abschnitte gefunden.",
  };
}

export async function searchSpoForAi(query: string, sourceId?: string) {
  return searchSpo({
    query,
    sourceId,
    maxResults: DEFAULT_MAX_RESULTS,
  });
}

async function getSpoSource(args: SpoSourceArgs): Promise<SpoSourceResult> {
  const sourceId = resolveSpoSourceId(args.sourceId);
  const cache = await getSpoCache(sourceId);
  const sourceConfig = getSpoSourceConfig(sourceId);

  if (!cache && !sourceConfig) {
    return {
      sourceId,
      available: false,
      title: "Studien- und Prüfungsordnung",
      documentUrl: null,
      sourcePageUrl: null,
      scrapedAt: null,
      message: "Für diese SPO ist aktuell keine automatisch aktualisierte Quelle im Cache vorhanden.",
    };
  }

  return {
    sourceId: cache?.sourceId ?? sourceConfig?.sourceId ?? sourceId,
    available: true,
    title: cache?.title ?? sourceConfig?.title ?? "Studien- und Prüfungsordnung",
    major: cache?.major ?? sourceConfig?.major ?? null,
    documentUrl: cache?.documentUrl ?? sourceConfig?.documentUrl ?? null,
    sourcePageUrl: cache?.sourcePageUrl ?? sourceConfig?.sourcePageUrl ?? null,
    scrapedAt: cache?.scrapedAt ?? null,
    message: `Die offizielle SPO-Quelle für ${cache?.major ?? sourceConfig?.major ?? "diese SPO"} ist hinterlegt.`,
  };
}

export async function getSpoSourceForAi(sourceId?: string) {
  return getSpoSource({
    sourceId,
  });
}

async function getMensaMeals() {
  let mensaCache: Awaited<ReturnType<typeof fetchQuery>> | null = null;

  try {
    mensaCache = await fetchQuery(api.queries.getMensaCache, {});
  } catch (error) {
    console.warn("[helloUniTools] getMensaMeals fallback:", error);
  }

  return {
    source: "Mensateria Ohm",
    scrapedAt: mensaCache?.scrapedAt ?? null,
    meals: mensaCache?.meals ?? [],
    message: mensaCache?.meals?.length
      ? `Es wurden ${mensaCache.meals.length} Gerichte gefunden.`
      : "Es wurden aktuell keine Mensa-Gerichte gefunden.",
  };
}

async function getStudiengangOverview(args: StudiengangOverviewArgs, runtimeContext: HelloUniToolRuntimeContext) {
  const major = resolveMajor(args.major, runtimeContext);
  if (!major) {
    return {
      major: null,
      available: false,
      message: "Es ist kein Studiengangskontext vorhanden.",
    };
  }

  const cache = await getStudiengangCache(major);
  if (!cache) {
    return {
      major,
      available: false,
      message: "Für diesen Studiengang sind aktuell keine hinterlegten Informationen vorhanden.",
    };
  }

  return {
    major,
    semester: runtimeContext.currentSemester ?? null,
    available: true,
    scrapedAt: cache.scrapedAt ?? null,
    websiteAvailable: cache.fullContent.trim().length > 0,
    pdfCount: cache.pdfLinks.length,
    documents: cache.pdfLinks.map((pdf) => ({
      title: pdf.text,
      href: pdf.href,
    })),
    message: `Für ${major} sind Website-Inhalte und ${cache.pdfLinks.length} Dokumente hinterlegt.`,
  };
}

async function searchStudiengangDocuments(args: SearchArgs, runtimeContext: HelloUniToolRuntimeContext) {
  const query = typeof args.query === "string" ? args.query.trim() : "";
  const major = resolveMajor(args.major, runtimeContext);
  const maxResults = clampMaxResults(args.maxResults);

  if (!major) {
    return {
      query,
      major: null,
      hits: [],
      message: "Die Suche wurde nicht ausgeführt, weil kein Studiengangskontext vorhanden ist.",
    };
  }

  if (!query) {
    return {
      query,
      major,
      hits: [],
      message: "Die Suche wurde nicht ausgeführt, weil keine Suchanfrage übergeben wurde.",
    };
  }

  const cache = await getStudiengangCache(major);
  if (!cache) {
    return {
      query,
      major,
      hits: [],
      message: "Für diesen Studiengang sind aktuell keine hinterlegten Informationen vorhanden.",
    };
  }

  const hits = rankChunks(buildStudiengangChunks(cache), query, maxResults);

  return {
    query,
    major,
    hits,
    message: hits.length
      ? `Es wurden ${hits.length} relevante Studiengangstreffer für ${major} gefunden.`
      : `Es wurden keine klar relevanten Studiengangstreffer für ${major} gefunden.`,
  };
}

async function listKnownSources(args: KnownSourcesArgs = {}) {
  const includeStudiengaenge = args.includeStudiengaenge !== false;
  const officialSpoMajors = spoSources.map((source) => source.major);
  const studiengaenge = includeStudiengaenge ? getKnownStudiengaenge() : [];
  const availableSources = [
    {
      type: "mensa",
      label: "Mensateria Ohm",
      description: "Aktueller Mensaplan mit Gerichten, Preisen und Zeitstempel der letzten Aktualisierung.",
    },
    {
      type: "spo",
      label: "Offizielle Studien- und Prüfungsordnungen",
      description: "Automatisch aktualisierte offizielle SPO-Quellen für ausgewählte Studiengänge.",
      count: officialSpoMajors.length,
      majors: officialSpoMajors,
    },
    {
      type: "studiengang",
      label: "Studiengangsinformationen",
      description: "Studiengangsseiten und verknüpfte PDF-Dokumente wie Modulhandbücher, Studienpläne und SPO-Links.",
      count: studiengaenge.length,
      majors: studiengaenge,
    },
  ];

  return {
    availableSources,
    officialSpoCount: officialSpoMajors.length,
    officialSpoMajors,
    mensaAvailable: true,
    mensaLabel: "Mensateria Ohm",
    studiengangCount: studiengaenge.length,
    studiengaenge,
    message: officialSpoMajors.length
      ? `Es sind eine Mensa-Quelle, ${officialSpoMajors.length} offizielle SPO-Quellen und ${studiengaenge.length} Studiengänge hinterlegt.`
      : `Es sind eine Mensa-Quelle, keine offiziellen SPO-Quellen und ${studiengaenge.length} Studiengänge hinterlegt.`,
  };
}

function getInvalidToolArgsResult(toolCallId: string, toolName: string, error: unknown): ToolExecutionResult {
  return {
    toolCallId,
    content: JSON.stringify({
      ok: false,
      toolName,
      error: error instanceof Error ? error.message : "Ungültige Tool-Argumente.",
    }),
  };
}

export const helloUniTools: ChatFunctionTool[] = [
  {
    type: "function",
    function: {
      name: KNOWN_SOURCES_TOOL_NAME,
      description:
        "Liefert eine Übersicht darüber, welche Datenquellen im System aktuell hinterlegt sind, zum Beispiel Mensa, offizielle SPO-Quellen und Studiengangsinformationen. Nutze dieses Tool besonders bei Fragen wie 'Welche Quellen kennst du?', 'Welche Studiengänge kennst du?' oder 'Für welche Studiengänge hast du SPO-Infos?'.",
      parameters: {
        type: "object",
        properties: {
          includeStudiengaenge: {
            type: "boolean",
            description: "Ob die Liste der hinterlegten Studiengänge mit zurückgegeben werden soll. Standard ist true.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: SPO_TOOL_NAME,
      description:
        "Durchsucht die automatisch aktualisierte offizielle Studien- und Prüfungsordnung nach relevanten Textstellen zu Prüfungen, Modulen, ECTS, Fristen, Voraussetzungen oder Regeln.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Die konkrete Frage oder die wichtigsten Suchbegriffe für die SPO-Suche.",
          },
          maxResults: {
            type: "integer",
            description: "Wie viele relevante Textausschnitte maximal zurückgegeben werden sollen. Standard ist 3.",
          },
          sourceId: {
            type: "string",
            description: "Optionale Kennung der SPO-Quelle. Kann weggelassen werden, wenn die Standardquelle genutzt werden soll.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: SPO_SOURCE_TOOL_NAME,
      description:
        "Liefert die offizielle URL und Metadaten der hinterlegten SPO-Quelle, damit bei Bedarf direkt auf das Originaldokument verwiesen werden kann.",
      parameters: {
        type: "object",
        properties: {
          sourceId: {
            type: "string",
            description: "Optionale Kennung der SPO-Quelle. Standard ist die primäre hinterlegte SPO.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: MENSA_TOOL_NAME,
      description:
        "Liefert den aktuell gespeicherten Mensaplan der Mensateria Ohm mit Gerichtsnamen, Preisen und Zeitstempel der letzten Aktualisierung.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: STUDIENGANG_OVERVIEW_TOOL_NAME,
      description:
        "Liefert eine Übersicht über die hinterlegten Informationen eines Studiengangs, inklusive Dokumentliste und Verfügbarkeit von Website- und PDF-Inhalten.",
      parameters: {
        type: "object",
        properties: {
          major: {
            type: "string",
            description: "Der Name des Studiengangs. Kann weggelassen werden, wenn bereits ein aktueller Studiengangskontext vorhanden ist.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: STUDIENGANG_SEARCH_TOOL_NAME,
      description:
        "Durchsucht die hinterlegten Studiengangsinformationen, also Website-Text und PDF-Inhalte, nach relevanten Abschnitten zu Modulen, Prüfungen, Voraussetzungen, Ablauf oder Organisation.",
      parameters: {
        type: "object",
        properties: {
          major: {
            type: "string",
            description: "Der Name des Studiengangs. Kann weggelassen werden, wenn bereits ein aktueller Studiengangskontext vorhanden ist.",
          },
          query: {
            type: "string",
            description: "Die konkrete Frage oder die wichtigsten Suchbegriffe für die Suche in den Studiengangsdokumenten.",
          },
          maxResults: {
            type: "integer",
            description: "Wie viele relevante Treffer maximal zurückgegeben werden sollen. Standard ist 3.",
          },
        },
        required: ["query"],
      },
    },
  },
];

export async function executeHelloUniToolCall(
  toolCall: ChatToolCall,
  runtimeContext: HelloUniToolRuntimeContext = {},
): Promise<ToolExecutionResult> {
  const toolName = toolCall.function.name;

  try {
    const parsedArgs = toolCall.function.arguments.trim()
      ? JSON.parse(toolCall.function.arguments)
      : {};

    if (toolName === SPO_TOOL_NAME) {
      return {
        toolCallId: toolCall.id,
        content: JSON.stringify(await searchSpo(parsedArgs as SearchArgs)),
      };
    }

    if (toolName === KNOWN_SOURCES_TOOL_NAME) {
      return {
        toolCallId: toolCall.id,
        content: JSON.stringify(await listKnownSources(parsedArgs as KnownSourcesArgs)),
      };
    }

    if (toolName === SPO_SOURCE_TOOL_NAME) {
      return {
        toolCallId: toolCall.id,
        content: JSON.stringify(await getSpoSource(parsedArgs as SpoSourceArgs)),
      };
    }

    if (toolName === MENSA_TOOL_NAME) {
      return {
        toolCallId: toolCall.id,
        content: JSON.stringify(await getMensaMeals()),
      };
    }

    if (toolName === STUDIENGANG_OVERVIEW_TOOL_NAME) {
      return {
        toolCallId: toolCall.id,
        content: JSON.stringify(await getStudiengangOverview(parsedArgs as StudiengangOverviewArgs, runtimeContext)),
      };
    }

    if (toolName === STUDIENGANG_SEARCH_TOOL_NAME) {
      return {
        toolCallId: toolCall.id,
        content: JSON.stringify(await searchStudiengangDocuments(parsedArgs as SearchArgs, runtimeContext)),
      };
    }

    return {
      toolCallId: toolCall.id,
      content: JSON.stringify({
        ok: false,
        toolName,
        error: "Unbekanntes Tool.",
      }),
    };
  } catch (error) {
    return getInvalidToolArgsResult(toolCall.id, toolName, error);
  }
}
