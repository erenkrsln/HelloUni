'use client'
import { useState, useEffect, useRef } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import PDFButton from '@/components/PDFButton'
import FurtherInformationButton from '@/components/FurtherInformationButton'
import LinkArrowButton from '@/components/LinkArrowButton'
import DateCard from '@/components/DateCard'
import MensaMealCard from '@/components/MensaMealCard'
import AiChatModal from '@/components/AiChatModal'
import { Header } from "@/components/header"
import { MobileSidebar } from "@/components/mobile-sidebar"
import { BottomNavigation } from "@/components/bottom-navigation"
import { getStudiengangUrl } from '@/lib/studiengang-utils'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { StudiengangProvider, useStudiengangContext } from '@/lib/contexts/StudiengangContext'
import InfoLoadingPage from '@/components/InfoLoadingPage'

const parseTerminDate = (dateStr: string): Date | null => {
  const m = dateStr.match(/(\d{2})\.(\d{2})\.(\d{4})/)
  return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null
}

function InfoPageContent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isScrolledToLeft, setIsScrolledToLeft] = useState(true)
  const [isScrolledToRight, setIsScrolledToRight] = useState(false)
  const termineScrollRef = useRef<HTMLDivElement>(null)

  const { currentUser } = useCurrentUser()
  const { setStudiengangData } = useStudiengangContext()

  const userMajor = currentUser?.major || ''
  const userSemester = currentUser?.semester || 1

  const studiengangCache = useQuery(
    api.queries.getStudiengangCache,
    userMajor ? { major: userMajor } : 'skip'
  )
  const mensaCache = useQuery(api.queries.getMensaCache)
  const semesterTermineCache = useQuery(api.queries.getSemesterTermineCache)

  const pdfDocuments = studiengangCache?.pdfLinks ?? []
  const mensaMeals = mensaCache?.meals ?? []
  const semesterTermine = semesterTermineCache?.termine ?? []
  const semesterLabel = semesterTermineCache?.label ?? ''

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const nextUpIndex = semesterTermine.findIndex((t) => {
    const d = parseTerminDate(t.date)
    return d !== null && d >= today
  })

  const isLoading =
    currentUser === undefined ||
    mensaCache === undefined ||
    semesterTermineCache === undefined ||
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

  useEffect(() => {
    const el = termineScrollRef.current
    if (!el) return

    const update = () => {
      setIsScrolledToLeft(el.scrollLeft === 0)
      setIsScrolledToRight(el.scrollLeft + el.offsetWidth >= el.scrollWidth - 1)
    }

    const handleResize = () => requestAnimationFrame(update)

    const card = el.children[nextUpIndex] as HTMLElement | undefined
    if (card) el.scrollTo({ left: card.offsetLeft + card.offsetWidth / 2 - el.offsetWidth / 2, behavior: 'instant' })

    update()
    el.addEventListener('scroll', update)
    window.addEventListener('resize', handleResize)

    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', handleResize)
    }
  }, [semesterTermine])

  return (
    <>
      <Header onMenuClick={() => setIsSidebarOpen(true)} />
      <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {isLoading && <InfoLoadingPage />}
      <div className='w-full flex flex-col items-center justify-between pt-[calc(104px+env(safe-area-inset-top,0px))] desktop:pt-[calc(124px+env(safe-area-inset-top,0px))] pb-[104px] desktop:pb-[124px]'>
        {!isLoading && (
          <div className='w-full flex items-center justify-center px-[22px] tablet:px-[42px] desktop:px-[65px]'>
            <div className='w-full tablet:max-w-[768px] flex flex-col items-center justify-center gap-[56px] tablet:gap-[82px] desktop:gap-[114px]'>
              <div className='w-full flex flex-col items-center justify-center gap-[56px]'>
                <div className='w-full flex flex-col items-center justify-center'>
                  <div className='relative flex w-full flex-col items-center justify-center'>
                    <div className='absolute bg-[#F78D57] inset-y-0 -inset-x-[22px] tablet:inset-x-0 tablet:rounded-[8px]' />
                    <h1 className='text-[25px] desktop:text-[28px] font-bold leading-normal text-black desktop:text-center z-[1]'>
                      Dein Studiengang: {userMajor || 'Kein Studiengang ausgewählt'}
                    </h1>
                  </div>
                </div>
                {pdfDocuments.length > 0 && (
                  <div className='w-full flex flex-col items-start justify-center gap-[32px]'>
                    <div className='flex w-full flex-col items-start justify-center gap-[8px]'>
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
                <div className='w-full flex flex-col items-start justify-center gap-[32px]'>
                  <div className='flex w-full flex-col items-start justify-center gap-[8px]'>
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
                  <span className='text-[14px] font-normal leading-normal text-black opacity-[0.42]'>
                    Allgemeine Informationen
                  </span>
                  <div className='flex-1 h-[2px] bg-black opacity-20 rounded-[42px]' />
                </div>
                <div className='w-full flex flex-col items-center justify-center gap-[56px]'>
                  {semesterTermine.length > 0 && (
                    <div className='w-full flex flex-col items-start justify-center gap-[32px]'>
                      <div className='flex w-full flex-col items-start justify-center gap-[8px]'>
                        <h1 className='text-[25px] desktop:text-[28px] font-bold leading-normal text-black'>Terminüberblick</h1>
                        <p className='w-full text-[14px] font-normal leading-normal text-black'>
                          Hier findest du eine Übersicht über alle wichtigen Termine im {semesterLabel}.
                        </p>
                      </div>
                      <div className='relative w-full h-[102.5px]'>
                        <div
                          ref={termineScrollRef}
                          className='absolute inset-0 flex justify-start items-center gap-[22px] overflow-x-auto hide-scrollbar snap-x snap-mandatory'
                        >
                          {semesterTermine.map((termin, index) => {
                            const d = parseTerminDate(termin.date)
                            return (
                              <DateCard
                                key={index}
                                date={termin.date}
                                description={termin.description}
                                hasPassed={d !== null ? d < today : index < nextUpIndex}
                                isNextUp={index === nextUpIndex}
                              />
                            )
                          })}
                        </div>
                        <div className={`absolute h-full w-[56px] left-0 bg-gradient-to-r from-white to-transparent transition-opacity duration-300 ease-[cubic-bezier(0.44,0,0.56,1)] ${!isScrolledToLeft ? '' : 'opacity-0'} pointer-events-none`} />
                        <div className={`absolute h-full w-[56px] right-0 bg-gradient-to-l from-white to-transparent transition-opacity duration-300 ease-[cubic-bezier(0.44,0,0.56,1)] ${!isScrolledToRight ? '' : 'opacity-0'} pointer-events-none`} />
                      </div>
                      <LinkArrowButton text='Mehr erfahren' href='https://www.th-nuernberg.de/studium-karriere/wichtiges-zum-studienstart/termine-im-ueberblick/sommersemester/' />
                    </div>
                  )}
                  {mensaMeals.length > 0 && (
                    <div className='w-full flex flex-col items-start justify-center gap-[32px]'>
                      <div className='flex w-full flex-col items-start justify-center gap-[8px]'>
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
      </div>
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