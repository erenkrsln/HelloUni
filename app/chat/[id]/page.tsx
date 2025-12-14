"use client";

import { use, useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Trash2 } from "lucide-react";
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
    const deleteConversation = useMutation(api.mutations.deleteConversation);

    // We need members to show names/avatars for each message
    const members = useQuery(api.queries.getConversationMembers, { conversationId });

    // We get conversation details (name, image) from the list query
    const allConversations = useQuery(api.queries.getConversations, currentUser ? { userId: currentUser._id } : "skip");
    const conversation = allConversations?.find(c => c._id === conversationId);

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

    // Helper to get member details
    const getMember = (userId: string) => members?.find(m => m._id === userId);

    const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const generateUploadUrl = useMutation(api.mutations.generateUploadUrl);
    const updateGroupImage = useMutation(api.mutations.updateGroupImage);

    const memberColors = [
        '#e99f7aff',
        '#e5ba6fff',
        '#9a8884ff',
        '#aabbbbff',
        '#758d8cff',
        '#a395aeff',
    ];

    const getMemberColor = (userId: string) => {
        // Simple hash to pick a stable color for a user
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            hash = userId.charCodeAt(i) + ((hash << 5) - hash);
        }
        return memberColors[Math.abs(hash) % memberColors.length];
    };

    if (!currentUser) return null;

    const handleHeaderClick = () => {
        if (conversation?.isGroup) {
            setIsMembersModalOpen(true);
        } else if (conversation && members) {
            const partner = members.find(m => m._id !== currentUser._id);
            if (partner?.username) {
                router.push(`/profile/${partner.username}`);
            }
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !conversation || !conversation.isGroup) return;

        try {
            // 1. Get Upload URL
            const postUrl = await generateUploadUrl();

            // 2. Upload File
            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            });
            const { storageId } = await result.json();

            // 3. Update Conversation Image
            await updateGroupImage({ conversationId, imageId: storageId });
        } catch (error) {
            console.error("Failed to upload group image:", error);
        }
    };

    const handleDeleteGroup = async () => {
        if (!conversationId) return;

        try {
            await deleteConversation({ conversationId });
            router.push("/chat");
        } catch (error) {
            console.error("Failed to delete group:", error);
        }
    };

    return (
        <main className="flex flex-col h-screen w-full max-w-[428px] mx-auto bg-white relative">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
                accept="image/*"
            />
            {/* Header */}
            <div className="flex items-center px-4 py-3 border-b bg-white z-10 sticky top-0">
                <button
                    onClick={() => router.back()}
                    className="mr-3 p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>

                {conversation ? (
                    <div className="flex items-center">
                        <div
                            className={`w-8 h-8 rounded-full overflow-hidden mr-3 ${conversation.isGroup ? "cursor-pointer hover:opacity-80" : ""}`}
                            style={{ backgroundColor: "rgba(0, 0, 0, 0.2)" }}
                            onClick={() => conversation.isGroup && fileInputRef.current?.click()}
                        >
                            {conversation.displayImage ? (
                                <img src={conversation.displayImage} alt={conversation.displayName} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-sm" style={{ color: "#000000" }}>
                                    {conversation.displayName?.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <span
                            className="font-semibold cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={handleHeaderClick}
                        >
                            {conversation.displayName}
                        </span>
                    </div>
                ) : (
                    <div className="h-8 flex items-center">
                        <span className="font-semibold text-gray-400">Lade...</span>
                    </div>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#FDFBF7]">
                {!messages ? (
                    <div className="text-center text-gray-400 mt-10">Lade Nachrichten...</div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-gray-400 mt-10 text-sm">
                        Noch keine Nachrichten im Chat. Schreibe deine erste Nachricht! (hier icebreaker frage?)
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isMe = msg.senderId === currentUser._id;
                        const sender = getMember(msg.senderId);
                        const bubbleColor = isMe ? '#F4F4F5' : (conversation?.isGroup ? getMemberColor(msg.senderId) : '#FFFFFF');

                        // Check next message for grouping
                        const nextMsg = messages[index + 1];
                        const isNextSameSender = nextMsg && nextMsg.senderId === msg.senderId;

                        // Check previous message for grouping (to hide name if repeated)
                        const prevMsg = messages[index - 1];
                        const isPrevSameSender = prevMsg && prevMsg.senderId === msg.senderId;

                        return (
                            <div
                                key={msg._id}
                                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${isNextSameSender ? 'mb-0.5' : 'mb-4'}`}
                            >
                                {/* Name only for first message in group */}
                                {conversation?.isGroup && !isMe && sender && !isPrevSameSender && (
                                    <span className="text-[10px] text-gray-500 ml-12 mb-1">
                                        {sender.name}
                                    </span>
                                )}
                                <div className={`flex items-end gap-2 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                    {/* Avatar for others - Only show on LAST message of group or if single */}
                                    {conversation?.isGroup && !isMe && (
                                        <div className="w-8 h-8 flex-shrink-0 mb-1">
                                            {!isNextSameSender ? (
                                                <div className="w-full h-full rounded-full overflow-hidden" style={{ backgroundColor: "rgba(0, 0, 0, 0.2)" }}>
                                                    {sender?.image ? (
                                                        <img src={sender.image} alt={sender.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xs font-bold" style={{ color: "#000000" }}>
                                                            {sender?.name?.charAt(0).toUpperCase() || "?"}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : null}
                                        </div>
                                    )}

                                    <div
                                        className={`
                                            px-4 py-2 text-sm
                                            ${isMe
                                                ? (conversation?.isGroup
                                                    ? 'bg-white border border-[#efeadd] text-gray-900 rounded-2xl'
                                                    : 'bg-[#dcc6a1] text-black rounded-2xl')
                                                : `text-black rounded-2xl shadow-sm ${!conversation?.isGroup ? 'bg-white border border-[#efeadd]' : ''}`
                                            }
                                            ${!isNextSameSender
                                                ? (isMe ? 'rounded-br-none' : 'rounded-bl-none')
                                                : '' // Normal rounded corners if followed by same sender
                                            }
                                        `}
                                        style={(!isMe && conversation?.isGroup) ? { backgroundColor: bubbleColor } : {}}
                                    >
                                        {msg.content}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Members Modal */}
            {isMembersModalOpen && members && (
                <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setIsMembersModalOpen(false)}>
                    <div className="bg-white w-full max-w-[428px] rounded-t-2xl sm:rounded-2xl mx-auto overflow-hidden animate-in slide-in-from-bottom-5" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="font-bold text-lg">Gruppenmitglieder</h3>
                            <button onClick={() => setIsMembersModalOpen(false)} className="text-gray-500">Schließen</button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto p-2">
                            {members.map(member => (
                                <div
                                    key={member._id}
                                    className="flex items-center p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
                                    onClick={() => {
                                        if (member.username) {
                                            router.push(`/profile/${member.username}`);
                                        }
                                    }}
                                >
                                    <div className="w-10 h-10 rounded-full overflow-hidden mr-3" style={{ backgroundColor: "rgba(0, 0, 0, 0.2)" }}>
                                        {member.image ? (
                                            <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center font-bold" style={{ color: "#000000" }}>
                                                {member.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-semibold">{member.name}</div>
                                        <div className="text-xs text-gray-500">@{member.username}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t safe-area-bottom">
                            <button
                                onClick={handleDeleteGroup}
                                className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-semibold flex items-center justify-center active:bg-red-100 transition-colors"
                            >
                                <Trash2 size={20} className="mr-2" />
                                Gruppe löschen
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Input */}
            <div className="p-3 bg-white border-t border-[#f0e6d2] safe-area-bottom">
                <form
                    onSubmit={handleSend}
                    className="flex items-center bg-[#FDFBF7] border border-[#efeadd] rounded-full px-4 py-2"
                >
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Schreibe eine Nachricht..."
                        className="flex-1 bg-transparent outline-none min-w-0 text-black placeholder:text-gray-400"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className={`ml-2 p-2 rounded-full transition-colors ${newMessage.trim()
                            ? 'text-[#8C531E] hover:bg-[#f6efe4] active:bg-[#ede4d3]'
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
