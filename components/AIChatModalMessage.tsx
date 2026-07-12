'use client'
import { formatAiDisplayText } from '@/lib/utils/ai-message'
import { linkifyText } from '@/lib/utils/linkify'

interface AIChatModalMessageProps {
    message: string
    isUser: boolean
    timestamp: Date
}

const AIChatModalMessage = ({ message, isUser, timestamp }: AIChatModalMessageProps) => {
    const formatTime = (date: Date) => {
        const hours = date.getHours().toString().padStart(2, '0')
        const minutes = date.getMinutes().toString().padStart(2, '0')
        return `${hours}:${minutes}`
    }

    const displayMessage = isUser ? message : formatAiDisplayText(message)

    return (
        <div
            className={`flex items-end gap-[5px] max-w-[82%] min-w-0 p-[11px] rounded-[8px] ${isUser
                ? 'bg-white text-black'
                : 'bg-[#F78D57] text-white'
                }`}
        >
            <p className='min-w-0 text-[14px] font-normal leading-normal whitespace-pre-wrap break-words'>
                {linkifyText(displayMessage)}
            </p>
            <span className='shrink-0 text-[11px] font-normal leading-normal opacity-[0.65]'>
                {formatTime(timestamp)}
            </span>
        </div>
    )
}
export default AIChatModalMessage