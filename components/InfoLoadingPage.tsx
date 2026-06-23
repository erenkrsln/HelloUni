'use client'
import { useState, useEffect } from 'react'
import SpinnerLogo from '@/public/HelloUni_Spinner_Logo.svg'

const InfoLoadingPage = () => {
    const [dots, setDots] = useState('')

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev === '...' ? '' : prev + '.')
        }, 300)

        return () => clearInterval(interval)
    }, [])

    return (
        <div className='fixed inset-0 z-[9999] flex justify-center items-center overflow-hidden p-[22px] tablet:p-[42px] desktop:p-[65px]'>
            <SpinnerLogo className='fill-current h-[82px] text-black opacity-[0.42] animate-[spin_2.2s_linear_infinite]' />
            <div className='absolute left-[22px] tablet:left-[42px] desktop:left-[65px] bottom-[22px] tablet:bottom-[42px] desktop:bottom-[65px] text-[14px] font-normal leading-normal text-black text-left opacity-[0.65] -rotate-90 origin-top-left'>
                Lädt{dots}
            </div>
        </div>
    )
}

export default InfoLoadingPage