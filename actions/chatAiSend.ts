"use server";

import { api } from "@/convex/_generated/api";
import { askAi, AiContext } from "@/lib/utils/ai";
import { fetchQuery } from "convex/nextjs";

export async function handleAi(
    msg: string,
    major?: string,
    semester?: number,
) {
    try {
        const [studiengangCache, mensaCache] = await Promise.all([
            major ? fetchQuery(api.queries.getStudiengangCache, { major }) : null,
            fetchQuery(api.queries.getMensaCache, {}),
        ]);

        const studiengangContext: AiContext | null = major ? {
            major,
            semester: semester ?? 1,
            fullContent: studiengangCache?.fullContent ?? "",
            pdfLinks: studiengangCache?.pdfLinks ?? [],
            pdfContents: studiengangCache?.pdfContents,
            mensaMeals: mensaCache?.meals,
        } : mensaCache?.meals?.length ? {
            major: "",
            semester: 1,
            fullContent: "",
            pdfLinks: [],
            mensaMeals: mensaCache.meals,
        } : null;

        const answer = await askAi(msg, studiengangContext);
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
        return "System Error";
    }
}
