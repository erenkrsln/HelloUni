"use server";

import { api } from "@/convex/_generated/api";
import { askAi, AiContext } from "@/lib/utils/ai";
import { fetchQuery } from "convex/nextjs";

type ErrorPayload = {
    message?: string;
    error?: {
        code?: number;
        message?: string;
        metadata?: {
            raw?: string;
        };
    };
    cause?: ErrorPayload;
    ["body$"]?: string;
};

function getNestedProviderError(payload: ErrorPayload | undefined) {
    return payload?.error ?? payload?.cause?.error;
}

function getBodyPayload(payload: ErrorPayload | undefined) {
    const bodyText = payload?.["body$"];
    if (!bodyText) return null;

    try {
        return JSON.parse(bodyText) as ErrorPayload;
    } catch {
        return null;
    }
}

function getErrorMessage(error: unknown) {
    const fallbackMessage = "Es ist ein technischer Fehler aufgetreten. Bitte versuche es gleich noch einmal.";
    const errorPayload = (typeof error === "object" && error !== null ? error : {}) as ErrorPayload;
    const bodyPayload = getBodyPayload(errorPayload);
    const providerError = getNestedProviderError(errorPayload) ?? getNestedProviderError(bodyPayload ?? undefined);
    const errorText = [
        error instanceof Error ? error.message : undefined,
        errorPayload.message,
        providerError?.message,
        providerError?.metadata?.raw,
        errorPayload["body$"],
    ]
        .filter((value): value is string => typeof value === "string" && value.trim() !== "")
        .join(" ");

    if (providerError?.code === 429 || errorText.includes("429") || /rate[- ]limit/i.test(errorText)) {
        return "Die KI ist gerade ausgelastet. Bitte versuche es in ein paar Sekunden erneut.";
    }

    if (/api key|unauthorized|authentication|forbidden|401|403/i.test(errorText)) {
        return "Die KI ist gerade nicht korrekt konfiguriert. Bitte gib kurz Bescheid.";
    }

    return fallbackMessage;
}

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
        return getErrorMessage(error);
    }
}
