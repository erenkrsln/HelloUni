interface MensaMealCardProps {
  name: string
  price: string
  index: number
}

export default function MensaMealCard({ name, price, index }: MensaMealCardProps) {
  return (
    <div className='w-full flex items-start justify-between gap-[22px] p-[22px] bg-black bg-opacity-[0.11] rounded-[8px] border-[2px] border-black border-opacity-20'>
      <div className='flex flex-col justify-center items-start gap-[8px] flex-1'>
        <span className='text-[11px] font-bold leading-normal text-black opacity-[0.65]'>
          Essen {index}
        </span>
        <p className='text-[14px] font-normal leading-normal text-black'>
          {name}
        </p>
      </div>
      <span className='text-[14px] font-bold leading-normal text-black'>
        {price}
      </span>
    </div>
  )
}
