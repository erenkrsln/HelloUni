"use client";

import { use, useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Paperclip, Search, X, Folder, FileText } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { GroupInfoModal } from "@/components/group-info-modal";
import { ChatFilesModal } from "@/components/chat-files-modal";

export default function ChatDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const conversationId = id as Id<"conversations">;

    const router = useRouter();
    const { currentUser } = useCurrentUser();
    const [newMessage, setNewMessage] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const isInitialLoad = useRef(true);

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
    }, [conversationId, currentUser, messages, markAsRead]);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            const newHeight = Math.min(textarea.scrollHeight, 120);
            textarea.style.height = `${newHeight}px`;
        }
    }, [newMessage]);

    const generateUploadUrl = useMutation(api.mutations.generateUploadUrl);
    const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser) return;

        try {
            const postUrl = await generateUploadUrl();

            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            });
            const { storageId } = await result.json();

            await sendMessage({
                conversationId,
                senderId: currentUser._id,
                content: file.name,
                type: file.type.startsWith("image/") ? "image" : "pdf",
                storageId,
                fileName: file.name,
                contentType: file.type,
            });
        } catch (error) {
            console.error("Failed to upload file:", error);
            alert("Fehler beim Hochladen der Datei.");
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const members = useQuery(api.queries.getConversationMembers, { conversationId });

    const allConversations = useQuery(api.queries.getConversations, currentUser ? { userId: currentUser._id } : "skip");
    const conversation = allConversations?.find(c => c._id === conversationId);

    const isGroupAdmin = conversation?.isGroup && currentUser && (
        conversation.creatorId === currentUser._id ||
        conversation.adminIds?.includes(currentUser._id)
    );

    const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    useEffect(() => {
        if (messages) {
            if (isInitialLoad.current) {
                scrollToBottom("auto");
                isInitialLoad.current = false;
            } else {
                scrollToBottom("smooth");
            }
        }
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

    const getMember = (userId: string) => members?.find(m => m._id === userId);

    const linkifyText = (text: string) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = text.split(urlRegex);

        return parts.map((part, index) => {
            if (part.match(urlRegex)) {
                return (
                    <a
                        key={index}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#8C531E] underline break-all"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {part}
                    </a>
                );
            }
            return part;
        });
    };

    const [isGroupInfoModalOpen, setIsGroupInfoModalOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);


    if (!currentUser) return null;

    const isLeft = (conversation as any)?.membership === "left";

    const handleHeaderClick = () => {
        if (isLeft) return;

        if (conversation?.isGroup) {
            setIsGroupInfoModalOpen(true);
        } else if (conversation && members) {
            const partner = members.find(m => m._id !== currentUser._id);
            if (partner?.username) {
                router.push(`/profile/${partner.username}`);
            }
        }
    };

    if (!currentUser) return null;

    return (
        <main className="flex flex-col h-screen w-full max-w-[428px] mx-auto bg-white relative">

            {/* Header */}
            <div
                className="flex items-center justify-between px-4 py-3 bg-white z-10 sticky top-0"
                style={{
                    paddingTop: `calc(0.75rem + env(safe-area-inset-top, 0px))`,
                    top: 0
                }}
            >
                {/* Left side */}
                <div className="flex items-center flex-1">
                    <button
                        onClick={() => router.back()}
                        className="mr-3 p-2 -ml-2 rounded-full"
                    >
                        <ArrowLeft size={24} />
                    </button>

                    {conversation ? (
                        <div className="flex items-center min-w-0">
                            <div
                                className={`w-8 h-8 rounded-full overflow-hidden mr-3 flex-shrink-0 ${conversation.isGroup && !isLeft ? "cursor-pointer hover:opacity-80" : ""}`}
                                style={{ backgroundColor: "rgba(0, 0, 0, 0.2)" }}
                                onClick={() => conversation.isGroup && !isLeft && setIsGroupInfoModalOpen(true)}
                            >
                                {conversation.displayImage ? (
                                    <img src={conversation.displayImage} alt={conversation.displayName} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center font-bold text-sm text-black">
                                        {conversation.displayName?.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>

                            <span
                                className={`font-semibold truncate transition-opacity ${!isLeft ? "cursor-pointer hover:opacity-80" : ""}`}
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

                {/* Right side */}
                {conversation && (
                    <button
                        className="p-2 text-[#D08945]"
                        onClick={() => setIsFilesModalOpen(true)}
                        title="Geteilte Dateien"
                    >
                        <Folder size={20} />
                    </button>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 pb-0 bg-[#FDFBF7]">
                {!messages ? (
                    <div className="text-center text-[#8C531E] mt-10">Lade Nachrichten...</div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-[#D08945] mt-10 text-sm">
                        Noch keine Nachrichten im Chat. <br /> Schreibe deine erste Nachricht!
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isMe = msg.senderId === currentUser._id;
                        const sender = getMember(msg.senderId);

                        const nextMsg = messages[index + 1];
                        const isNextSameSender = nextMsg && nextMsg.senderId === msg.senderId && nextMsg.type !== "system";

                        const prevMsg = messages[index - 1];
                        const isPrevSameSender = prevMsg && prevMsg.senderId === msg.senderId && prevMsg.type !== "system";

                        // System messages
                        if (msg.type === "system") {
                            return (
                                <div key={msg._id} className="flex justify-center my-4">
                                    <span className="flex items-center text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full shadow-sm text-center">
                                        {(() => {
                                            let content = msg.content;
                                            if (currentUser) {

                                                const leftMatch = content.match(/(.*) hat die Gruppe verlassen/);
                                                if (leftMatch) {
                                                    const [_, userName] = leftMatch;
                                                    if (userName === currentUser.name) {
                                                        return "Du hast die Gruppe verlassen";
                                                    }
                                                    return content;
                                                }

                                                const removedMatch = content.match(/(.*) hat (.*) entfernt/);
                                                if (removedMatch) {
                                                    const [_, adminName, removedName] = removedMatch;
                                                    if (removedName === currentUser.name && adminName === currentUser.name) {
                                                        return "Du hast dich entfernt";
                                                    }
                                                    if (removedName === currentUser.name) {
                                                        return `${adminName} hat dich entfernt`;
                                                    }
                                                    if (adminName === currentUser.name) {
                                                        return `Du hast ${removedName} entfernt`;
                                                    }
                                                    return content;
                                                }

                                                const addedMatch = content.match(/(.*) hat (.*) hinzugefügt/);
                                                if (addedMatch) {
                                                    const [_, adminName, addedName] = addedMatch;
                                                    if (addedName === currentUser.name && adminName === currentUser.name) {
                                                        return "Du hast dich hinzugefügt";
                                                    }
                                                    if (addedName === currentUser.name) {
                                                        return `${adminName} hat dich hinzugefügt`;
                                                    }
                                                    if (adminName === currentUser.name) {
                                                        return `Du hast ${addedName} hinzugefügt`;
                                                    }
                                                    return content;
                                                }

                                                const transferMatch = content.match(/(.*) hat die Gruppenleitung an (.*) übertragen/);
                                                if (transferMatch) {
                                                    const [_, oldCreator, newCreator] = transferMatch;
                                                    if (oldCreator === currentUser.name && newCreator === currentUser.name) {
                                                        return "Du hast die Gruppenleitung an dich übertragen";
                                                    }
                                                    if (oldCreator === currentUser.name) {
                                                        return `Du hast die Gruppenleitung an ${newCreator} übertragen`;
                                                    }
                                                    if (newCreator === currentUser.name) {
                                                        return `${oldCreator} hat die Gruppenleitung an dich übertragen`;
                                                    }
                                                    return content;
                                                }

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

                                                const nameChangeMatch = content.match(/(.*) hat den Gruppennamen von "(.*)" zu "(.*)" geändert/);
                                                if (nameChangeMatch) {
                                                    const [_, userName, oldName, newName] = nameChangeMatch;
                                                    if (userName === currentUser.name) {
                                                        return `Du hast den Gruppennamen von "${oldName}" zu "${newName}" geändert`;
                                                    }
                                                    return content;
                                                }

                                                const imageChangeMatch = content.match(/(.*) hat das Gruppenbild geändert/);
                                                if (imageChangeMatch) {
                                                    const [_, userName] = imageChangeMatch;
                                                    if (userName === currentUser.name) {
                                                        return "Du hast das Gruppenbild geändert";
                                                    }
                                                    return content;
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
                                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${isNextSameSender ? 'mb-0.5' : 'mb-1.5'}`}
                            >

                                {conversation?.isGroup && !isMe && sender && !isPrevSameSender && (
                                    <span className="text-[10px] text-[#8C531E] ml-12 mb-1">
                                        {sender.name}
                                    </span>
                                )}
                                <div className={`flex items-end gap-2 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>

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
                                            ${msg.type === "image" ? 'p-1' : 'px-4 py-2'} text-sm
                                            ${isMe
                                                ? 'bg-[#dbc6a0] bg-opacity-75 text-black rounded-2xl shadow-sm'
                                                : 'text-black rounded-2xl bg-white shadow-sm'
                                            }
                                            ${!isNextSameSender
                                                ? (isMe ? 'rounded-br-none' : 'rounded-bl-none')
                                                : ''
                                            }
                                        `}
                                        style={{
                                            wordBreak: 'break-word',
                                            overflowWrap: 'break-word',
                                            whiteSpace: 'pre-wrap'
                                        }}
                                    >
                                        {msg.type === "image" && (msg as any).url ? (
                                            <div className="max-w-[240px] max-h-[320px] overflow-hidden rounded-[14px]">
                                                <img
                                                    src={(msg as any).url}
                                                    alt="Bild"
                                                    className="w-full h-full object-cover cursor-pointer"
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
                                                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-[#D08945]">
                                                    <FileText size={34} />
                                                </div>
                                                <span className="truncate max-w-[150px]">{(msg as any).fileName || "Dokument"}</span>
                                            </a>
                                        ) : (
                                            linkifyText(msg.content)
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Group Info Modal */}
            {isGroupInfoModalOpen && currentUser && (
                <GroupInfoModal
                    isOpen={isGroupInfoModalOpen}
                    onClose={() => setIsGroupInfoModalOpen(false)}
                    conversationId={conversationId}
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
                    className="p-3 bg-[#FDFBF7]"
                    style={{
                        paddingBottom: `calc(0.75rem + env(safe-area-inset-bottom, 0px))`
                    }}
                >
                    <form
                        onSubmit={handleSend}
                        className="flex items-end bg-white border border-gray-300 rounded-full px-4 py-2 gap-3 transition-all duration-200 focus-within:outline-none focus-within:ring-2 focus-within:ring-[#D08945]"
                    >
                        <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                        />

                        <textarea
                            ref={textareaRef}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    const isMobile = window.matchMedia("(pointer: coarse)").matches;
                                    if (!isMobile) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }
                            }}
                            placeholder="Schreibe eine Nachricht..."
                            className="flex-1 bg-transparent outline-none min-w-0 text-black placeholder-gray-400 resize-none py-1 max-h-[120px] overflow-y-auto scrollbar-hide"
                            rows={1}
                            style={{ minHeight: '24px' }}
                        />

                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 rounded-full transition-all flex-shrink-0 text-[#D08945]"
                        >
                            <Paperclip size={20} />
                        </button>

                        <button
                            type="submit"
                            disabled={!newMessage.trim()}
                            className={`p-2 rounded-full transition-all flex-shrink-0 ${newMessage.trim()
                                ? 'text-[#D08945]'
                                : 'text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            <Send size={20} />
                        </button>
                    </form>
                </div>
            ) : (
                <div
                    className="p-4 bg-gray-100 text-center text-gray-700 text-sm"
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
                    className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-2"
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
                        className="max-w-full max-h-[90vh] object-contain"
                    />
                </div>
            )}
        </main>
    );
}
