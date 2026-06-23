'use client'
import { createContext, useContext, useState, ReactNode } from 'react'

export type StudiengangData = {
  major: string
  semester: number
  fullContent: string
  pdfLinks: Array<{ text: string; href: string }>
  mensaMeals?: Array<{ name: string; price: string }>
}

type StudiengangContextType = StudiengangData & {
  setStudiengangData: (data: StudiengangData | ((prev: StudiengangData) => StudiengangData)) => void
}

const StudiengangContext = createContext<StudiengangContextType | null>(null)

export function StudiengangProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StudiengangData>({
    major: '',
    semester: 1,
    fullContent: '',
    pdfLinks: [],
  })

  return (
    <StudiengangContext.Provider value={{ ...data, setStudiengangData: setData }}>
      {children}
    </StudiengangContext.Provider>
  )
}

export function useStudiengangContext() {
  const context = useContext(StudiengangContext)
  if (!context) throw new Error('useStudiengangContext must be used within StudiengangProvider')
  return context
}

export const useOptionalStudiengangContext = () => useContext(StudiengangContext)
