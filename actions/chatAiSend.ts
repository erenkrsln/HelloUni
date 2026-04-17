"use server";
import { askAi, getAiUserId } from "@/lib/utils/ai";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export async function handleAi (msg: string, conversationId: Id<"conversations">) {
    try {
        const answer = await askAi (msg);
        const content = answer.choices?.[0]?.message?.content;
        if (typeof content === "string" && content.trim() !== "") {
            return content;
        }
        if (Array.isArray(content)) {
            return content
                .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
                .join("")
                .trim() || "Ich weiß es nicht.";
        }
        return "Ich weiß es nicht.";
    } catch (error) {
        console.error("Failed to send message:", error);
    }
    return "System Error";
};
