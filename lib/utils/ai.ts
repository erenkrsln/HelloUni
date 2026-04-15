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

async function askAi (prompt: string){
    const completion = await openRouter.chat.send({
        chatRequest: {
            model: 'openai/gpt-oss-120b:free',
            messages: [
                { 
                    role: 'system',
                    content: await getChatSystemPrompt(),
                },
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

async function getChatSystemPrompt (){
    const filePath = join(process.cwd(), 'assets', 'prompts', 'system-chatbot.md');
    const SystemPrompt = await fs.readFile(filePath, 'utf8');
    return SystemPrompt;
}

async function getAiUserId() {
    const aiUser = await fetchQuery(
        api.queries.getUserByUsername,
        { username: "chatbot" }
    );
    return aiUser?._id ?? 'ai' as Id<"users">;
}

export { askAi, getAiUserId };