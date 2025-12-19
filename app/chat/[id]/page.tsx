"use client";

import { use, useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Trash2 } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { EditGroupImageModal } from "@/components/edit-group-image-modal";
import { GroupMembersModal } from "@/components/group-members-modal";

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
    const markAsRead = useMutation(api.mutations.markAsRead);

    useEffect(() => {
        if (conversationId && currentUser) {
            markAsRead({ conversationId, userId: currentUser._id });
        }
    }, [conversationId, currentUser, messages, markAsRead]); // Mark as read when messages update too

    // We need members to show names/avatars for each message
    const members = useQuery(api.queries.getConversationMembers, { conversationId });

    // We get conversation details (name, image) from the list query
    const allConversations = useQuery(api.queries.getConversations, currentUser ? { userId: currentUser._id } : "skip");
    const conversation = allConversations?.find(c => c._id === conversationId);

    const isGroupAdmin = conversation?.isGroup && currentUser && (
        conversation.creatorId === currentUser._id ||
        conversation.adminIds?.includes(currentUser._id)
    );

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
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);

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

    const handleDeleteGroup = async () => {
        if (!conversationId) return;

        try {
            await deleteConversation({ conversationId });
            router.push("/chat");
        } catch (error) {
            console.error("Failed to delete group:", error);
        }
    };

    if (!currentUser) return null;

    return (
        <main className="flex flex-col h-screen w-full max-w-[428px] mx-auto bg-white relative">

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
                            className={`w-8 h-8 rounded-full overflow-hidden mr-3 ${conversation.isGroup && isGroupAdmin ? "cursor-pointer hover:opacity-80" : ""}`}
                            style={{ backgroundColor: "rgba(0, 0, 0, 0.2)" }}
                            onClick={() => conversation.isGroup && isGroupAdmin && setIsImageModalOpen(true)}
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


                        // Check next message for grouping
                        const nextMsg = messages[index + 1];
                        const isNextSameSender = nextMsg && nextMsg.senderId === msg.senderId && nextMsg.type !== "system";

                        // Check previous message for grouping (to hide name if repeated)
                        const prevMsg = messages[index - 1];
                        const isPrevSameSender = prevMsg && prevMsg.senderId === msg.senderId && prevMsg.type !== "system";

                        if (msg.type === "system") {
                            return (
                                <div key={msg._id} className="flex justify-center my-4">
                                    <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                        {msg.content}
                                    </span>
                                </div>
                            );
                        }

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
                                                ? 'bg-[#dcc6a1] text-black rounded-2xl'
                                                : 'text-black rounded-2xl shadow-sm bg-white border border-[#efeadd]'
                                            }
                                            ${!isNextSameSender
                                                ? (isMe ? 'rounded-br-none' : 'rounded-bl-none')
                                                : '' // Normal rounded corners if followed by same sender
                                            }
                                        `}
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
            {isMembersModalOpen && currentUser && (
                <GroupMembersModal
                    isOpen={isMembersModalOpen}
                    onClose={() => setIsMembersModalOpen(false)}
                    conversationId={conversationId}
                    currentUserId={currentUser._id}
                />
            )}

            {/* Edit Group Image Modal */}
            {conversation && (
                <EditGroupImageModal
                    isOpen={isImageModalOpen}
                    onClose={() => setIsImageModalOpen(false)}
                    conversationId={conversationId}
                    groupName={conversation.displayName || "Gruppe"}
                    currentImage={conversation.displayImage || undefined}
                    currentUserId={currentUser._id}
                />
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
