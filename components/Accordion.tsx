'use client'
import { useState, useEffect, useRef } from 'react'
import AccordionItem, { AccordionSubItemData } from './AccordionItem'

export interface AccordionItemData {
    title: string
    content: string
    subItems?: AccordionSubItemData[]
}

interface AccordionProps {
    items: AccordionItemData[]
    openItem: number | null
    onOpenItemChange: (index: number | null) => void
    hoveredItem: number | null
    onHoverChange: (hovering: boolean, itemIndex?: number) => void
    className?: string
    suppressTicker?: boolean
}

const Accordion = ({ items, openItem, onOpenItemChange, hoveredItem, onHoverChange, className = 'flex', suppressTicker = false }: AccordionProps) => {
    const [progress, setProgress] = useState(0)
    const [isMobileOrTouch, setIsMobileOrTouch] = useState(false)
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const animationFrameRef = useRef<number | null>(null)
    const startTimeRef = useRef<number | null>(null)
    const accordionRef = useRef<HTMLDivElement>(null)
    const [wasManuallyClosed, setWasManuallyClosed] = useState(false)
    const [lastAction, setLastAction] = useState<'opened' | 'closed' | null>(null)
    const [lastScrollDirection, setLastScrollDirection] = useState<'down' | 'up' | null>(null)

    const TOTAL_DURATION = 15
    const TRANSITION_DURATION = 3
    const TABLET_BREAKPOINT = 740
    const TOUCH_QUERY = '(pointer: coarse)'
    const noTicker = isMobileOrTouch || suppressTicker

    const animate = () => {
        if (!startTimeRef.current || noTicker) return

        const elapsed = Date.now() - startTimeRef.current
        const newProgress = Math.min(elapsed / TOTAL_DURATION, 1)
        setProgress(newProgress)

        newProgress < 1 && (animationFrameRef.current = requestAnimationFrame(animate))
    }

    const startAnimation = () => {
        if (noTicker) {
            setProgress(1)
            return
        }

        animationFrameRef.current && cancelAnimationFrame(animationFrameRef.current)
        startTimeRef.current = Date.now()
        animationFrameRef.current = requestAnimationFrame(animate)
    }

    const clearTimers = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current)
            timerRef.current = null
        }
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current)
            animationFrameRef.current = null
        }
    }

    useEffect(() => () => clearTimers(), [])

    const isOpenItemHovered = hoveredItem === openItem

    useEffect(() => {
        clearTimers()

        if (noTicker) {
            setProgress(1)
            return
        }

        if (isOpenItemHovered) {
            setProgress(1)
            return
        }

        if (!isOpenItemHovered && openItem !== null) {
            setProgress(0)

            const transitionTimer = setTimeout(() => {
                startTimeRef.current = Date.now() - TRANSITION_DURATION
                startAnimation()
                timerRef.current = setTimeout(() => {
                    const nextItem = openItem === items.length - 1 ? 0 : openItem + 1
                    onOpenItemChange(nextItem)
                }, TOTAL_DURATION)
            }, TRANSITION_DURATION)

            timerRef.current = transitionTimer
        }
    }, [openItem, isOpenItemHovered, noTicker])

    useEffect(() => {
        const checkIsMobileOrTouch = () => {
            setIsMobileOrTouch(
                window.innerWidth < TABLET_BREAKPOINT ||
                window.matchMedia(TOUCH_QUERY).matches
            )
        }

        checkIsMobileOrTouch()
        window.addEventListener('resize', checkIsMobileOrTouch)
        return () => window.removeEventListener('resize', checkIsMobileOrTouch)
    }, [])

    useEffect(() => {
        if (isMobileOrTouch) return

        let lastScrollY = window.scrollY

        const checkVisibility = () => {
            const triggerElement = accordionRef.current
            if (!triggerElement) return
            const triggerRect = triggerElement.getBoundingClientRect()
            const scrolled = window.scrollY > 0
            const headerHeight = scrolled ? 74 : 96
            const currentScrollDirection = window.scrollY > lastScrollY ? 'down' : window.scrollY < lastScrollY ? 'up' : lastScrollDirection
            lastScrollY = window.scrollY
            const triggerBottomInViewport = triggerRect.bottom >= headerHeight && triggerRect.bottom <= window.innerHeight
            const triggerBottomLeftViewportUp = triggerRect.bottom < headerHeight
            const triggerTopInViewport = triggerRect.top >= headerHeight && triggerRect.top <= window.innerHeight
            const triggerTopLeftViewportDown = triggerRect.top > window.innerHeight

            let shouldOpen = false
            let shouldClose = false

            if (openItem === null) {
                if (currentScrollDirection === 'down') {
                    shouldOpen = triggerBottomInViewport
                } else if (currentScrollDirection === 'up') {
                    shouldOpen = triggerTopInViewport
                }
            } else {
                if (lastAction === 'opened') {
                    if (lastScrollDirection === 'down') {
                        if (currentScrollDirection === 'down') {
                            shouldClose = triggerBottomLeftViewportUp
                        } else if (currentScrollDirection === 'up') {
                            shouldClose = triggerTopLeftViewportDown
                        }
                    } else if (lastScrollDirection === 'up') {
                        if (currentScrollDirection === 'up') {
                            shouldClose = triggerTopLeftViewportDown
                        } else if (currentScrollDirection === 'down') {
                            shouldClose = triggerBottomLeftViewportUp
                        }
                    }
                }
            }

            if (shouldOpen && !wasManuallyClosed) {
                setLastAction('opened')
                setLastScrollDirection(currentScrollDirection)
                onOpenItemChange(0)
            } else if (shouldClose) {
                setLastAction('closed')
                setLastScrollDirection(currentScrollDirection)
                setWasManuallyClosed(false)
                onOpenItemChange(null)
            }
        }

        window.addEventListener('scroll', checkVisibility)
        window.addEventListener('resize', checkVisibility)
        checkVisibility()

        return () => {
            window.removeEventListener('scroll', checkVisibility)
            window.removeEventListener('resize', checkVisibility)
        }
    }, [isMobileOrTouch, onOpenItemChange, openItem, wasManuallyClosed, lastAction, lastScrollDirection])

    useEffect(() => {
        if (openItem !== null && lastAction === null) {
            setLastAction('opened')
            setLastScrollDirection('down')
        }
    }, [openItem, lastAction])

    const toggleItem = (index: number) => {
        setProgress(noTicker ? 1 : 0)

        if (openItem === index) {
            setWasManuallyClosed(true)
            setLastAction('closed')
        } else {
            setLastAction('opened')
            setLastScrollDirection(null)
        }

        onOpenItemChange(openItem === index ? null : index)
    }

    const handleHoverChange = (hovering: boolean, itemIndex?: number) => {
        if (isMobileOrTouch) return
        onHoverChange(hovering, itemIndex)
    }

    return (
        <div className={`${className} flex-col w-full`} ref={accordionRef}>
            {items.map((item, index) => (
                <AccordionItem
                    key={index}
                    title={item.title}
                    content={item.content}
                    subItems={item.subItems || []}
                    isOpen={openItem === index}
                    onClick={() => toggleItem(index)}
                    isLast={index === items.length - 1}
                    onHoverChange={(hovering) => handleHoverChange(hovering, index)}
                    progress={openItem === index ? progress : 0}
                    isHovered={hoveredItem === index}
                />
            ))}
        </div>
    )
}

export default Accordion