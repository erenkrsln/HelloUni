'use client'
import SpinnerLogo from '@/public/HelloUni_Spinner_Logo.svg'

const InfoLoadingPage = () => {
    return (
        <div className='fixed inset-0 z-[9999] flex justify-center items-center overflow-hidden p-[22px] tablet:p-[42px] desktop:p-[65px]'>
            <SpinnerLogo className='fill-current h-[82px] text-foreground opacity-[0.42] animate-[spin_2.2s_linear_infinite]' />
        </div>
    )
}

export default InfoLoadingPage