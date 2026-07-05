import "server-only";
import { OpenRouter, tool } from '@openrouter/agent';
import { z } from 'zod';
import { promises as fs } from 'fs';
import { join } from 'path';
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
const openRouter = new OpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
});

let chatSystemPromptCache: string | null = null;

async function getChatSystemPrompt() {
    if (chatSystemPromptCache) return chatSystemPromptCache;
    const filePath = join(process.cwd(), 'assets', 'prompts', 'system-chatbot.md');
    chatSystemPromptCache = await fs.readFile(filePath, 'utf8');
    return chatSystemPromptCache;
}

async function askAi(
    prompt: string,
    major?: string | null,
    semester?: number | null,
) {
    const chatSystemPrompt = await getChatSystemPrompt();

    const today = new Date().toLocaleDateString('de-DE', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const userContext = `\nHeutiges Datum: ${today}.`
        + (major ? ` Der Nutzer studiert ${major}${semester ? ` im ${semester}. Semester` : ''}.` : '');

    const getMensaPlanTool = tool({
        name: 'getMensaPlan',
        description: 'Holt den heutigen Speiseplan der Mensa Ohm (Mensateria der TH Nürnberg)',
        inputSchema: z.object({}),
        execute: async () => fetchQuery(api.queries.getMensaCache, {}),
    });

    const getStudiengangInfoTool = tool({
        name: 'getStudiengangInfo',
        description: 'Holt Modulhandbuch, Prüfungsordnung und Website-Informationen für den Studiengang des Nutzers',
        inputSchema: z.object({}),
        execute: async () => fetchQuery(api.queries.getStudiengangCache, { major: major! }),
    });

    const getSemesterTermineTool = tool({
        name: 'getSemesterTermine',
        description: 'Holt Vorlesungszeiten, Prüfungszeiträume und Semestertermine der TH Nürnberg',
        inputSchema: z.object({}),
        execute: async () => fetchQuery(api.queries.getSemesterTermineCache, {}),
    });

    const tools = major
        ? [getMensaPlanTool, getStudiengangInfoTool, getSemesterTermineTool]
        : [getMensaPlanTool, getSemesterTermineTool];

    const result = openRouter.callModel({
        model: 'google/gemini-2.5-flash',
        instructions: chatSystemPrompt + userContext,
        input: prompt,
        tools,
    });

    return await result.getText();
}

export { askAi };
