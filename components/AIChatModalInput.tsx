'use client'
import { useEffect, useRef, useState } from 'react'

interface AIChatModalInputProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    onKeyDown?: (e: React.KeyboardEvent) => void
}

const AIChatModalInput = ({ value, onChange, placeholder, onKeyDown }: AIChatModalInputProps) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const [isMultiline, setIsMultiline] = useState(false)

    useEffect(() => {
        const textarea = textareaRef.current
        if (!textarea) return
        textarea.style.height = 'auto'
        if (value) {
            const newHeight = textarea.scrollHeight
            textarea.style.height = `${newHeight}px`
            const lineHeight = parseInt(getComputedStyle(textarea).lineHeight)
            setIsMultiline(Math.floor(newHeight / lineHeight) > 1)
        } else {
            setIsMultiline(false)
        }
    }, [value])

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            rows={1}
            maxLength={420}
            className={`w-full px-[11px] py-[8px] bg-black bg-opacity-[0.11] placeholder:text-[15px] placeholder:font-normal placeholder:leading-normal placeholder:text-foreground placeholder:opacity-[0.65] ${isMultiline ? 'rounded-[17px]' : 'rounded-[42px]'} outline-none hover:bg-opacity-[0.22] focus:bg-opacity-[0.22] focus:placeholder:opacity-100 transition-all duration-300 ease-[cubic-bezier(0.44,0,0.56,1)] resize-none`}
        />
    )
}

export default AIChatModalInput