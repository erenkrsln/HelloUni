import Link from 'next/link'

interface InternalLinkButtonProps {
    text: string
    href?: string
    onReset?: () => void
}

const InternalLinkButton = ({ text, href, onReset }: InternalLinkButtonProps) => {
    const buttonStyle = 'flex w-full tablet:w-auto justify-center items-center bg-white p-[23px]  rounded-[9px] border-[2px] border-black opacity-20 tablet:hover:border-opacity-0 tablet:hover:shadow-[0px_0px_47px_0px_rgba(0,0,0,0.23)] text-[15px] font-bold leading-normal text-black opacity-[0.65] tablet:hover:text-black transition-all duration-300 ease-[cubic-bezier(0.44,0,0.56,1)]'

    return onReset ? (
        <button
            onClick={onReset}
            className={buttonStyle}
        >
            {text}
        </button>
    ) : (
        <Link href={href || '/'} className='flex w-full tablet:w-auto justify-center items-center'>
            <button className={buttonStyle}>
                {text}
            </button>
        </Link>
    )
}

export default InternalLinkButton