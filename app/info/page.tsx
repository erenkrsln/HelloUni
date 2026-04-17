'use client'
import { useState, useEffect } from 'react'
import PDFButton from '@/components/PDFButton'
import FurtherInformationButton from '@/components/FurtherInformationButton'
import ExternalLinkWithIcon from '@/components/ExternalLinkWithIcon'
import Accordion, { AccordionItemData } from '@/components/Accordion'
import { Header } from "@/components/header"
import { MobileSidebar } from "@/components/mobile-sidebar"
import { BottomNavigation } from "@/components/bottom-navigation"

interface ParamsType {
  ags: string
}

function InformationPage({ params }: { params: ParamsType }) {
  const [isMobile, setIsMobile] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [faqAccordionOpenItem, setFaqAccordionOpenItem] = useState<number | null>(0)
  const [faqAccordionHoveredItem, setFaqAccordionHoveredItem] = useState<number | null>(null)

  const TABLET_BREAKPOINT = 740

  const faqAccordionItems: AccordionItemData[] = [
    {
      title: "first title",
      content: "first content"
    },
    {
      title: "second title",
      content: "second content",
      subItems: [
        { title: "first sub title", content: "first sub content" },
        { title: "second sub title", content: "second sub content" }
      ]
    },
    {
      title: "third title",
      content: "third content",
      subItems: [
        { title: "third sub title", content: "third sub content" },
        { title: "fourth sub title", content: "fourth sub content" }
      ]
    },
    {
      title: "fourth title",
      content: "fourth content"
    }
  ]

  const handleFaqHoverChange = (hovering: boolean, itemIndex?: number) => {
    setFaqAccordionHoveredItem(hovering && itemIndex !== undefined ? itemIndex : null)
  }

  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < TABLET_BREAKPOINT)

    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  return (
    <>
      <Header onMenuClick={() => setIsSidebarOpen(true)} />
      <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className='w-full flex flex-col items-center justify-between gap-[56px] tablet:gap-[82px] desktop:gap-[114px] pb-[104px] desktop:pb-[124px]'>
        <div className='w-full flex items-center justify-center px-[22px] tablet:px-[42px] desktop:px-[65px]'>
          <div className='w-full max-w-[1230px] flex flex-col items-center justify-center gap-[56px] tablet:gap-[82px] desktop:gap-[114px]'>
            <div className='w-full flex flex-col items-center justify-center gap-[42px]'>
              <div className='flex w-full flex-col items-start justify-center pt-[104px] desktop:pt-[124px] gap-[14px]'>
                <h1 className='text-[25px] desktop:text-[28px] font-bold leading-normal text-black'>title</h1>
                <p className='w-full text-[14px] font-normal leading-normal text-black'>
                  description
                </p>
              </div>
              <Accordion
                items={faqAccordionItems}
                openItem={faqAccordionOpenItem}
                onOpenItemChange={setFaqAccordionOpenItem}
                hoveredItem={faqAccordionHoveredItem}
                onHoverChange={handleFaqHoverChange}
                suppressTicker
              />
            </div>
            <div className='w-full flex flex-col items-start justify-center gap-[42px]'>
              <div className='flex w-full flex-col items-start justify-center gap-[14px]'>
                <h1 className='text-[25px] desktop:text-[28px] font-bold leading-normal text-black'>title</h1>
                <p className='w-full text-[14px] font-normal leading-normal text-black'>
                  description
                </p>
              </div>
              <PDFButton
                text="text"
                href=''
              />
            </div>
            <div className='w-full flex flex-col items-center justify-center gap-[42px] tablet:gap-[56px] desktop:gap-[82px]'>

              <div className='w-full flex flex-col items-start justify-center gap-[42px]'>
                <div className='flex w-full flex-col items-start justify-center gap-[14px]'>
                  <h1 className='text-[25px] desktop:text-[28px] font-bold leading-normal text-black'>title</h1>
                  <p className='w-full text-[14px] font-normal leading-normal text-black'>
                    further information description
                  </p>
                </div>
                <FurtherInformationButton
                  department="department"
                  name="name"
                  href="url"
                />
              </div>
              <div className='flex flex-col w-full justify-center items-center gap-[22px]'>
                <div className='flex w-full justify-center items-center gap-[17px]'>
                  <div className='flex-1 h-[2px] bg-black opacity-20 rounded-[42px]' />
                  <span className='text-[11px] font-normal leading-normal text-black opacity-20'>
                    inquiries title
                  </span>
                  <div className='flex-1 h-[2px] bg-black opacity-20 rounded-[42px]' />
                </div>
                <div className='flex flex-col w-full justify-center items-start gap-[32px]'>
                  <p className='w-full text-[14px] font-normal leading-normal text-black'>
                    inquiries description
                  </p>
                  <div className='flex flex-col justify-center items-start gap-[22px]'>
                    <span className='text-[14px] font-bold leading-normal text-black'>
                      - department
                    </span>
                    <div className='flex flex-col justify-center items-start gap-[14px]'>
                      <ExternalLinkWithIcon href="info@hello-uni.de" />
                      <ExternalLinkWithIcon href="+49 114 455789" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <BottomNavigation />
    </>
  )
}

export default InformationPage