'use client'
import { useState, useEffect, useRef } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import PDFButton from '@/components/PDFButton'
import FurtherInformationButton from '@/components/FurtherInformationButton'
import LinkArrowButton from '@/components/LinkArrowButton'
import DateCard from '@/components/DateCard'
import MensaMealCard from '@/components/MensaMealCard'
import SectionNavigation from '@/components/SectionNavigation'
import AiChatModal from '@/components/AiChatModal'
import { Header } from "@/components/header"
import { MobileSidebar } from "@/components/mobile-sidebar"
import { BottomNavigation } from "@/components/bottom-navigation"
import { getStudiengangUrl } from '@/lib/studiengang-utils'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { StudiengangProvider, useStudiengangContext } from '@/lib/contexts/StudiengangContext'
import InfoLoadingPage from '@/components/InfoLoadingPage'
import InfoIcon from '@/public/icons/Info_Icon_in_Circle_fill.svg'
import OpenedTriangleArrow from '@/public/icons/Opened_Triangle_Arrow.svg'
import { parseTerminStartDate, parseTerminEndDate } from '@/lib/utils'

function InfoPageContent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isScrolledToLeft, setIsScrolledToLeft] = useState(true)
  const [isScrolledToRight, setIsScrolledToRight] = useState(false)
  const [currentSectionIndex, setCurrentSectionIndex] = useState<number>(0)
  const [hoveredSectionIndex, setHoveredSectionIndex] = useState<number | null>(null)
  const [isDesktop, setIsDesktop] = useState(false)

  const sectionRefs = useRef<(HTMLDivElement | null)[]>([])
  const termineScrollRef = useRef<HTMLDivElement>(null)

  const handleOpenItemChange = (index: number) => {
    setCurrentSectionIndex(index)
    if (!isDesktop) return
    const section = sectionRefs.current?.[index]
    if (!section) return
    window.scrollTo({ top: section.offsetTop - 122, behavior: 'smooth' })
  }

  const handleSectionHoverChange = (hovering: boolean, itemIndex?: number) => {
    setHoveredSectionIndex(hovering && itemIndex !== undefined ? itemIndex : null)
  }

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

  const allSections = [
    { key: 'dokumente', navigationLabel: 'Wichtige Dokumente', visible: pdfDocuments.length > 0 },
    { key: 'info', navigationLabel: 'Weitere Informationen', visible: true },
    { key: 'termine', navigationLabel: 'Terminüberblick', visible: semesterTermine.length > 0 },
    { key: 'mensa', navigationLabel: 'Speisekarte (Mensa)', visible: mensaMeals.length > 0 },
  ]

  const visibleSections = allSections.filter(s => s.visible)
  const visibleIdx = (key: string) => visibleSections.findIndex(s => s.key === key)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const nextUpIndex = semesterTermine.findIndex((t) => {
    const end = parseTerminEndDate(t.date)
    return end !== null && end >= today
  })

  const scrollToIndex = semesterTermine.findLastIndex((t) => {
    const start = parseTerminStartDate(t.date)
    const end = parseTerminEndDate(t.date)
    return start !== null && end !== null && start <= today && end >= today
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

    const idx = scrollToIndex !== -1 ? scrollToIndex : nextUpIndex
    const card = el.children[idx] as HTMLElement | undefined
    if (card) el.scrollTo({ left: card.offsetLeft + card.offsetWidth / 2 - el.offsetWidth / 2, behavior: 'instant' })

    update()
    el.addEventListener('scroll', update)
    window.addEventListener('resize', handleResize)

    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', handleResize)
    }
  }, [semesterTermine])

  useEffect(() => {
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 1230)
    }

    checkIsDesktop()
    window.addEventListener('resize', checkIsDesktop)
    return () => window.removeEventListener('resize', checkIsDesktop)
  }, [])

  useEffect(() => {
    if (!isDesktop) return

    const checkVisibility = () => {
      const threshold = 122

      for (let i = 0; i < sectionRefs.current.length; i++) {
        const el = sectionRefs.current[i]
        if (!el) continue
        const rect = el.getBoundingClientRect()
        if (rect.top <= threshold && rect.bottom > threshold) {
          setCurrentSectionIndex(i)
          break
        }
      }
    }

    window.addEventListener('scroll', checkVisibility, { passive: true })
    window.addEventListener('resize', checkVisibility)
    checkVisibility()

    return () => {
      window.removeEventListener('scroll', checkVisibility)
      window.removeEventListener('resize', checkVisibility)
    }
  }, [isDesktop])


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
                  <div className='relative flex w-full items-center justify-center gap-[11px]'>
                    <div className='absolute bg-[#F78D57] inset-y-0 -inset-x-[22px] tablet:inset-x-0 tablet:rounded-[8px]' />
                    <InfoIcon className='w-[28px] fill-current text-black shrink-0 z-[1]' />
                    <h1 className='text-[25px] desktop:text-[28px] font-bold leading-normal text-black desktop:text-center z-[1]'>
                      Dein Studiengang: {userMajor || 'Kein Studiengang ausgewählt'}
                    </h1>
                  </div>
                </div>
                {pdfDocuments.length > 0 && (
                  <div ref={el => { sectionRefs.current[visibleIdx('dokumente')] = el }} className='w-full flex flex-col items-start justify-center gap-[32px]'>
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
                <div ref={el => { sectionRefs.current[visibleIdx('info')] = el }} className='w-full flex flex-col items-start justify-center gap-[32px]'>
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
                    <div ref={el => { sectionRefs.current[visibleIdx('termine')] = el }} className='w-full flex flex-col items-start justify-center gap-[32px]'>
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
                            const start = parseTerminStartDate(termin.date)
                            const end = parseTerminEndDate(termin.date)
                            const isActive = start !== null && end !== null && start <= today && end >= today
                            return (
                              <DateCard
                                key={index}
                                date={termin.date}
                                description={termin.description}
                                hasPassed={end !== null ? end < today : index < nextUpIndex}
                                isNextUp={isActive || index === nextUpIndex}
                              />
                            )
                          })}
                        </div>
                        <div
                          className={`absolute h-full aspect-square left-0 bg-gradient-to-r from-white to-transparent transition-opacity duration-300 ease-[cubic-bezier(0.44,0,0.56,1)] ${!isScrolledToLeft ? '' : 'opacity-0 pointer-events-none'} flex justify-start items-center cursor-pointer group`}
                          onClick={() => { const el = termineScrollRef.current; if (!el) return; const c = el.scrollLeft + el.offsetWidth / 2; const prev = Array.from(el.children as HTMLCollectionOf<HTMLElement>).reverse().find(card => card.offsetLeft + card.offsetWidth / 2 < c - 1); if (prev) el.scrollTo({ left: prev.offsetLeft + prev.offsetWidth / 2 - el.offsetWidth / 2, behavior: 'smooth' }) }}
                        >
                          <OpenedTriangleArrow className='w-[25px] fill-current text-black rotate-90 opacity-[0.42] tablet:group-hover:opacity-100 transition-opacity duration-300 ease-[cubic-bezier(0.44,0,0.56,1)]' />
                        </div>
                        <div
                          className={`absolute h-full aspect-square right-0 bg-gradient-to-l from-white to-transparent transition-opacity duration-300 ease-[cubic-bezier(0.44,0,0.56,1)] ${!isScrolledToRight ? '' : 'opacity-0 pointer-events-none'} flex justify-end items-center cursor-pointer group`}
                          onClick={() => { const el = termineScrollRef.current; if (!el) return; const c = el.scrollLeft + el.offsetWidth / 2; const next = Array.from(el.children as HTMLCollectionOf<HTMLElement>).find(card => card.offsetLeft + card.offsetWidth / 2 > c + 1); if (next) el.scrollTo({ left: next.offsetLeft + next.offsetWidth / 2 - el.offsetWidth / 2, behavior: 'smooth' }) }}
                        >
                          <OpenedTriangleArrow className='w-[25px] fill-current text-black rotate-[270deg] opacity-[0.42] tablet:group-hover:opacity-100 transition-opacity duration-300 ease-[cubic-bezier(0.44,0,0.56,1)]' />
                        </div>

                      </div>
                      <LinkArrowButton text='Mehr erfahren' href='https://www.th-nuernberg.de/studium-karriere/wichtiges-zum-studienstart/termine-im-ueberblick/sommersemester/' />
                    </div>
                  )}
                  {mensaMeals.length > 0 && (
                    <div ref={el => { sectionRefs.current[visibleIdx('mensa')] = el }} className='w-full flex flex-col items-start justify-center gap-[32px]'>
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
      <SectionNavigation
        labels={visibleSections.map(s => s.navigationLabel)}
        currentSectionIndex={currentSectionIndex}
        onOpenItemChange={handleOpenItemChange}
        onHoverChange={handleSectionHoverChange}
        hoveredSectionIndex={hoveredSectionIndex}
      />
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