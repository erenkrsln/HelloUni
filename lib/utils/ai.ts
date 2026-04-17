import "server-only";
import { OpenRouter } from '@openrouter/sdk';
import { promises as fs } from 'fs';
import { join } from 'path';
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const openRouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

let spoContentCache: string | null = null;
let dataSystemPromptCache: string | null = null;
const SPO_PLACEHOLDER = "{{SPO_DOCUMENT}}";

async function askAi(prompt: string) {
    const [chatSystemPrompt, dataSystemPrompt, spoContent] = await Promise.all([
        getChatSystemPrompt(),
        getDataSystemPrompt(),
        getSpoContent(),
    ]);
    const compiledDataPrompt = buildDataSystemPrompt(dataSystemPrompt, spoContent);

    const completion = await openRouter.chat.send({
        chatRequest: {
            model: 'openai/gpt-oss-120b:free',
            messages: [
                {
                    role: 'system',
                    content: chatSystemPrompt,
                },
                ...(compiledDataPrompt
                    ? [{
                        role: 'system' as const,
                        content: compiledDataPrompt,
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
    const filePath = join(process.cwd(), 'assets', 'prompts', 'system-chatbot.md');
    return fs.readFile(filePath, 'utf8');
}

async function getDataSystemPrompt() {
    if (dataSystemPromptCache !== null) return dataSystemPromptCache;

    try {
        const filePath = join(process.cwd(), 'assets', 'prompts', 'system-data.md');
        dataSystemPromptCache = (await fs.readFile(filePath, 'utf8')).trim();
        return dataSystemPromptCache;
    } catch {
        dataSystemPromptCache = "";
        return dataSystemPromptCache;
    }
}

function buildDataSystemPrompt(template: string, spoContent: string) {
    if (!template) return "";
    if (template.includes(SPO_PLACEHOLDER)) {
        return template.replace(SPO_PLACEHOLDER, spoContent);
    }
    return [template, "", "<spo_document>", spoContent, "</spo_document>"].join("\n");
}

async function getSpoContent() {
    if (spoContentCache) return spoContentCache;

    const filePath = join(process.cwd(), 'assets', 'data', 'spo.md');
    spoContentCache = await fs.readFile(filePath, 'utf8');
    return spoContentCache;
}

async function getAiUserId() {
    const aiUser = await fetchQuery(
        api.queries.getUserByUsername,
        { username: "chatbot" }
    );
    return aiUser?._id ?? 'ai' as Id<"users">;
}

export { askAi, getAiUserId };
