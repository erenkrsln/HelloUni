'use client'
import { useState, useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import PDFButton from '@/components/PDFButton'
import FurtherInformationButton from '@/components/FurtherInformationButton'
import LinkArrowButton from '@/components/LinkArrowButton'
import MensaMealCard from '@/components/MensaMealCard'
import AiChatModal from '@/components/AiChatModal'
import { Header } from "@/components/header"
import { MobileSidebar } from "@/components/mobile-sidebar"
import { BottomNavigation } from "@/components/bottom-navigation"
import { getStudiengangUrl } from '@/lib/studiengang-utils'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { StudiengangProvider, useStudiengangContext } from '@/lib/contexts/StudiengangContext'
import InfoLoadingPage from '@/components/InfoLoadingPage'

function InfoPageContent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const { currentUser } = useCurrentUser()
  const { setStudiengangData } = useStudiengangContext()

  const userMajor = currentUser?.major || ''
  const userSemester = currentUser?.semester || 1

  const studiengangCache = useQuery(
    api.queries.getStudiengangCache,
    userMajor ? { major: userMajor } : 'skip'
  )
  const mensaCache = useQuery(api.queries.getMensaCache)

  const pdfDocuments = studiengangCache?.pdfLinks ?? []
  const mensaMeals = mensaCache?.meals ?? []

  const isLoading =
    currentUser === undefined ||
    mensaCache === undefined ||
    (!!userMajor && studiengangCache === undefined)

  useEffect(() => {
    setStudiengangData({
      major: userMajor,
      semester: userSemester,
      fullContent: studiengangCache?.fullContent ?? '',
      pdfLinks: studiengangCache?.pdfLinks ?? [],
      mensaMeals: mensaCache?.meals,
    })
  }, [studiengangCache, mensaCache, userMajor, userSemester, setStudiengangData])

  return (
    <>
      <Header onMenuClick={() => setIsSidebarOpen(true)} />
      <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {isLoading ? (
        <InfoLoadingPage />
      ) : (
        <div className='w-full flex flex-col items-center justify-between pb-[104px] desktop:pb-[124px]'>
          <div className='w-full flex items-center justify-center px-[22px] tablet:px-[42px] desktop:px-[65px]'>
            <div className='w-full tablet:max-w-[768px] flex flex-col items-center justify-center gap-[56px] tablet:gap-[82px] desktop:gap-[114px]'>
              <div className='w-full flex flex-col items-center justify-center gap-[56px]'>
                <div className='w-full flex flex-col items-center justify-center pt-[calc(104px+env(safe-area-inset-top,0px))] desktop:pt-[calc(124px+env(safe-area-inset-top,0px))]'>
                  <div className='flex w-full flex-col items-center justify-center bg-[#F78D57] rounded-[8px]'>
                    <h1 className='text-[25px] desktop:text-[28px] font-bold leading-normal text-black desktop:text-center'>
                      Dein Studiengang: {userMajor || 'Kein Studiengang ausgewählt'}
                    </h1>
                  </div>
                </div>
                {pdfDocuments.length > 0 && (
                  <div className='w-full flex flex-col items-start justify-center gap-[42px]'>
                    <div className='flex w-full flex-col items-start justify-center gap-[14px]'>
                      <h1 className='text-[25px] desktop:text-[28px] font-bold leading-normal text-black'>Wichtige Dokumente</h1>
                      <p className='w-full text-[14px] font-normal leading-normal text-black'>
                        Hier findest du alle relevanten PDF-Dokumente zu deinem Studiengang.
                      </p>
                    </div>
                    <div className='w-full flex flex-wrap items-center gap-[22px]'>
                      {pdfDocuments.map((pdf, index) => (
                        <PDFButton
                          key={index}
                          text={pdf.text}
                          href={pdf.href}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div className='w-full flex flex-col items-start justify-center gap-[42px]'>
                  <div className='flex w-full flex-col items-start justify-center gap-[14px]'>
                    <h1 className='text-[25px] desktop:text-[28px] font-bold leading-normal text-black'>Weitere Informationen</h1>
                    <p className='w-full text-[14px] font-normal leading-normal text-black'>
                      Hier findest du zusätzliche Informationen, weiterführende Hinweise und hilfreiche Ressourcen rund um deinen Studiengang.
                    </p>
                  </div>
                  <FurtherInformationButton
                    department="Technische Hochschule Nürnberg Georg Simon Ohm"
                    name={userMajor}
                    href={userMajor ? getStudiengangUrl(userMajor) : ''}
                  />
                </div>
              </div>

              <div className='flex flex-col w-full justify-center items-center gap-[22px]'>
                <div className='flex w-full justify-center items-center gap-[17px]'>
                  <div className='flex-1 h-[2px] bg-black opacity-20 rounded-[42px]' />
                  <span className='text-[14px] font-normal leading-normal text-black opacity-20'>
                    Mensa
                  </span>
                  <div className='flex-1 h-[2px] bg-black opacity-20 rounded-[42px]' />
                </div>
                {mensaMeals.length > 0 && (
                  <div className='w-full flex flex-col items-start justify-center gap-[42px]'>
                    <div className='flex w-full flex-col items-start justify-center gap-[14px]'>
                      <h1 className='text-[25px] desktop:text-[28px] font-bold leading-normal text-black'>Speisekarte</h1>
                      <p className='w-full text-[14px] font-normal leading-normal text-black'>
                        Das gibt es heute in der Mensateria Ohm (Wollentorstr. 4, 90489 Nürnberg).
                      </p>
                    </div>
                    <div className='w-full flex flex-col justify-center items-start gap-[22px]'>
                      {mensaMeals.map((meal, index) => (
                        <MensaMealCard
                          key={index}
                          name={meal.name}
                          price={meal.price}
                          index={index + 1}
                        />
                      ))}
                    </div>
                    <LinkArrowButton text='Mehr erfahren' href='https://www.werkswelt.de/?id=mohm' />
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
      {!isLoading && <AiChatModal />}
      <BottomNavigation />
    </>
  )
}

function InfoPage() {
  return (
    <StudiengangProvider>
      <InfoPageContent />
    </StudiengangProvider>
  )
}

export default InfoPage