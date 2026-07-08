import "server-only";
import { OpenRouter, tool } from '@openrouter/agent';
import { z } from 'zod';
import { promises as fs } from 'fs';
import { join } from 'path';
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

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

async function getChatSystemPrompt() {
    if (chatSystemPromptCache) return chatSystemPromptCache;
    const filePath = join(process.cwd(), 'assets', 'prompts', 'system-chatbot.md');
    chatSystemPromptCache = await fs.readFile(filePath, 'utf8');
    return chatSystemPromptCache;
}

function buildProfileContext(profileFacts?: AiPublicProfileFacts): string {
    if (!profileFacts) return '';
    const parts: string[] = [];
    if (profileFacts.name) parts.push(`Name: ${profileFacts.name}`);
    if (profileFacts.username) parts.push(`Username: @${profileFacts.username}`);
    if (profileFacts.major) parts.push(`Studiengang: ${profileFacts.major}`);
    if (profileFacts.semester) parts.push(`Semester: ${profileFacts.semester}`);
    if (profileFacts.bio) parts.push(`Bio: ${profileFacts.bio}`);
    if (profileFacts.interests?.length) parts.push(`Interessen: ${profileFacts.interests.join(', ')}`);
    return parts.length ? `\nNutzerprofil:\n${parts.join('\n')}` : '';
}

function buildHistoryInput(prompt: string, history?: AiHistoryMessage[]): string {
    if (!history?.length) return prompt;
    const historyText = history
        .map(m => `${m.role === 'user' ? 'Nutzer' : 'Assistent'}: ${m.content}`)
        .join('\n');
    return `${historyText}\nNutzer: ${prompt}`;
}

async function askAi(
    prompt: string,
    context?: AiContext | null,
    history?: AiHistoryMessage[],
    profileFacts?: AiPublicProfileFacts,
) {
    const chatSystemPrompt = await getChatSystemPrompt();

    const major = context?.major ?? profileFacts?.major ?? null;
    const semester = context?.semester ?? profileFacts?.semester ?? null;

    const today = new Date().toLocaleDateString('de-DE', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const userContext = `\nHeutiges Datum: ${today}.`
        + (major ? ` Der Nutzer studiert ${major}${semester ? ` im ${semester}. Semester` : ''}.` : '')
        + buildProfileContext(profileFacts);

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
        input: buildHistoryInput(prompt, history),
        tools,
    });

    return await result.getText();
}

export { askAi };
