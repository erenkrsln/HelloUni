'use client'
import AIChatModalMessage from './AIChatModalMessage'

interface AIChatModalMessageGroupProps {
  messages: Array<{ text: string; timestamp: Date }>
  isUser: boolean
}

const AIChatModalMessageGroup = ({ messages, isUser }: AIChatModalMessageGroupProps) => {
  return (
    <div className={`flex w-full flex-col gap-[5px] ${isUser ? 'items-end' : 'items-start'}`}>
      {messages.map((msg, index) => (
        <AIChatModalMessage key={index} message={msg.text} isUser={isUser} timestamp={msg.timestamp} />
      ))}
    </div>
  )
}

export default AIChatModalMessageGroup