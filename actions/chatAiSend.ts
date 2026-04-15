"use server";
import { askAi, getAiUserId } from "@/lib/utils/ai";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export async function handleAi (msg: string, conversationId: Id<"conversations">) {
    try {
        const answer = await askAi (msg);
        const txt = answer.choices[0].message.content;
        return txt;
    } catch (error) {
        console.error("Failed to send message:", error);
    }
    return "System Error";
};
