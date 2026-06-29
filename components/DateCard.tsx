interface DateCardProps {
  date: string
  description: string
  isNextUp?: boolean
  hasPassed?: boolean
}

export default function DateCard({ date, description, isNextUp = false, hasPassed = false }: DateCardProps) {
  return (
    <div className={`flex flex-col justify-center items-start gap-[8px] p-[22px] rounded-[8px] border-[2px] shrink-0 snap-center snap-always
      ${isNextUp ? 'bg-[#F78D57] bg-opacity-[0.65] border-[#F78D57] border-opacity-[0.65]' : 'bg-black bg-opacity-[0.11] border-black border-opacity-20'}
      ${hasPassed ? 'opacity-[0.20]' : ''}`}>
      <span className='text-[17px] font-bold leading-normal text-black'>{date}</span>
      <p className='text-[14px] font-normal leading-normal text-black'>{description}</p>
    </div>
  )
}