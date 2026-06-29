import EmailIcon from '@/public/icons/Email_Icon_fill.svg'
import CellieIcon from '@/public/icons/Cellie_Icon_fill.svg'

interface ExternalLinkWithIconProps {
    href?: string
}

const ExternalLinkWithIcon = ({ href }: ExternalLinkWithIconProps) => {
    if (!href) return null

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(href)
    const isCellie = /^[\d\s+()-]+$/.test(href)
    const finalHref = isEmail ? `mailto:${href}` : isCellie ? `tel:${href}` : href

    return (
        <a
            href={finalHref}
            target='_blank'
            rel='noopener noreferrer'
        >
            <div className='flex justify-center items-center gap-[14px] group'>
                <div className='flex justify-center items-center w-[22px] '>
                    {isEmail && (
                        <EmailIcon className='h-[17px] fill-current text-[#F78D57] opacity-[0.65] tablet:group-hover:opacity-100 transition-opacity duration-300 ease-[cubic-bezier(0.44,0,0.56,1)]' />
                    )}
                    {isCellie && (
                        <CellieIcon className='h-[22px]  fill-current text-[#F78D57] opacity-[0.65] tablet:group-hover:opacity-100 transition-opacity duration-300 ease-[cubic-bezier(0.44,0,0.56,1)]' />
                    )}
                </div>
                <span className='text-[14px] font-normal leading-normal underline text-[#F78D57] opacity-[0.65] tablet:group-hover:opacity-100 transition-opacity duration-300 ease-[cubic-bezier(0.44,0,0.56,1)]'>
                    {href}
                </span>
            </div>
        </a>
    )
}

export default ExternalLinkWithIcon