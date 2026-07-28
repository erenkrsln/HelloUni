'use client'

interface SectionNavigationItemProps {
  label: string
  isActive?: boolean
  isHovered?: boolean
  onClick?: () => void
  onHoverChange?: (hovering: boolean) => void
}

const SectionNavigationItem = ({
  label,
  isActive = false,
  isHovered = false,
  onClick,
  onHoverChange
}: SectionNavigationItemProps) => {
  return (
    <div
      className='flex justify-center items-center gap-[5px] cursor-pointer'
      onClick={onClick}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
    >
      <span className={`text-[11px] font-bold leading-normal text-foreground text-left transition-opacity duration-300 ease-[cubic-bezier(0.44,0,0.56,1)] whitespace-pre-line ${isActive ? 'opacity-100' : isHovered ? 'opacity-[0.65]' : 'opacity-[0.42]'}`}>
        {label}
      </span>
      <div className={`bg-black ${isActive ? 'w-[25px] opacity-100' : isHovered ? 'w-[17px] opacity-[0.65]' : 'w-[11px] opacity-[0.42]'} h-[2px] rounded-l-[42px] transition-all duration-300 ease-[cubic-bezier(0.44,0,0.56,1)]`} />
    </div>
  )
}

export default SectionNavigationItem