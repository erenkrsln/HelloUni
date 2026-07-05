"use server";
import { askAi } from "@/lib/utils/ai";

export async function handleAi(
    msg: string,
    major?: string,
    semester?: number,
) {
    try {
        const answer = await askAi(msg, major, semester);
        return answer?.trim() || "Ich weiß es nicht.";
    } catch (error) {
        console.error("Failed to send message:", error);
        return "System Error";
    }
}
