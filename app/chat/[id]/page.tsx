"use client";

import { use, useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

export default function ChatDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const conversationId = id as Id<"conversations">;

    const router = useRouter();
    const { currentUser } = useCurrentUser();
    const [newMessage, setNewMessage] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const messages = useQuery(api.queries.getMessages, { conversationId });
    const sendMessage = useMutation(api.mutations.sendMessage);

    // We need to fetch the partner name/image. 
    // Ideally, we'd have a specific query for "getConversationDetails", but we can reuse getConversations for now
    // or fetch it client side if we had the partner ID. 
    // Let's rely on getConversations and find the current one to get the partner.
    const allConversations = useQuery(api.queries.getConversations, currentUser ? { userId: currentUser._id } : "skip");
    const conversation = allConversations?.find(c => c._id === conversationId);
    const partner = conversation?.partner;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim() || !currentUser) return;

        try {
            await sendMessage({
                conversationId,
                senderId: currentUser._id,
                content: newMessage.trim(),
            });
            setNewMessage("");
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    };

    if (!currentUser) return null;

    return (
        <main className="flex flex-col h-screen w-full max-w-[428px] mx-auto bg-white">
            {/* Header */}
            <div className="flex items-center px-4 py-3 border-b bg-white z-10 sticky top-0">
                <button
                    onClick={() => router.back()}
                    className="mr-3 p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>

                {partner ? (
                    <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden mr-3">
                            {partner.image ? (
                                <img src={partner.image} alt={partner.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-sm">
                                    {partner.name?.charAt(0)}
                                </div>
                            )}
                        </div>
                        <span className="font-semibold">{partner.name}</span>
                    </div>
                ) : (
                    <div className="h-8 flex items-center">
                        <span className="font-semibold text-gray-400">Loading...</span>
                    </div>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {!messages ? (
                    <div className="text-center text-gray-400 mt-10">Loading messages...</div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-gray-400 mt-10 text-sm">
                        No messages yet. Say hello!
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.senderId === currentUser._id;
                        return (
                            <div
                                key={msg._id}
                                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`
                    max-w-[75%] px-4 py-2 rounded-2xl text-sm
                    ${isMe
                                            ? 'bg-blue-500 text-white rounded-br-none'
                                            : 'bg-white text-gray-900 border border-gray-100 rounded-bl-none shadow-sm'
                                        }
                  `}
                                >
                                    {msg.content}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-white border-t safe-area-bottom">
                <form
                    onSubmit={handleSend}
                    className="flex items-center bg-gray-100 rounded-full px-4 py-2"
                >
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-transparent outline-none min-w-0"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className={`ml-2 p-2 rounded-full transition-colors ${newMessage.trim()
                                ? 'text-blue-500 hover:bg-blue-50 active:bg-blue-100'
                                : 'text-gray-300'
                            }`}
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </main>
    );
}
