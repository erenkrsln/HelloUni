'use client'
import { useState, useEffect, useRef } from 'react'
import SectionNavigationItem from '@/components/SectionNavigationItem'

interface SectionNavigationProps {
    labels: string[]
    currentSectionIndex: number | null
    onOpenItemChange: (index: number) => void
    onHoverChange: (hovering: boolean, itemIndex?: number) => void
    hoveredSectionIndex: number | null
}

const SectionNavigation = ({
    labels,
    currentSectionIndex,
    onOpenItemChange,
    onHoverChange,
    hoveredSectionIndex,
}: SectionNavigationProps) => {

    return (
        <div className='transition-all duration-300 ease-[cubic-bezier(0.44,0,0.56,1)] desktop:fixed right-0 inset-y-0 hidden desktop:flex flex-col justify-center items-start pt-[80px]'>
            <div className='flex flex-col justify-center items-end gap-[42px]'>
                {labels.map((label, index) => (
                    <SectionNavigationItem
                        key={index}
                        label={label}
                        isActive={currentSectionIndex === index}
                        isHovered={hoveredSectionIndex === index}
                        onClick={() => onOpenItemChange(index)}
                        onHoverChange={(hovering) => onHoverChange(hovering, index)}
                    />
                ))}
            </div>
        </div>
    )
}

export default SectionNavigation