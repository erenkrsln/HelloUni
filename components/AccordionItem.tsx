'use client'
import OpenedTriangleArrowIcon from '@/public/icons/Opened_Triangle_Arrow_Icon.svg'
import { useState, useEffect } from 'react'
import tailwindConfig from '../tailwind.config'

export interface AccordionSubItemData {
    title: string
    content: string
}

const TRANSITION_DURATION = 3
const TRANSITION_TIMING = 'cubic-bezier(0.44, 0, 0.56, 1)'

interface AccordionItemProps {
    title: string
    content: string
    subItems: AccordionSubItemData[]
    isOpen: boolean
    onClick: () => void
    isLast: boolean
    onHoverChange: (isHovering: boolean) => void
    progress: number
    isHovered: boolean
}

const AccordionItem = ({ title, content, subItems, isOpen, onClick, isLast, onHoverChange, progress, isHovered }: AccordionItemProps) => {
    const [openSubItems, setOpenSubItems] = useState<number[]>([])
    const [isHovering, setIsHovering] = useState<boolean>(false)

    const toggleSubItem = (index: number, e: React.MouseEvent) => {
        e.stopPropagation()
        setOpenSubItems(prev =>
            prev.includes(index)
                ? prev.filter(i => i !== index)
                : [...prev, index]
        )
    }

    const handleMouseEnter = () => {
        setIsHovering(true)
        onHoverChange(true)
    }

    const handleMouseLeave = () => {
        setIsHovering(false)
        onHoverChange(false)
    }

    useEffect(() => { if (isOpen && isHovering) onHoverChange(true) }, [isOpen, isHovering, onHoverChange])

    return (
        <div
            className='flex flex-col w-full items-center justify-start'
        >
            <div
                className='relative w-full h-[2px]'
            >
                <div
                    className={`absolute inset-x-0 ${isOpen ? 'inset-y-[-0.5px]' : 'inset-y-0'} transition-all duration-300 ease-[cubic-bezier(0.44,0,0.56,1)]`}
                >
                    <div className='absolute inset-0 bg-black opacity-20 rounded-[42px]' />
                    <div
                        className='absolute inset-y-0 bg-black rounded-[42px]'
                        style={{
                            width: `${progress * 100}%`,
                            transition: (progress === 0 || progress === 1)
                                ? `width ${TRANSITION_DURATION} ${TRANSITION_TIMING}`
                                : undefined
                        }}
                    />
                </div>
            </div>
            <button
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={onClick}
                className='w-full flex justify-center items-center gap-[22px]  py-[22px]  group'
            >
                <span className={`w-full text-[14px] font-bold leading-normal text-left transition-colors duration-300 ease-[cubic-bezier(0.44,0,0.56,1)] ${isOpen ? 'text-black' : isHovered ? 'text-black' : 'text-black opacity-[0.65]'}`}>{title}</span>
                <OpenedTriangleArrowIcon className={`h-[14px] ${isOpen ? 'rotate-180 text-black' : `rotate-0 ${isHovered ? 'text-black' : 'text-black opacity-[0.65]'}`} fill-current shrink-0 transition-all duration-300 ease-[cubic-bezier(0.44,0,0.56,1)]`} />
            </button>
            <div className={`w-full grid transition-all duration-300 ease-[cubic-bezier(0.44,0,0.56,1)] ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className='overflow-hidden'>
                    <div className='flex flex-col w-full items-center justify-start text-[14px] font-normal leading-normal pb-[22px]  pr-[22px]  tablet:pr-[32px]  desktop:pr-[42px] '>
                        <div className='w-full whitespace-pre-wrap text-[14px] font-normal leading-normalBlock'
                            dangerouslySetInnerHTML={{
                                __html: content
                            }}
                        />

                        {subItems.length > 0 && (
                            <div className='flex flex-col w-full items-center justify-start pl-[22px]  tablet:pl-[32px]  desktop:pl-[42px]  pt-[5px] tablet:pt-[20px] desktop:pt-[28px]'>
                                {subItems.map((subItem, index) => (
                                    <div key={index} className='flex flex-col w-full items-center justify-start'>
                                        <button
                                            onClick={(e) => toggleSubItem(index, e)}
                                            className='w-full flex justify-center items-center gap-[17px] py-[17px] group'
                                        >
                                            <span style={{
                                                fontFamily: 'var(--font-poppins), sans-serif',
                                                fontSize: '11px',
                                                fontStyle: 'normal',
                                                fontWeight: '700',
                                                lineHeight: 'normal',
                                            }}
                                                className={`w-full text-left transition-colors duration-300 ease-[cubic-bezier(0.44,0,0.56,1)] ${openSubItems.includes(index) ? 'text-black' : 'text-black opacity-[0.65]  tablet:group-hover:text-black'}`}>{subItem.title}</span>
                                            <OpenedTriangleArrowIcon className={`h-[11px] ${openSubItems.includes(index) ? 'rotate-180 text-black' : 'rotate-0 text-black opacity-[0.65]  tablet:group-hover:text-black'} fill-current shrink-0 transition-all duration-300 ease-[cubic-bezier(0.44,0,0.56,1)]`} />
                                        </button>
                                        <div className={`w-full grid transition-all duration-300 ease-[cubic-bezier(0.44,0,0.56,1)] ${openSubItems.includes(index) ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                            <div className='overflow-hidden'>
                                                <div className='whitespace-pre-wrap text-[11px] font-normal leading-normalBlock pr-[22px]  tablet:pr-[32px]  desktop:pr-[42px] '
                                                    dangerouslySetInnerHTML={{
                                                        __html: subItem.content
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {isLast && <div className='w-full h-[2px] bg-black opacity-20 rounded-[42px]' />}
        </div>
    )
}

export default AccordionItem