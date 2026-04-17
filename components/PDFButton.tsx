'use client'
import { usePathname } from 'next/navigation'
import FileIcon from '@/public/icons/File_Icon_fill.svg'

interface PDFButtonProps {
    text: string
    href: string
}

const PDFButton = ({ text, href }: PDFButtonProps) => {
    const pathName = usePathname()
    const currentPagerRef = pathName && pathName.split('/')
    const isOnRiskProfile = currentPagerRef && currentPagerRef.length === 3 && currentPagerRef[2] === 'riskprofile'

    return (
        <a
            className={`flex justify-center items-center ${isOnRiskProfile ? 'w-full' : 'w-full tablet:w-auto'}`}
            href={href}
            target='_blank'
            rel='noopener noreferrer'
        >
            <button className={`flex justify-center items-center gap-[14px] ${isOnRiskProfile ? 'w-full p-[14px]' : 'w-full tablet:w-auto p-[22px] '} rounded-[8px] border-[2px] border-black border-opacity-20 tablet:hover:border-opacity-0 tablet:hover:shadow-[0px_0px_47px_0px_rgba(0,0,0,0.20)] transition-all duration-300 ease-[cubic-bezier(0.44,0,0.56,1)] group`}>
                <FileIcon className='h-[22px]  fill-current text-black opacity-[0.65] tablet:group-hover:opacity-100 transition-opacity ease-[cubic-bezier(0.44,0,0.56,1)] duration-300' />
                <span className='text-[14px] font-bold leading-normal text-black opacity-[0.65] tablet:group-hover:opacity-100 text-left transition-opacity duration-300 ease-[cubic-bezier(0.44,0,0.56,1)]'>
                    {text}
                </span>
            </button>
        </a>
    )
}

export default PDFButton