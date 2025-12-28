"use client";

import { use, useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Trash2, FolderOpen, Paperclip, FileIcon, X } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { EditGroupImageModal } from "@/components/edit-group-image-modal";
import { GroupMembersModal } from "@/components/group-members-modal";
import { ChatFilesModal } from "@/components/chat-files-modal";

export default function ChatDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const conversationId = id as Id<"conversations">;

    const router = useRouter();
    const { currentUser } = useCurrentUser();
    const [newMessage, setNewMessage] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const messages = useQuery(api.queries.getMessages, {
        conversationId,
        activeUserId: currentUser?._id
    });
    const sendMessage = useMutation(api.mutations.sendMessage);
    const deleteConversation = useMutation(api.mutations.deleteConversation);
    const markAsRead = useMutation(api.mutations.markAsRead);

    useEffect(() => {
        if (conversationId && currentUser) {
            markAsRead({ conversationId, userId: currentUser._id });
        }
    }, [conversationId, currentUser, messages, markAsRead]); // Mark as read when messages update too

    const generateUploadUrl = useMutation(api.mutations.generateUploadUrl);
    const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser) return;

        try {
            // Get upload URL
            const postUrl = await generateUploadUrl();

            // Upload file
            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            });
            const { storageId } = await result.json();

            // Send message
            await sendMessage({
                conversationId,
                senderId: currentUser._id,
                content: file.name, // Display filename as content fallback
                type: file.type.startsWith("image/") ? "image" : "pdf",
                storageId,
                fileName: file.name,
                contentType: file.type,
            });
        } catch (error) {
            console.error("Failed to upload file:", error);
            alert("Fehler beim Hochladen der Datei.");
        } finally {
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

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
    const [selectedImage, setSelectedImage] = useState<string | null>(null);


    if (!currentUser) return null;

    const isLeft = (conversation as any)?.membership === "left";

    const handleHeaderClick = () => {
        if (isLeft) return;

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
            <div
                className="flex items-center px-4 py-3 border-b bg-white z-10 sticky top-0"
                style={{
                    paddingTop: `calc(0.75rem + env(safe-area-inset-top, 0px))`,
                    top: 0
                }}
            >
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

                        <button
                            className="ml-auto p-2 text-gray-400 hover:text-[#8C531E] hover:bg-[#f6efe4] rounded-full transition-colors"
                            onClick={() => setIsFilesModalOpen(true)}
                            title="Geteilte Dateien"
                        >
                            <FolderOpen size={20} />
                        </button>
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
                                        {(() => {
                                            let content = msg.content;
                                            if (currentUser) {
                                                // Personalize "promoted to admin" message
                                                const promotedMatch = content.match(/(.*) hat (.*) zum Admin ernannt/);
                                                if (promotedMatch) {
                                                    const [_, adminName, targetName] = promotedMatch;
                                                    if (targetName === currentUser.name) {
                                                        return `${adminName === currentUser.name ? "Du hast dich" : adminName + " hat dich"} zum Admin ernannt`;
                                                    }
                                                    if (adminName === currentUser.name) {
                                                        return `Du hast ${targetName} zum Admin ernannt`;
                                                    }
                                                }

                                                // Personalize "demoted from admin" message
                                                const demotedMatch = content.match(/(.*) hat (.*) Admin-Rechte entzogen/);
                                                if (demotedMatch) {
                                                    const [_, adminName, targetName] = demotedMatch;
                                                    if (targetName === currentUser.name) {
                                                        return `${adminName === currentUser.name ? "Du hast dir" : adminName + " hat dir"} Admin-Rechte entzogen`;
                                                    }
                                                    if (adminName === currentUser.name) {
                                                        return `Du hast ${targetName} Admin-Rechte entzogen`;
                                                    }
                                                }
                                            }
                                            return content;
                                        })()}
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
                                        {msg.type === "image" && (msg as any).url ? (
                                            <div className="max-w-[200px] max-h-[200px] overflow-hidden rounded-lg">
                                                <img
                                                    src={(msg as any).url}
                                                    alt="Bild"
                                                    className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                                    onClick={() => setSelectedImage((msg as any).url)}
                                                />
                                            </div>
                                        ) : msg.type === "pdf" ? (
                                            <a
                                                href={(msg as any).url || "#"}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
                                                    <FileIcon size={24} />
                                                </div>
                                                <span className="underline truncate max-w-[150px]">{(msg as any).fileName || "Dokument"}</span>
                                            </a>
                                        ) : (
                                            msg.content
                                        )}
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

            {/* Chat Files Modal */}
            {currentUser && (
                <ChatFilesModal
                    isOpen={isFilesModalOpen}
                    onClose={() => setIsFilesModalOpen(false)}
                    conversationId={conversationId}
                    currentUserId={currentUser._id}
                />
            )}

            {/* Input */}
            {!isLeft ? (
                <div
                    className="p-3 bg-white border-t border-[#f0e6d2]"
                    style={{
                        paddingBottom: `calc(0.75rem + env(safe-area-inset-bottom, 0px))`
                    }}
                >
                    <form
                        onSubmit={handleSend}
                        className="flex items-center bg-[#FDFBF7] border border-[#efeadd] rounded-full px-4 py-2"
                    >
                        <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                        />
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Schreibe eine Nachricht..."
                            className="flex-1 bg-transparent outline-none min-w-0 text-black placeholder:text-gray-400"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="mr-2 text-gray-400 hover:text-[#8C531E] transition-colors"
                        >
                            <Paperclip size={20} />
                        </button>
                        <button
                            type="submit"
                            disabled={!newMessage.trim()}
                            className={`p-2 rounded-full transition-colors ${newMessage.trim()
                                ? 'text-[#8C531E] hover:bg-[#f6efe4] active:bg-[#ede4d3]'
                                : 'text-gray-300'
                                }`}
                        >
                            <Send size={20} />
                        </button>
                    </form>
                </div>
            ) : (
                <div
                    className="p-4 bg-gray-50 text-center text-gray-500 text-sm border-t"
                    style={{
                        paddingBottom: `calc(1rem + env(safe-area-inset-bottom, 0px))`
                    }}
                >
                    Du bist kein Mitglied dieser Gruppe mehr.
                </div>
            )}

            {/* Image Preview Overlay */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
                    onClick={() => setSelectedImage(null)}
                >
                    <button
                        className="absolute top-4 right-4 text-white hover:text-gray-300 p-2"
                        onClick={() => setSelectedImage(null)}
                    >
                        <X size={32} />
                    </button>
                    <img
                        src={selectedImage}
                        alt="Vorschau"
                        className="max-w-full max-h-[90vh] object-contain rounded-md"
                    />
                </div>
            )}
        </main>
    );
}
