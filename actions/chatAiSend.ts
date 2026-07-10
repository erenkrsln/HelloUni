"use server";

import { askAi, type AiContext, type AiHistoryMessage, type AiPublicProfileFacts } from "@/lib/utils/ai";

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
    history?: AiHistoryMessage[],
    profileFacts?: AiPublicProfileFacts,
) {
    try {
        const resolvedMajor = major || profileFacts?.major;
        const resolvedSemester = semester ?? profileFacts?.semester;

        const studiengangContext: AiContext | null = resolvedMajor ? {
            major: resolvedMajor,
            semester: resolvedSemester ?? 1,
        } : null;

        return await askAi(msg, studiengangContext, history, profileFacts);
    } catch (error) {
        console.error("Failed to send message:", error);
        return getErrorMessage(error);
    }
}
