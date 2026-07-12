'use client'
import { useState, useRef, useEffect } from 'react'
import { useQuery } from 'convex/react'
import KIIcon from '@/public/icons/HelloUni_KI_Icon.svg'
import PaperplaneIcon from '@/public/icons/Paperplane_Icon_fill.svg'
import XIcon from '@/public/icons/X_Icon_Bold.svg'
import AIChatModalInput from './AIChatModalInput'
import AIChatModalMessageGroup from './AIChatModalMessageGroup'
import { handleAi } from '@/actions/chatAiSend'
import { useOptionalStudiengangContext } from '@/lib/contexts/StudiengangContext'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { api } from '@/convex/_generated/api'

const HISTORY_LIMIT = 6

const AiChatModal = () => {
  const [isClicked, setIsClicked] = useState(false)
  const [iconWidth, setIconWidth] = useState(0)
  const [headerHeight, setHeaderHeight] = useState(0)
  const [footerHeight, setFooterHeight] = useState(0)
  const [inputText, setInputText] = useState('')
  const [messages, setMessages] = useState<Array<{ message: string; isUser: boolean; timestamp: Date }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [dots, setDots] = useState('')
  const iconRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const studiengangContext = useOptionalStudiengangContext()
  const { currentUser, currentUserId } = useCurrentUser()
  const followerCount = useQuery(
    api.queries.getFollowerCount,
    currentUserId ? { userId: currentUserId } : 'skip',
  )
  const followingCount = useQuery(
    api.queries.getFollowingCount,
    currentUserId ? { userId: currentUserId } : 'skip',
  )

  const handleClick = () => {
    setIsClicked(!isClicked)
  }

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return

    const recentHistory = messages
      .slice(-HISTORY_LIMIT)
      .map((message) => ({
        role: message.isUser ? 'user' as const : 'assistant' as const,
        content: message.message,
      }))

    const userMsg = {
      message: inputText.trim(),
      isUser: true,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMsg])
    const currentInput = inputText.trim()
    setInputText('')
    setIsLoading(true)

    try {
      const aiResponse = await handleAi(
        currentInput,
        studiengangContext?.major || undefined,
        studiengangContext?.semester,
        recentHistory,
        {
          name: currentUser?.name,
          username: currentUser?.username,
          major: currentUser?.major,
          semester: currentUser?.semester,
          bio: currentUser?.bio,
          interests: Array.isArray(currentUser?.interests) ? currentUser.interests : undefined,
          followerCount: typeof followerCount === 'number' ? followerCount : undefined,
          followingCount: typeof followingCount === 'number' ? followingCount : undefined,
        },
      )
      const aiMsg = {
        message: aiResponse || 'Entschuldigung, ich konnte keine Antwort generieren.',
        isUser: false,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiMsg])
    } catch (error) {
      console.error('AI Error:', error)
      const errorMsg = {
        message: 'Entschuldigung, es ist ein Fehler aufgetreten.',
        isUser: false,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const groupMessages = (msgs: typeof messages) => {
    if (msgs.length === 0) return []
    const groups: Array<{ isUser: boolean; messages: Array<{ text: string; timestamp: Date }> }> = []
    let currentGroup = { isUser: msgs[0].isUser, messages: [{ text: msgs[0].message, timestamp: msgs[0].timestamp }] }

    for (let i = 1; i < msgs.length; i++) {
      if (msgs[i].isUser === currentGroup.isUser) {
        currentGroup.messages.push({ text: msgs[i].message, timestamp: msgs[i].timestamp })
      } else {
        groups.push(currentGroup)
        currentGroup = { isUser: msgs[i].isUser, messages: [{ text: msgs[i].message, timestamp: msgs[i].timestamp }] }
      }
    }
    groups.push(currentGroup)
    return groups
  }

  const groupedMessages = groupMessages(messages)

  useEffect(() => {
    if (!iconRef.current) return

    const resizeObserver = new ResizeObserver(() => {
      if (iconRef.current) {
        setIconWidth(iconRef.current.offsetWidth)
      }
    })

    resizeObserver.observe(iconRef.current)
    return () => resizeObserver.disconnect()
  })

  useEffect(() => {
    if (!headerRef.current) return
    const resizeObserver = new ResizeObserver(() => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight)
      }
    })
    resizeObserver.observe(headerRef.current)
    return () => resizeObserver.disconnect()
  })

  useEffect(() => {
    if (!footerRef.current) return
    const resizeObserver = new ResizeObserver(() => {
      if (footerRef.current) {
        setFooterHeight(footerRef.current.offsetHeight)
      }
    })
    resizeObserver.observe(footerRef.current)
    return () => resizeObserver.disconnect()
  })

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [isClicked, messages, isLoading])

  useEffect(() => {
    if (!isLoading) return
    const interval = setInterval(() => {
      setDots(prev => prev === '...' ? '' : prev + '.')
    }, 300)
    return () => clearInterval(interval)
  }, [isLoading])

  return (
    <>
      <div
        className={`cursor-pointer fixed inset-0 bg-card bg-opacity-20 backdrop-blur-[4px] ${isClicked ? '' : 'opacity-0 pointer-events-none'} z-[9997] transition-opacity duration-300 ease-smooth ease-[cubic-bezier(0.44,0,0.56,1)]`}
        onClick={handleClick}
      />
      <div
        className={`fixed right-4 tablet:right-[20px] flex flex-col border-[2px] border-black ${isClicked ? 'bottom-4 tablet:bottom-[20px] w-[calc(100vw-32px)] tablet:w-[420px] h-[560px] max-h-[calc(100dvh-32px)] rounded-[17px] bg-black bg-opacity-[0.11] border-opacity-20' : 'bottom-[calc(98px+env(safe-area-inset-bottom,0px))] lg:bottom-[20px] w-[56px] h-[56px] rounded-[56px] tablet:w-[66px] tablet:h-[66px] tablet:rounded-[66px] bg-[#F78D57] bg-opacity-[0.65] tablet:hover:bg-opacity-100 border-opacity-0 cursor-pointer'} shrink-0 items-center justify-start z-[9998] group transition-all duration-300 ease-[cubic-bezier(0.44,0,0.56,1)] overflow-hidden`}
        onClick={!isClicked ? handleClick : undefined}
      >
        <div className='absolute inset-0 backdrop-blur-[57px] -z-[1]' />

        <div
          ref={scrollRef}
          style={{ paddingTop: `${headerHeight + 22}px`, paddingBottom: `${footerHeight + 22}px` }}
          className={`w-full h-full ${isClicked ? 'overflow-y-scroll' : 'overflow-y-hidden opacity-0'} transition-opacity duration-300 ease-[cubic-bezier(0.44,0,0.56,1)]`}
        >
          <div className='w-full flex flex-col justify-center items-center px-[22px] gap-[5px]'>
            <div className='w-full flex flex-col justify-center items-center gap-[14px]'>
              {groupedMessages.map((group, index) => (
                <AIChatModalMessageGroup
                  key={index}
                  messages={group.messages}
                  isUser={group.isUser}
                />
              ))}
            </div>
            {isLoading && (
              <div className='w-full text-[14px] font-normal leading-normal text-foreground text-left opacity-[0.65]'>
                überlegt{dots}
              </div>
            )}
          </div>
        </div>
        <div
          ref={footerRef}
          className={`absolute bottom-0 left-0 right-0 flex gap-[14px] justify-center items-center px-[22px] py-[17px] bg-card ${isClicked ? '' : 'opacity-0 translate-y-full'} transition-all duration-300 ease-[cubic-bezier(0.44,0,0.56,1)]`}>
          <AIChatModalInput
            value={inputText}
            onChange={setInputText}
            onKeyDown={handleKeyDown}
            placeholder='Deine Nachricht...' />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isLoading}
            className={`self-stretch min-w-[40px] shrink-0 aspect-square h-full flex justify-center items-center bg-[#F78D57] ${!inputText.trim() || isLoading ? 'bg-opacity-[0.65] cursor-not-allowed' : ''} rounded-[42px] transition-all duration-300 ease-[cubic-bezier(0.44,0,0.56,1)]`}>
            <PaperplaneIcon className='fill-current text-white h-[17px]' />
          </button>
        </div>
        <div
          ref={headerRef}
          className={`absolute top-0 left-0 right-0 flex justify-between items-center bg-card ${isClicked ? 'px-[22px] py-[17px] bg-opacity-[0.65] backdrop-blur-[57px]' : 'bg-opacity-0'} transition-all duration-300 ease-[cubic-bezier(0.44,0,0.56,1)]`}
        >
          <div className='flex justify-center items-center gap-[14px]'>
            <div
              className={`flex justify-center items-center shrink-0 ${isClicked ? 'h-[33px]' : 'w-[54px] h-[54px] tablet:w-[64px] tablet:h-[64px]'} transition-all duration-300 ease-[cubic-bezier(0.44,0,0.56,1)]`}
              style={isClicked ? { width: iconWidth } : undefined}
            >
              <div
                ref={iconRef}
                className='flex justify-center items-center'>
                <KIIcon className={`fill-current transition-all duration-300 ease-[cubic-bezier(0.44,0,0.56,1)] ${isClicked ? 'h-[33px] text-foreground' : 'h-[32px] tablet:h-[38px] text-white'}`} />
              </div>
            </div>
            <span className={`text-[17px] font-bold leading-normal text-foreground text-left whitespace-nowrap transition-opacity duration-300 ease-[cubic-bezier(0.44,0,0.56,1)] ${isClicked ? '' : 'opacity-0'}`}>
              Jastell (HelloUni-KI)
            </span>
          </div>
          <button
            className='flex w-[37px] h-[37px] shrink-0 justify-center items-center rounded-[42px] border-[2px] border-black border-opacity-20 tablet:hover:border-opacity-0 tablet:hover:shadow-[0px_0px_42px_0px_rgba(0,0,0,0.20)] transition-all duration-300 ease-[cubic-bezier(0.44,0,0.56,1)] group/button'
            onClick={isClicked ? handleClick : undefined}
          >
            <XIcon className='w-[14px] fill-current text-foreground opacity-[0.65] group-hover/button:opacity-100 transition-opacity duration-300 ease-[cubic-bezier(0.44,0,0.56,1)]' />
          </button>
        </div>
      </div >
    </>
  )
}

export default AiChatModal