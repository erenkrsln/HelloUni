'use client'
import React, { useState, useRef, useEffect } from 'react'
import Icon from '@/public/icons/HelloUni_KI_Icon.svg'

const TABLET_BREAKPOINT = 740
const DESKTOP_BREAKPOINT = 1230

const AiChatModal: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isFixed, setIsFixed] = useState(false)
  const buttonRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setIsVisible(false)
        setIsHovered(false)
        setIsFixed(false)
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  const handleInteraction = () => {
    const width = window.innerWidth
    if (width < DESKTOP_BREAKPOINT && width >= TABLET_BREAKPOINT) {
      if (isHovered && !isFixed) {
        setIsHovered(false)
        setIsFixed(true)
        setIsVisible(true)
      } else {
        setIsFixed(!isFixed)
        setIsVisible(!isVisible)
      }
    } else if (width < TABLET_BREAKPOINT) {
      setIsFixed(!isVisible)
      setIsVisible(!isVisible)
    }
  }

  const handleMouseEnter = () => {
    if (window.innerWidth >= TABLET_BREAKPOINT) {
      setIsHovered(true)
      setIsVisible(true)
    }
  }

  const handleMouseLeave = () => {
    if (window.innerWidth >= TABLET_BREAKPOINT) {
      setIsHovered(false)
      if (!isFixed) {
        setIsVisible(false)
      }
    }
  }

  return (
    <div className='flex h-[41px] justify-center items-center'>
      <div
        ref={buttonRef}
        className='fixed bottom-[20px] right-[20px] flex w-[66px] h-[66px] shrink-0 cursor-pointer items-center justify-center rounded-[66px] z-[9999] bg-[#F78D57] bg-opacity-[0.65] group tablet:hover:bg-opacity-100 transition-all duration-300 ease-[cubic-bezier(0.44,0,0.56,1)]'
        onClick={handleInteraction}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Icon className={`h-[38px] fill-current transition-colors duration-3 ease-smooth text-white`} />
        <div className='absolute left-[50%] -bottom-[6px]'>
        </div>
      </div>
    </div>
  )
}

export default AiChatModal