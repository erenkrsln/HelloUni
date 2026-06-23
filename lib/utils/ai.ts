import "server-only";
import { OpenRouter } from '@openrouter/sdk';
import { promises as fs } from 'fs';
import { join } from 'path';
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export type AiContext = {
  major: string
  semester: number
  fullContent: string
  pdfLinks: Array<{ text: string; href: string }>
  pdfContents?: Array<{ text: string; href: string; content: string }>
  mensaMeals?: Array<{ name: string; price: string }>
}

const openRouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

let chatSystemPromptCache: string | null = null;

// OpenInference-Provider (via OpenRouter) hat 32K Token ≈ 128K Zeichen Kontextlimit.
// ~2K Token Reserve für Output → ~30K Token = ~120K Zeichen für Input verfügbar
// Aufgeteilt: ~15K Website-Content + ~95K PDFs + ~10K Rest (System-Prompt, Mensa, Overhead)
const PDF_TOTAL_BUDGET = 95_000;
const FULL_CONTENT_LIMIT = 15_000;

function buildPdfBlock(pdfContents?: Array<{ text: string; href: string; content: string }>) {
  const pdfs = pdfContents?.filter(p => p.content) ?? [];
  if (!pdfs.length) return '';

  const budgetPerPdf = Math.floor(PDF_TOTAL_BUDGET / pdfs.length);
  return pdfs.map(p => `
=== ${p.text.toUpperCase()} ===
${p.content.slice(0, budgetPerPdf)}
`).join('\n');
}

async function askAi(
    prompt: string,
    studiengangContext?: AiContext | null
) {
    const chatSystemPrompt = await getChatSystemPrompt();
    
    const mensaBlock = studiengangContext?.mensaMeals?.length
        ? `\n=== HEUTIGER MENSAPLAN (Mensateria Ohm) ===\n${studiengangContext.mensaMeals.map((m, i) => `Essen ${i + 1}: ${m.name} – ${m.price}`).join('\n')}\n`
        : '';

    const studiengangPrompt = studiengangContext ? `
KONTEXT-INFORMATIONEN:

Studiengang: ${studiengangContext.major}
Semester: ${studiengangContext.semester}

STUDIENGANGS-DETAILS (TH-Website):
${studiengangContext.fullContent.slice(0, FULL_CONTENT_LIMIT)}

DOKUMENTE (Links):
${studiengangContext.pdfLinks.map(p => `- ${p.text}: ${p.href}`).join('\n')}

${buildPdfBlock(studiengangContext.pdfContents)}

${mensaBlock}

ANWEISUNG:
Durchsuche die oben stehenden Dokumente VOLLSTÄNDIG und beantworte die Frage direkt aus dem Text.
Wenn du die gesuchte Information im Text findest, zitiere oder fasse sie zusammen.
Verweise auf ein PDF nur dann, wenn die Information trotz Suche nicht im bereitgestellten Text enthalten ist.
` : mensaBlock
        ? `${mensaBlock}\n\nAntworte basierend auf diesen Informationen.`
        : null;

    const completion = await openRouter.chat.send({
        chatRequest: {
            model: 'openai/gpt-oss-120b:free',
            messages: [
                {
                    role: 'system',
                    content: chatSystemPrompt,
                },
                ...(studiengangPrompt
                    ? [{
                        role: 'system' as const,
                        content: studiengangPrompt,
                    }]
                    : []),
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            stream: false,
        }
    });
    return completion;
}

async function getChatSystemPrompt() {
    if (chatSystemPromptCache) return chatSystemPromptCache;
    const filePath = join(process.cwd(), 'assets', 'prompts', 'system-chatbot.md');
    chatSystemPromptCache = await fs.readFile(filePath, 'utf8');
    return chatSystemPromptCache;
}

async function getAiUserId() {
    const aiUser = await fetchQuery(
        api.queries.getUserByUsername,
        { username: "chatbot" }
    );
    return aiUser?._id ?? 'ai' as Id<"users">;
}

export { askAi, getAiUserId };
