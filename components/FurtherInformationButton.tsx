import ExternalLinkIcon from '@/public/icons/External_Link_Icon_fill.svg'

interface FurtherInformationButtonProps {
    department?: string
    name?: string
    href: string
}

const FurtherInformationButton = ({ department, name, href }: FurtherInformationButtonProps) => {
    const linkText = href
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/$/, '')
        .replace(/\//g, '/\u200B')

    return (
        <a
            href={href}
            target='_blank'
            rel='noopener noreferrer'
        >
            <button className='flex flex-col justify-center items-start gap-[22px]  p-[22px]  rounded-[8px] border-[2px] border-black border-opacity-20 tablet:hover:border-opacity-0 tablet:hover:shadow-[0px_0px_42px_0px_rgba(0,0,0,0.20)] transition-all duration-300 ease-[cubic-bezier(0.44,0,0.56,1)] group'>
                <ExternalLinkIcon className='h-[22px]  fill-current text-black opacity-[0.65] tablet:group-hover:opacity-100 transition-opacity ease-[cubic-bezier(0.44,0,0.56,1)] duration-300' />
                <div className='flex flex-col justify-center items-start gap-[5px]'>
                    <span className='text-[14px] font-bold leading-normal text-black opacity-[0.65] tablet:group-hover:opacity-100 text-left transition-opacity duration-300 ease-[cubic-bezier(0.44,0,0.56,1)]'>
                        {linkText}
                    </span>
                    {(department || name) && (
                        <span className='text-[14px] font-normal leading-normal text-black opacity-[0.65] tablet:group-hover:opacity-100 text-left transition-opacity duration-300 ease-[cubic-bezier(0.44,0,0.56,1)]'>
                            {department}{department && name && ' - '}{name}
                        </span>
                    )}
                </div>
            </button>
        </a>
    )
}

export default FurtherInformationButton