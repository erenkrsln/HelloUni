import "server-only";

import { api } from "@/convex/_generated/api";
import {
  executeHelloUniToolCall,
  findKnownMajorMention,
  getSpoSourceForAi,
  helloUniTools,
  searchSpoForAi,
  type SpoSourceResult,
  type SearchSpoResult,
  type HelloUniToolRuntimeContext,
} from "@/lib/ai/tools";
import { Id } from "@/convex/_generated/dataModel";
import { OpenRouter } from "@openrouter/sdk";
import type { ChatAssistantMessage, ChatMessages } from "@openrouter/sdk/models";
import { fetchQuery } from "convex/nextjs";
import { promises as fs } from "fs";
import { join } from "path";

export type AiContext = {
  major: string;
  semester: number;
};

export type AiHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AiPublicProfileFacts = {
  name?: string;
  username?: string;
  major?: string;
  semester?: number;
  bio?: string;
  interests?: string[];
  followerCount?: number;
  followingCount?: number;
};

const openRouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

let chatSystemPromptCache: string | null = null;
const MAX_TOOL_ITERATIONS = 5;
const AI_TOOL_DEBUG_ENABLED = process.env.HELLOUNI_AI_TOOL_DEBUG === "1";
const HISTORY_MESSAGE_LIMIT = 6;

type ToolResultPayload = {
  available?: boolean;
  title?: string;
  major?: string | null;
  sourceId?: string;
  message?: string;
  source?: string;
  sourceLabel?: string;
  documentUrl?: string | null;
  sourcePageUrl?: string | null;
  hits?: Array<{
    excerpt?: string;
    content?: string;
    sourceLabel?: string;
    href?: string | null;
  }>;
  meals?: Array<{
    name?: string;
    price?: string;
  }>;
};

type ConversationMemory = {
  userName?: string;
  username?: string;
  major?: string;
  semester?: number;
  bio?: string;
  interests?: string[];
  followerCount?: number;
  followingCount?: number;
};

type ToolResultRecord = {
  toolName: string;
  payload: ToolResultPayload;
};

function truncateForLog(value: string, maxLength = 280) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
}

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function logAiToolDebug(event: string, payload: Record<string, unknown>) {
  if (!AI_TOOL_DEBUG_ENABLED) return;
  console.log(`[ai-tool-debug] ${event}`, payload);
}

function extractUserName(text: string) {
  const match = text.match(/\b(?:ich\s+hei(?:ß|ss)e|mein\s+name\s+ist)\s+([^\s,!.?]+)/i);
  if (!match) return null;

  const candidate = match[1]?.trim();
  if (!candidate) return null;

  return candidate.replace(/[.,!?]+$/g, "");
}

function extractConversationMemory(
  prompt: string,
  history?: AiHistoryMessage[],
  profileFacts?: AiPublicProfileFacts,
): ConversationMemory {
  const memory: ConversationMemory = {
    userName: profileFacts?.name?.trim() || undefined,
    username: profileFacts?.username?.trim() || undefined,
    major: profileFacts?.major?.trim() || undefined,
    semester: typeof profileFacts?.semester === "number" ? profileFacts.semester : undefined,
    bio: profileFacts?.bio?.trim() || undefined,
    interests: Array.isArray(profileFacts?.interests)
      ? profileFacts.interests.map((interest) => interest.trim()).filter((interest) => interest !== "")
      : undefined,
    followerCount: typeof profileFacts?.followerCount === "number" ? profileFacts.followerCount : undefined,
    followingCount: typeof profileFacts?.followingCount === "number" ? profileFacts.followingCount : undefined,
  };
  const userMessages = [
    ...(history ?? []).filter((message) => message.role === "user"),
    { role: "user" as const, content: prompt },
  ];

  for (const message of userMessages) {
    const userName = extractUserName(message.content);
    if (userName) {
      memory.userName = userName;
    }
  }

  return memory;
}

function buildConversationMemoryPrompt(memory: ConversationMemory) {
  const facts: string[] = [];

  if (memory.userName) facts.push(`Name: ${memory.userName}`);
  if (memory.username) facts.push(`Username: ${memory.username}`);
  if (memory.major) facts.push(`Studiengang: ${memory.major}`);
  if (typeof memory.semester === "number") facts.push(`Semester: ${memory.semester}`);
  if (memory.bio) facts.push(`Bio: ${memory.bio}`);
  if (memory.interests?.length) facts.push(`Interessen: ${memory.interests.join(", ")}`);
  if (typeof memory.followerCount === "number") facts.push(`Follower: ${memory.followerCount}`);
  if (typeof memory.followingCount === "number") facts.push(`Folgt: ${memory.followingCount}`);

  if (!facts.length) {
    return "";
  }

  return `
KURZZEIT-KONTEXT:

Zur nutzenden Person sind folgende nicht-private Profilangaben bekannt:
${facts.join("\n")}

Wenn nach diesen persönlichen Fakten gefragt wird, verwende diesen Kontext direkt.
`;
}

function tryAnswerFromMemory(prompt: string, memory: ConversationMemory) {
  if (memory.userName && /\b(wie\s+ich\s+hei(?:ß|ss)e|wie\s+hei(?:ß|ss)e\s+ich|kennst\s+du\s+meinen\s+namen|wei(?:ß|ss)t\s+du\s+noch\s+wie\s+ich\s+hei(?:ß|ss)e)\b/i.test(prompt)) {
    return `Du heißt ${memory.userName}.`;
  }

  if (memory.username && /\b(wie\s+ist\s+mein\s+username|wie\s+lautet\s+mein\s+username|wie\s+hei(?:ß|ss)e\s+ich\s+hier|welchen\s+username\s+habe\s+ich)\b/i.test(prompt)) {
    return `Dein Username ist ${memory.username}.`;
  }

  if (memory.major && /\b(was\s+studiere\s+ich|welchen\s+studiengang\s+habe\s+ich|welcher\s+studiengang\s+ist\s+in\s+meinem\s+profil|wei(?:ß|ss)t\s+du\s+was\s+ich\s+studiere)\b/i.test(prompt)) {
    return `Du studierst ${memory.major}.`;
  }

  if (typeof memory.semester === "number" && /\b(in\s+welchem\s+semester\s+bin\s+ich|welches\s+semester\s+habe\s+ich|wei(?:ß|ss)t\s+du\s+in\s+welchem\s+semester\s+ich\s+bin)\b/i.test(prompt)) {
    return `Du bist im ${memory.semester}. Semester.`;
  }

  if (typeof memory.followerCount === "number" && /\b(wie\s+viele\s+follower\s+habe\s+ich|anzahl\s+meiner\s+follower|wie\s+hoch\s+ist\s+meine\s+followerzahl)\b/i.test(prompt)) {
    return `Du hast ${memory.followerCount} Follower.`;
  }

  if (typeof memory.followingCount === "number" && /\b(wie\s+vielen\s+folge\s+ich|wie\s+viele\s+folge\s+ich|wie\s+viele\s+personen\s+folge\s+ich|following)\b/i.test(prompt)) {
    return `Du folgst ${memory.followingCount} Profilen.`;
  }

  if (memory.bio && /\b(was\s+steht\s+in\s+meiner\s+bio|wie\s+lautet\s+meine\s+bio|kennst\s+du\s+meine\s+bio)\b/i.test(prompt)) {
    return `In deiner Bio steht: ${memory.bio}`;
  }

  if (memory.interests?.length && /\b(welche\s+interessen\s+habe\s+ich|was\s+sind\s+meine\s+interessen|kennst\s+du\s+meine\s+interessen|was\s+steht\s+bei\s+mir\s+als\s+interessen\s+im\s+profil)\b/i.test(prompt)) {
    return `Deine Interessen sind: ${memory.interests.join(", ")}.`;
  }

  return null;
}

function inferMajorFromConversation(
  prompt: string,
  studiengangContext?: AiContext | null,
  history?: AiHistoryMessage[],
  profileFacts?: AiPublicProfileFacts,
) {
  const historyText = history?.map((message) => message.content).join("\n") ?? "";
  const mentionedMajor = findKnownMajorMention(`${prompt}\n${historyText}`);

  if (mentionedMajor) {
    return mentionedMajor;
  }

  if (studiengangContext?.major) {
    return studiengangContext.major;
  }

  if (profileFacts?.major?.trim()) {
    return profileFacts.major.trim();
  }

  return null;
}

function getConversationText(history?: AiHistoryMessage[]) {
  return history?.map((message) => message.content).join("\n") ?? "";
}

function isSpoFocusedPrompt(prompt: string) {
  return /\b(bachelorarbeit|regelstudienzeit|spo|ects|prüfung|pruefung|frist|voraussetzung|zulassung|module?|abschlussarbeit)\b/i.test(prompt);
}

function isSourceFocusedPrompt(prompt: string) {
  return /\b(quelle|woher|link|url|pdf|dokument|original|offizielle\s+quelle|quelle\s+nennen)\b/i.test(prompt);
}

function hasRecentSpoContext(prompt: string, history?: AiHistoryMessage[]) {
  return isSpoFocusedPrompt(prompt) || isSpoFocusedPrompt(getConversationText(history));
}

function detectRecentSpoTopic(prompt: string, history?: AiHistoryMessage[]) {
  const text = `${getConversationText(history)}\n${prompt}`;

  if (/\bbachelorarbeit\b/i.test(text)) {
    return "zur Bachelorarbeit";
  }

  if (/\bregelstudienzeit\b/i.test(text)) {
    return "zur Regelstudienzeit";
  }

  if (/\bects\b/i.test(text)) {
    return "zu ECTS";
  }

  if (/\bfrist/i.test(text)) {
    return "zu Fristen";
  }

  if (/\bvoraussetzung|zulassung\b/i.test(text)) {
    return "zu Voraussetzungen";
  }

  return "";
}

function buildPrefetchedSpoPrompt(result: SearchSpoResult) {
  if (!result.hits.length) {
    return "";
  }

  const excerpts = result.hits
    .slice(0, 3)
    .map((hit, index) => `${index + 1}. ${hit.excerpt}`)
    .join("\n");

  return `
VORAB GEFUNDENE SPO-TREFFER:

Quelle: ${result.title}
Studiengang: ${result.major ?? "unbekannt"}
Treffer:
${excerpts}

Wenn die Nutzendenfrage dazu passt, beantworte sie bevorzugt auf Basis dieser Treffer.
`;
}

function buildPrefetchedSourcePrompt(result: SpoSourceResult) {
  if (!result.available) {
    return "";
  }

  return `
VORAB GEFUNDENE QUELLE:

Titel: ${result.title}
Studiengang: ${result.major ?? "unbekannt"}
PDF: ${result.documentUrl ?? "nicht vorhanden"}
Studiengangsseite: ${result.sourcePageUrl ?? "nicht vorhanden"}

Wenn nach der Quelle oder dem Originaldokument gefragt wird, nutze diese Angaben direkt.
`;
}

function buildSpoSourceAnswer(result: SpoSourceResult, topicHint = "") {
  if (!result.available) {
    return result.message;
  }

  const topicPart = topicHint ? ` ${topicHint}` : "";
  const lines = [`Die Info stammt aus der offiziellen ${result.title}${topicPart}.`];

  if (result.documentUrl) {
    lines.push(`PDF-Link: ${result.documentUrl}`);
  } else {
    lines.push("PDF-Link: keine PDF-URL hinterlegt");
  }

  if (result.sourcePageUrl) {
    lines.push(`Studiengangsseite: ${result.sourcePageUrl}`);
  }

  return lines.join("\n");
}

function buildToolFallbackResponse(results: ToolResultRecord[], preferSourceAnswer = false) {
  for (let index = results.length - 1; index >= 0; index -= 1) {
    const result = results[index];
    const payload = result.payload;

    if (
      preferSourceAnswer &&
      (result.toolName === "get_spo_source" || result.toolName === "search_spo") &&
      payload.title &&
      (payload.documentUrl || payload.sourcePageUrl)
    ) {
      return buildSpoSourceAnswer({
        sourceId: payload.sourceId ?? "default",
        available: payload.available ?? true,
        title: payload.title,
        major: payload.major ?? null,
        documentUrl: payload.documentUrl ?? null,
        sourcePageUrl: payload.sourcePageUrl ?? null,
        scrapedAt: null,
        message: payload.message ?? "",
      });
    }

    if (payload.hits?.length && (result.toolName === "search_spo" || result.toolName === "search_studiengang_documents")) {
      const bestHit = payload.hits[0];
      const excerpt = bestHit?.excerpt?.trim() || bestHit?.content?.trim();
      if (excerpt) {
        return excerpt;
      }
    }

    if (payload.meals?.length && result.toolName === "get_mensa_meals") {
      return payload.meals
        .slice(0, 3)
        .map((meal) => [meal.name, meal.price].filter(Boolean).join(", "))
        .filter((line) => line.trim() !== "")
        .join("\n");
    }

    if (
      typeof payload.message === "string" &&
      payload.message.trim() !== "" &&
      (result.toolName === "search_spo" || result.toolName === "search_studiengang_documents" || result.toolName === "get_mensa_meals")
    ) {
      return payload.message.trim();
    }
  }

  return null;
}

function createToolCallSignature(toolName: string, rawArguments?: string | null) {
  const normalizedArgs = rawArguments?.trim() || "{}";
  return `${toolName}:${normalizedArgs}`;
}

function buildStudiengangPrompt(studiengangContext?: AiContext | null) {
  if (!studiengangContext?.major) {
    return "";
  }

  return `
KONTEXT-INFORMATIONEN:

Studiengang: ${studiengangContext.major}
Semester: ${studiengangContext.semester}

ANWEISUNG:
Wenn die Frage studiengangsspezifische Inhalte betrifft, nutze zuerst die verfügbaren Studiengangs-Tools.
Verwende get_studiengang_overview für die Dokumentübersicht.
Verwende search_studiengang_documents für konkrete Fragen zu Modulen, Prüfungen, Voraussetzungen, Abläufen oder Dokumentinhalten.
Für SPO-Themen wie Regelstudienzeit, Bachelorarbeit, Prüfungsregeln, Voraussetzungen, ECTS oder Fristen verwende bevorzugt search_spo.
`;
}

function extractMessageText(message?: ChatAssistantMessage | null) {
  const content = message?.content;

  if (typeof content === "string" && content.trim() !== "") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const text = content
      .map((part) => ("text" in part && typeof part.text === "string" ? part.text : ""))
      .join("")
      .trim();

    if (text) return text;
  }

  return "";
}

function buildHistoryMessages(history?: AiHistoryMessage[]) {
  if (!history?.length) return [];

  return history
    .filter((message) => message.content.trim() !== "")
    .slice(-HISTORY_MESSAGE_LIMIT)
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    })) satisfies ChatMessages[];
}

async function askAi(
  prompt: string,
  studiengangContext?: AiContext | null,
  history?: AiHistoryMessage[],
  profileFacts?: AiPublicProfileFacts,
) {
  const memory = extractConversationMemory(prompt, history, profileFacts);
  const directMemoryAnswer = tryAnswerFromMemory(prompt, memory);
  if (directMemoryAnswer) {
    logAiToolDebug("request:answered_from_memory", {
      prompt: truncateForLog(prompt),
      userName: memory.userName ?? null,
      responsePreview: directMemoryAnswer,
    });
    return directMemoryAnswer;
  }

  const chatSystemPrompt = await getChatSystemPrompt();
  const studiengangPrompt = buildStudiengangPrompt(studiengangContext);
  const memoryPrompt = buildConversationMemoryPrompt(memory);
  const inferredMajor = inferMajorFromConversation(prompt, studiengangContext, history, profileFacts);
  const sourceFocusedPrompt = isSourceFocusedPrompt(prompt);
  const recentSpoContext = hasRecentSpoContext(prompt, history);
  const topicHint = detectRecentSpoTopic(prompt, history);
  let prefetchedSpoResult: SearchSpoResult | null = null;
  let prefetchedSpoSource: SpoSourceResult | null = null;

  if (sourceFocusedPrompt && recentSpoContext && inferredMajor) {
    try {
      prefetchedSpoSource = await getSpoSourceForAi();
    } catch (error) {
      logAiToolDebug("prefetch:spo_source_failed", {
        prompt: truncateForLog(prompt),
        major: inferredMajor,
        error: error instanceof Error ? error.message : "Unknown source prefetch error",
      });
    }
  }

  if (prefetchedSpoSource?.available && sourceFocusedPrompt && recentSpoContext) {
    const directSourceAnswer = buildSpoSourceAnswer(prefetchedSpoSource, topicHint);
    logAiToolDebug("request:answered_from_source_prefetch", {
      prompt: truncateForLog(prompt),
      major: inferredMajor ?? null,
      responsePreview: truncateForLog(directSourceAnswer),
    });
    return directSourceAnswer;
  }

  if (inferredMajor && isSpoFocusedPrompt(prompt)) {
    try {
      prefetchedSpoResult = await searchSpoForAi(prompt);
    } catch (error) {
      logAiToolDebug("prefetch:spo_failed", {
        prompt: truncateForLog(prompt),
        major: inferredMajor,
        error: error instanceof Error ? error.message : "Unknown prefetch error",
      });
    }
  }

  const prefetchedSpoPrompt = prefetchedSpoResult
    ? buildPrefetchedSpoPrompt(prefetchedSpoResult)
    : "";
  const prefetchedSourcePrompt = prefetchedSpoSource
    ? buildPrefetchedSourcePrompt(prefetchedSpoSource)
    : "";
  const runtimeContext: HelloUniToolRuntimeContext = {
    currentMajor: inferredMajor ?? undefined,
    currentSemester: studiengangContext?.semester,
  };
  const seenToolCallSignatures = new Set<string>();
  const parsedToolResults: ToolResultRecord[] = [];

  if (prefetchedSpoResult) {
    parsedToolResults.push({ toolName: "search_spo", payload: prefetchedSpoResult });
  }
  if (prefetchedSpoSource) {
    parsedToolResults.push({ toolName: "get_spo_source", payload: prefetchedSpoSource });
  }

  logAiToolDebug("request:start", {
    prompt: truncateForLog(prompt),
    major: runtimeContext.currentMajor ?? null,
    semester: runtimeContext.currentSemester ?? null,
    historyCount: history?.length ?? 0,
    userName: memory.userName ?? null,
    prefetchedSpoHits: prefetchedSpoResult?.hits.length ?? 0,
    sourceFocusedPrompt,
  });

  const messages: ChatMessages[] = [
    {
      role: "system",
      content: chatSystemPrompt,
    },
    ...(studiengangPrompt
      ? [{ role: "system" as const, content: studiengangPrompt }]
      : []),
    ...(memoryPrompt
      ? [{ role: "system" as const, content: memoryPrompt }]
      : []),
    ...(prefetchedSpoPrompt
      ? [{ role: "system" as const, content: prefetchedSpoPrompt }]
      : []),
    ...(prefetchedSourcePrompt
      ? [{ role: "system" as const, content: prefetchedSourcePrompt }]
      : []),
    ...buildHistoryMessages(history),
    {
      role: "user",
      content: prompt,
    },
  ];

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration += 1) {
    logAiToolDebug("iteration:start", {
      iteration: iteration + 1,
      messageCount: messages.length,
    });

    const completion = await openRouter.chat.send({
      chatRequest: {
        model: "openai/gpt-oss-120b",
        messages,
        tools: helloUniTools,
        toolChoice: "auto",
        parallelToolCalls: false,
        stream: false,
      },
    });

    const assistantMessage = completion.choices?.[0]?.message;
    if (!assistantMessage) {
      logAiToolDebug("iteration:no_assistant_message", {
        iteration: iteration + 1,
      });
      break;
    }

    const assistantText = extractMessageText(assistantMessage);
    logAiToolDebug("iteration:assistant_message", {
      iteration: iteration + 1,
      toolCallCount: assistantMessage.toolCalls?.length ?? 0,
      textPreview: assistantText ? truncateForLog(assistantText) : null,
    });

    messages.push({
      role: "assistant",
      content: assistantMessage.content ?? null,
      ...(assistantMessage.toolCalls?.length
        ? { toolCalls: assistantMessage.toolCalls }
        : {}),
    });

    const toolCalls = assistantMessage.toolCalls ?? [];
    if (!toolCalls.length) {
      logAiToolDebug("request:complete_without_tools", {
        iteration: iteration + 1,
        responsePreview: truncateForLog(assistantText || "Sorry, das weiß ich leider nicht."),
      });
      return extractMessageText(assistantMessage) || buildToolFallbackResponse(parsedToolResults, sourceFocusedPrompt) || "Sorry, das weiß ich leider nicht.";
    }

    for (const toolCall of toolCalls) {
      const parsedArguments = safeJsonParse<Record<string, unknown>>(toolCall.function.arguments);
      const toolCallSignature = createToolCallSignature(
        toolCall.function.name,
        toolCall.function.arguments,
      );

      logAiToolDebug("tool:call", {
        iteration: iteration + 1,
        toolName: toolCall.function.name,
        toolCallId: toolCall.id,
        args: parsedArguments ?? toolCall.function.arguments,
      });

      if (seenToolCallSignatures.has(toolCallSignature)) {
        const fallbackFromTools = buildToolFallbackResponse(parsedToolResults, sourceFocusedPrompt);
        logAiToolDebug("tool:duplicate_blocked", {
          iteration: iteration + 1,
          toolName: toolCall.function.name,
          toolCallId: toolCall.id,
          args: parsedArguments ?? toolCall.function.arguments,
          fallbackPreview: fallbackFromTools ? truncateForLog(fallbackFromTools) : null,
        });
        return fallbackFromTools || extractMessageText(assistantMessage) || "Sorry, ich konnte die Antwort nicht zuverlässig ermitteln.";
      }

      seenToolCallSignatures.add(toolCallSignature);
      const toolResult = await executeHelloUniToolCall(toolCall, runtimeContext);
      const parsedResult = safeJsonParse<ToolResultPayload>(toolResult.content);

      if (parsedResult) {
        parsedToolResults.push({
          toolName: toolCall.function.name,
          payload: parsedResult,
        });
      }

      logAiToolDebug("tool:result", {
        iteration: iteration + 1,
        toolName: toolCall.function.name,
        toolCallId: toolResult.toolCallId,
        result: parsedResult ?? truncateForLog(toolResult.content, 500),
      });

      messages.push({
        role: "tool",
        toolCallId: toolResult.toolCallId,
        content: toolResult.content,
      });
    }
  }

  const fallbackFromTools = buildToolFallbackResponse(parsedToolResults, sourceFocusedPrompt);
  logAiToolDebug("request:max_iterations_reached", {
    maxIterations: MAX_TOOL_ITERATIONS,
    fallbackPreview: fallbackFromTools ? truncateForLog(fallbackFromTools) : null,
  });
  return fallbackFromTools || "Sorry, ich konnte die Antwort nicht zuverlässig ermitteln.";
}

async function getChatSystemPrompt() {
  if (chatSystemPromptCache) return chatSystemPromptCache;
  const filePath = join(process.cwd(), "assets", "prompts", "system-chatbot.md");
  chatSystemPromptCache = await fs.readFile(filePath, "utf8");
  return chatSystemPromptCache;
}

async function getAiUserId() {
  const aiUser = await fetchQuery(api.queries.getUserByUsername, {
    username: "chatbot",
  });
  return (aiUser?._id ?? "ai") as Id<"users">;
}

export { askAi, getAiUserId };
