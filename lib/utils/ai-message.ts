const AI_TAGS = /\[\/?(?:SUMMARY|DETAILS)\]/gi
const URL_REGEX = /https?:\/\/[^\s]+/g
const URL_PLACEHOLDER = '\uE000'

export type ParsedAiContent = {
    summary: string
    details?: string
}

function stripAiTags(text: string): string {
    return text.replace(AI_TAGS, '').trim()
}

function protectUrls(text: string): { text: string; urls: string[] } {
    const urls: string[] = []
    const protectedText = text.replace(URL_REGEX, (url) => {
        urls.push(url)
        return `${URL_PLACEHOLDER}${urls.length - 1}${URL_PLACEHOLDER}`
    })
    return { text: protectedText, urls }
}

function restoreUrls(text: string, urls: string[]): string {
    return text.replace(
        new RegExp(`${URL_PLACEHOLDER}(\\d+)${URL_PLACEHOLDER}`, 'g'),
        (_, index) => urls[Number(index)] ?? '',
    )
}

function stripMarkdown(text: string): string {
    return text
        .replace(/\*\*([\s\S]+?)\*\*/g, '$1')
        .replace(/__([\s\S]+?)__/g, '$1')
        .replace(/\*([\s\S]+?)\*/g, '$1')
        .replace(/_([\s\S]+?)_/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/[*`#]/g, '')
}

export function cleanAiText(text: string): string {
    const withoutTags = stripAiTags(text)
    const { text: protectedText, urls } = protectUrls(withoutTags)
    return restoreUrls(stripMarkdown(protectedText), urls)
}

export function parseAiStructuredContent(text: string): ParsedAiContent | null {
    let summary = text.match(/\[SUMMARY\]([\s\S]*?)\[\/SUMMARY\]/i)?.[1]?.trim()
    if (!summary) {
        summary = text.match(/^([\s\S]*?)\[\/SUMMARY\]/i)?.[1]?.trim()
    }
    if (!summary) return null

    let details = text.match(/\[DETAILS\]([\s\S]*?)\[\/DETAILS\]/i)?.[1]?.trim()
    if (!details) {
        details = text.match(/\[\/SUMMARY\]\s*(?:\[DETAILS\])?\s*([\s\S]*?)\[\/DETAILS\]/i)?.[1]?.trim()
    }

    summary = cleanAiText(summary)
    details = details ? cleanAiText(details) : undefined

    return details ? { summary, details } : { summary }
}

export function formatAiDisplayText(text: string): string {
    const parsed = parseAiStructuredContent(text)
    if (parsed) {
        return [parsed.summary, parsed.details].filter(Boolean).join('\n\n')
    }
    return cleanAiText(text)
}