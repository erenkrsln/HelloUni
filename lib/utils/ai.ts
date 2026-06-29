import "server-only";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { OpenRouter } from "@openrouter/sdk";
import { fetchQuery } from "convex/nextjs";
import { promises as fs } from "fs";
import { join } from "path";

export type AiContext = {
  major: string;
  semester: number;
  fullContent: string;
  pdfLinks: Array<{ text: string; href: string }>;
  pdfContents?: Array<{ text: string; href: string; content: string }>;
  mensaMeals?: Array<{ name: string; price: string }>;
};

const openRouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

let chatSystemPromptCache: string | null = null;
let spoContentCache: string | null = null;
let dataSystemPromptCache: string | null = null;

const SPO_PLACEHOLDER = "{{SPO_DOCUMENT}}";
const PDF_TOTAL_BUDGET = 95_000;
const FULL_CONTENT_LIMIT = 15_000;

function buildPdfBlock(pdfContents?: Array<{ text: string; href: string; content: string }>) {
  const pdfs = pdfContents?.filter((pdf) => pdf.content) ?? [];
  if (!pdfs.length) return "";

  const budgetPerPdf = Math.floor(PDF_TOTAL_BUDGET / pdfs.length);
  return pdfs
    .map((pdf) => `\n=== ${pdf.text.toUpperCase()} ===\n${pdf.content.slice(0, budgetPerPdf)}\n`)
    .join("\n");
}

function buildDataSystemPrompt(template: string, spoContent: string) {
  if (!template) return "";
  if (template.includes(SPO_PLACEHOLDER)) {
    return template.replace(SPO_PLACEHOLDER, spoContent);
  }
  return [template, "", "<spo_document>", spoContent, "</spo_document>"].join("\n");
}

function buildStudiengangPrompt(studiengangContext?: AiContext | null) {
  const mensaBlock = studiengangContext?.mensaMeals?.length
    ? `\n=== HEUTIGER MENSAPLAN (Mensateria Ohm) ===\n${studiengangContext.mensaMeals
        .map((meal, index) => `Essen ${index + 1}: ${meal.name} – ${meal.price}`)
        .join("\n")}\n`
    : "";

  if (!studiengangContext?.major) {
    return mensaBlock ? `${mensaBlock}\nAntworte basierend auf diesen Informationen.` : "";
  }

  return `
KONTEXT-INFORMATIONEN:

Studiengang: ${studiengangContext.major}
Semester: ${studiengangContext.semester}

STUDIENGANGS-DETAILS (TH-Website):
${studiengangContext.fullContent.slice(0, FULL_CONTENT_LIMIT)}

DOKUMENTE (Links):
${studiengangContext.pdfLinks.map((pdf) => `- ${pdf.text}: ${pdf.href}`).join("\n")}

${buildPdfBlock(studiengangContext.pdfContents)}
${mensaBlock}

ANWEISUNG:
Durchsuche die oben stehenden Dokumente vollständig und beantworte die Frage direkt aus dem Text.
Wenn du die gesuchte Information im Text findest, gib sie präzise wieder.
Verweise auf ein PDF nur dann, wenn die Information trotz Suche nicht im bereitgestellten Text enthalten ist.
`;
}

async function askAi(prompt: string, studiengangContext?: AiContext | null) {
  const [chatSystemPrompt, dataSystemPrompt, spoContent] = await Promise.all([
    getChatSystemPrompt(),
    getDataSystemPrompt(),
    getSpoContent(),
  ]);

  const compiledDataPrompt = buildDataSystemPrompt(dataSystemPrompt, spoContent);
  const studiengangPrompt = buildStudiengangPrompt(studiengangContext);

  const completion = await openRouter.chat.send({
    chatRequest: {
      model: "openai/gpt-oss-120b:free",
      messages: [
        {
          role: "system",
          content: chatSystemPrompt,
        },
        ...(compiledDataPrompt
          ? [{ role: "system" as const, content: compiledDataPrompt }]
          : []),
        ...(studiengangPrompt
          ? [{ role: "system" as const, content: studiengangPrompt }]
          : []),
        {
          role: "user",
          content: prompt,
        },
      ],
      stream: false,
    },
  });

  return completion;
}

async function getChatSystemPrompt() {
  if (chatSystemPromptCache) return chatSystemPromptCache;
  const filePath = join(process.cwd(), "assets", "prompts", "system-chatbot.md");
  chatSystemPromptCache = await fs.readFile(filePath, "utf8");
  return chatSystemPromptCache;
}

async function getDataSystemPrompt() {
  if (dataSystemPromptCache !== null) return dataSystemPromptCache;

  try {
    const filePath = join(process.cwd(), "assets", "prompts", "system-data.md");
    dataSystemPromptCache = (await fs.readFile(filePath, "utf8")).trim();
    return dataSystemPromptCache;
  } catch {
    dataSystemPromptCache = "";
    return dataSystemPromptCache;
  }
}

async function getSpoContent() {
  if (spoContentCache) return spoContentCache;

  const filePath = join(process.cwd(), "assets", "data", "spo.md");
  spoContentCache = await fs.readFile(filePath, "utf8");
  return spoContentCache;
}

async function getAiUserId() {
  const aiUser = await fetchQuery(api.queries.getUserByUsername, {
    username: "chatbot",
  });
  return (aiUser?._id ?? "ai") as Id<"users">;
}

export { askAi, getAiUserId };
