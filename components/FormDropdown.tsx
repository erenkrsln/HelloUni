'use client'
import React, { useState, useEffect, KeyboardEvent, useRef, useCallback, FocusEvent as ReactFocusEvent, useMemo } from 'react'
import { UseFormRegister } from 'react-hook-form'
import { FormFields } from '../[ags]/riskoverview/validationSchema'
import ArrowIcon from '@/public/icons/Opened_Triangle_Arrow_Icon_Bold.svg'
import { useTranslation } from 'react-i18next'

interface FormDropdownProps {
  register: UseFormRegister<FormFields>
  name: keyof FormFields
  isValid: boolean
  error?: string | undefined
  showDropdown: boolean
  options: Record<string, string>
  selectedOptions: string[]
  value: string
  valueParts: string[]
  onFocus: () => void
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => void
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onToggle: (key: string) => void
}

const FormDropdown: React.FC<FormDropdownProps> = ({
  register,
  name,
  isValid,
  error,
  showDropdown,
  options,
  selectedOptions,
  value,
  valueParts,
  onFocus,
  onBlur,
  onChange,
  onToggle
}) => {
  const { t } = useTranslation('riskOverview')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [isKeyboardNav, setIsKeyboardNav] = useState(false)
  const optionsArray = useMemo(() => Object.entries(options), [options])
  const containerRef = useRef<HTMLDivElement>(null)
  const submitButtonRef = useRef<boolean>(false)
  const [hoverPreview, setHoverPreview] = useState<string>('')
  const prevValueRef = useRef(value)

  const handleMouseDown = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement

    if (target.tagName === 'BUTTON' && (target as HTMLButtonElement).type === 'submit') {
      submitButtonRef.current = true
    } else if (containerRef.current?.contains(target)) {
      e.preventDefault()
    } else if (submitButtonRef.current) {
      submitButtonRef.current = false
    }
  }, [])

  useEffect(() => {
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [handleMouseDown])

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    if (!submitButtonRef.current) {
      if (!value) {
        setHighlightedIndex(-1)
        setHoverPreview('')
      }
      onBlur(e)
    }
  }, [onBlur, value])

  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isKeyboardNav && highlightedIndex >= 0 && dropdownRef.current) {
      const dropdown = dropdownRef.current
      const highlightedElement = dropdown.querySelector(`li:nth-child(${highlightedIndex + 1})`)

      if (highlightedElement) {
        const elementRect = highlightedElement.getBoundingClientRect()
        const containerRect = dropdown.getBoundingClientRect()

        if (elementRect.bottom > containerRect.bottom) {
          dropdown.scrollTop += elementRect.bottom - containerRect.bottom
        } else if (elementRect.top < containerRect.top) {
          dropdown.scrollTop -= containerRect.top - elementRect.top
        }
      }
    }
  }, [highlightedIndex, isKeyboardNav])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setIsKeyboardNav(true)
        setHighlightedIndex(prev => {
          const newIndex = prev < optionsArray.length - 1 ? prev + 1 : prev
          if (!value && newIndex >= 0 && newIndex < optionsArray.length) {
            const [key] = optionsArray[newIndex]
            setHoverPreview(options[key])
          }
          return newIndex
        })
        break
      case 'ArrowUp':
        e.preventDefault()
        setIsKeyboardNav(true)
        setHighlightedIndex(prev => {
          if (prev === -1) return prev
          const newIndex = prev > 0 ? prev - 1 : prev
          if (!value && newIndex >= 0 && newIndex < optionsArray.length) {
            const [key] = optionsArray[newIndex]
            setHoverPreview(options[key])
          }
          return newIndex
        })
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < optionsArray.length) {
          const [key] = optionsArray[highlightedIndex]
          onToggle(key)
        }
        break
      case 'Escape':
        e.preventDefault()
        if (!value) {
          setHighlightedIndex(-1)
          setHoverPreview('')
        }
        onBlur(createSyntheticEvent(e.target))
        break
    }
  }, [showDropdown, optionsArray, highlightedIndex, onToggle, onBlur, value])

  useEffect(() => {
    setHighlightedIndex(-1)
  }, [options])

  const handleContainerClick = useCallback(() => {
    const input = containerRef.current?.querySelector('input')
    if (input) {
      input.focus()
    }
  }, [])

  const handleIconClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const input = containerRef.current?.querySelector('input')
    if (input) {
      if (showDropdown) {
        if (!value) {
          setHighlightedIndex(-1)
          setHoverPreview('')
        }
        onBlur(createSyntheticEvent(input))
      } else {
        input.focus()
        onFocus()
      }
    }
  }, [showDropdown, onBlur, value, onFocus])

  const createSyntheticEvent = (target: EventTarget): ReactFocusEvent<HTMLInputElement> => ({
    target,
    relatedTarget: null
  } as ReactFocusEvent<HTMLInputElement>)

  useEffect(() => {
    if (hoverPreview && showDropdown) {
      const matchingIndex = optionsArray.findIndex(([key, value]) => value === hoverPreview)
      if (matchingIndex !== -1) {
        setHighlightedIndex(matchingIndex)
      }
    }
  }, [hoverPreview, optionsArray, showDropdown])

  useEffect(() => {
    if (value !== prevValueRef.current) {
      const lastPart = valueParts?.at(-1)
      if (lastPart && Object.values(options).includes(lastPart)) setHoverPreview(lastPart)
    }
    prevValueRef.current = value
  }, [value, options, valueParts])

  return (
    <div
      ref={containerRef}
      className='relative w-full flex flex-col gap-6'
    >
      <label className='relative left-12 text-[15px] font-bold leading-normal text-black'>
        {t('consultationForm.riskTypeDropdown.label')}
      </label>
      <div
        onClick={handleContainerClick}
        className={`w-full h-[41px] flex items-center gap-[23px]  px-12 bg-black opacity-20 bg-opacity border-[2px] border-denial rounded-[6px] transition-colors duration-300 ease-[cubic-bezier(0.44,0,0.56,1)] cursor-text
            ${isValid ? 'border-opacity-0' : ''} tablet:hover:bg-opacity-100 focus-within:bg-opacity-100 group`}
      >
        <input
          {...register(name, { required: false })}
          placeholder={hoverPreview || t('consultationForm.riskTypeDropdown.placeholder')}
          className='w-full [background:none] outline-none text-[15px] font-normal leading-normal text-black placeholder:text-[15px] font-normal leading-normal placeholder:text-gray'
          onFocus={onFocus}
          onBlur={(e) => {
            handleBlur(e)
          }}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          value={value}
        />
        <div className='flex items-center w-[15px] justify-center'>
          <ArrowIcon
            onClick={handleIconClick}
            className={`h-12 cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.44,0,0.56,1)] ${showDropdown ? '[transform:rotateZ(180deg)]' : '[transform:rotateZ(0deg)] text-black opacity-[0.65] tablet:group-hover:text-black'}`}
          />
        </div>
      </div>
      {optionsArray.length > 0 && (
        <div
          ref={dropdownRef}
          className={`absolute top-[76px] z-1 max-h-274 overflow-y-auto bg-white rounded-[9px] shadow w-full ${showDropdown ? '' : 'opacity-0 pointer-events-none'} transition-opacity duration-300 ease-[cubic-bezier(0.44,0,0.56,1)]`}
        >
          <ul className='py-[9px] '>
            {optionsArray.map(([key, val], index) => (
              <li key={key}>
                <p
                  onClick={() => { onToggle(key) }}
                  onMouseEnter={() => {
                    setIsKeyboardNav(false)
                    setHighlightedIndex(index)
                    if (!value) {
                      setHoverPreview(val)
                    }
                  }}
                  className={`flex items-center text-[15px] font-normal leading-normal px-12 py-[6px] duration-300 cursor-pointer
                      ${selectedOptions.includes(val)
                      ? 'bg-black opacity-20 text-black'
                      : index === highlightedIndex
                        ? 'bg-black opacity-20 bg-opacity text-black'
                        : 'text-black opacity-[0.65] tablet:hover:bg-black opacity-20 tablet:hover:bg-opacity tablet:hover:text-black'
                    }`}
                >
                  {val}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default FormDropdown