'use client'
import { useState, useRef, useLayoutEffect } from 'react'

interface DateCardProps {
  date: string
  description: string
  isNextUp?: boolean
  hasPassed?: boolean
}

export default function DateCard({ date, description, isNextUp = false, hasPassed = false }: DateCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [isExpandable, setIsExpandable] = useState(false)
  const dateRef = useRef<HTMLSpanElement>(null)
  const descRef = useRef<HTMLParagraphElement>(null)

  useLayoutEffect(() => {
    const d = dateRef.current, p = descRef.current
    if (d && p) setIsExpandable(d.scrollWidth > d.clientWidth || p.scrollWidth > p.clientWidth)
  }, [date, description])

  return (
    <div
      onClick={isExpandable ? () => setExpanded(e => !e) : undefined}
      className={`flex flex-col justify-center items-start gap-[8px] p-[22px] rounded-[8px] border-[2px] shrink-0 snap-center snap-always transition-colors duration-300 ease-[cubic-bezier(0.44,0,0.56,1)]
        ${isExpandable ? 'cursor-pointer' : ''}
        ${!expanded ? 'max-w-[280px] tablet:max-w-[320px] desktop:max-w-[420px]' : ''}
        ${isNextUp
          ? `bg-[#F78D57] bg-opacity-[0.65] border-[#F78D57] border-opacity-[0.65]${isExpandable ? ' tablet:hover:bg-opacity-[0.82]' : ''}`
          : `bg-black bg-opacity-[0.11] border-opacity-20 border-black${isExpandable ? ' tablet:hover:bg-opacity-20' : ''}`}
        ${hasPassed ? 'opacity-[0.20]' : ''}`}>
      <span ref={dateRef} className={`text-[17px] font-bold leading-normal text-foreground ${!expanded ? 'truncate w-full' : ''}`}>{date}</span>
      <p ref={descRef} className={`text-[14px] font-normal leading-normal text-foreground ${!expanded ? 'truncate w-full' : ''}`}>{description}</p>
    </div>
  )
}