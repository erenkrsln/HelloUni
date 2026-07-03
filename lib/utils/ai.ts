import "server-only";

import { api } from "@/convex/_generated/api";
import {
  executeHelloUniToolCall,
  helloUniTools,
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

const openRouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

let chatSystemPromptCache: string | null = null;
const MAX_TOOL_ITERATIONS = 5;

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
    .slice(-3)
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    })) satisfies ChatMessages[];
}

async function askAi(
  prompt: string,
  studiengangContext?: AiContext | null,
  history?: AiHistoryMessage[],
) {
  const chatSystemPrompt = await getChatSystemPrompt();
  const studiengangPrompt = buildStudiengangPrompt(studiengangContext);
  const runtimeContext: HelloUniToolRuntimeContext = {
    currentMajor: studiengangContext?.major,
    currentSemester: studiengangContext?.semester,
  };

  const messages: ChatMessages[] = [
    {
      role: "system",
      content: chatSystemPrompt,
    },
    ...(studiengangPrompt
      ? [{ role: "system" as const, content: studiengangPrompt }]
      : []),
    ...buildHistoryMessages(history),
    {
      role: "user",
      content: prompt,
    },
  ];

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration += 1) {
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
      break;
    }

    messages.push({
      role: "assistant",
      content: assistantMessage.content ?? null,
      ...(assistantMessage.toolCalls?.length
        ? { toolCalls: assistantMessage.toolCalls }
        : {}),
    });

    const toolCalls = assistantMessage.toolCalls ?? [];
    if (!toolCalls.length) {
      return extractMessageText(assistantMessage) || "Ich weiß es nicht.";
    }

    for (const toolCall of toolCalls) {
      const toolResult = await executeHelloUniToolCall(toolCall, runtimeContext);
      messages.push({
        role: "tool",
        toolCallId: toolResult.toolCallId,
        content: toolResult.content,
      });
    }
  }

  return "Ich konnte die Antwort nicht zuverlässig ermitteln.";
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
