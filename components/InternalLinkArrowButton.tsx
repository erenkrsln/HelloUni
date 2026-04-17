import Link from 'next/link'
import ArrowIcon from '@/public/icons/Arrow_Icon.svg'

interface InternalLinkArrowButtonProps {
    text: string
    href: string
}

const InternalLinkArrowButton = ({ text, href }: InternalLinkArrowButtonProps) => {
    return (
        <Link href={href || '/'} className='flex justify-center items-center'>
            <button className='flex justify-center items-center p-[9px]  gap-[6px] rounded-[9px] border-[2px] border-black opacity-20 tablet:hover:border-opacity-0 tablet:hover:shadow-[0px_0px_47px_0px_rgba(0,0,0,0.23)] transition-all duration-300 ease-[cubic-bezier(0.44,0,0.56,1)] group'>
                <span className='text-[15px] font-bold leading-normal text-black opacity-[0.65] tablet:group-hover:text-black text-left transition-colors duration-300 ease-[cubic-bezier(0.44,0,0.56,1)]'>
                    {text}
                </span>
                <div className='relative flex justify-center items-center overflow-hidden'>
                    <ArrowIcon className='h-12 invisible' />
                    <ArrowIcon className='absolute inset-y-0 -translate-x-full tablet:group-hover:translate-x-0 fill-current text-black opacity-[0.65] tablet:group-hover:text-black transition-all ease-[cubic-bezier(0.44,0,0.56,1)] duration-300 tablet:group-hover:[transition-delay:74ms] tablet:group-[&:not(:hover)]:[transition-delay:0ms]' />
                    <ArrowIcon className='absolute inset-y-0 tablet:group-hover:translate-x-full fill-current text-black opacity-[0.65] tablet:group-hover:text-black transition-all ease-[cubic-bezier(0.44,0,0.56,1)] duration-300 tablet:group-hover:[transition-delay:0ms] tablet:group-[&:not(:hover)]:[transition-delay:74ms]' />
                </div>
            </button>
        </Link>
    )
}

export default InternalLinkArrowButton