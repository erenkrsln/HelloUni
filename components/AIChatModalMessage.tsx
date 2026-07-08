'use client'
interface AIChatModalMessageProps {
    message: string
    isUser: boolean
    timestamp: Date
}

type ParsedAiContent = {
    summary: string
    details?: string
}

const parseAiStructuredContent = (text: string): ParsedAiContent | null => {
    const summaryMatch = text.match(/\[SUMMARY\]([\s\S]*?)\[\/SUMMARY\]/i)

    if (!summaryMatch) {
        return null
    }

    const summary = summaryMatch[1].trim()

    if (!summary) {
        return null
    }

    const detailsMatch = text.match(/\[DETAILS\]([\s\S]*?)\[\/DETAILS\]/i)
    const details = detailsMatch?.[1]?.trim()

    return details ? { summary, details } : { summary }
}

const AIChatModalMessage = ({ message, isUser, timestamp }: AIChatModalMessageProps) => {
    const formatTime = (date: Date) => {
        const hours = date.getHours().toString().padStart(2, '0')
        const minutes = date.getMinutes().toString().padStart(2, '0')
        return `${hours}:${minutes}`
    }

    const parsedMessage = parseAiStructuredContent(message)
    const displayMessage = parsedMessage
        ? [parsedMessage.summary, parsedMessage.details].filter(Boolean).join('\n\n')
        : message

    return (
        <div
            className={`flex justify-center items-end gap-[5px] max-w-[82%] p-[11px] rounded-[8px] ${isUser
                ? 'bg-white text-black'
                : 'bg-[#F78D57] text-white'
                }`}
        >
            <p className='text-[14px] font-normal leading-normal whitespace-pre-wrap break-all'>
                {displayMessage}
            </p>
            <span className='text-[11px] font-normal leading-normal opacity-[0.65]'>
                {formatTime(timestamp)}
            </span>
        </div>
    )
}
export default AIChatModalMessage
