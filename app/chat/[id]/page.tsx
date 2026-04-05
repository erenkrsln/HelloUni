"use client";

import { use, useState, useEffect, useRef, Fragment } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Paperclip, X, Folder, FileText, SmilePlus, BarChart2, File } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { GroupInfoModal } from "@/components/group-info-modal";
import { ChatFilesModal } from "@/components/chat-files-modal";
import { ChatPollModal } from "@/components/chat-poll-modal";
import { ChatPollMessage } from "@/components/chat-poll-message";

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
    const toggleMessageReaction = useMutation(api.mutations.toggleMessageReaction);

    const EMOJIS = ["👍", "❤️", "😹", "🙀", "😿", "🙏", "🦫"];

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

    const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);
    const [isPollModalOpen, setIsPollModalOpen] = useState(false);
    const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser) return;

        try {
            const { uploadUrl, publicUrl } = await fetch("/api/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    filename: file.name,
                    contentType: file.type,
                    fileSize: file.size,
                }),
            }).then(r => r.json());

            await fetch(uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": file.type },
                body: file,
            });

            await sendMessage({
                conversationId,
                senderId: currentUser._id,
                content: file.name,
                type: file.type.startsWith("image/") ? "image" : "pdf",
                storageId: publicUrl,
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

                        const currentMessageDate = new Date(msg._creationTime);
                        const prevMessageDate = prevMsg ? new Date(prevMsg._creationTime) : null;
                        const isNewDay = !prevMessageDate || currentMessageDate.toDateString() !== prevMessageDate.toDateString();

                        const reactionCounts = (msg as any).reactions?.reduce((acc: any, curr: any) => {
                            if (!acc[curr.emoji]) acc[curr.emoji] = { count: 0, hasReacted: false };
                            acc[curr.emoji].count++;
                            if (curr.userId === currentUser._id) acc[curr.emoji].hasReacted = true;
                            return acc;
                        }, {} as Record<string, { count: number, hasReacted: boolean }>) || {};
                        const hasReactions = Object.keys(reactionCounts).length > 0;

                        let dateDivider = null;
                        if (isNewDay) {
                            const today = new Date();
                            const yesterday = new Date();
                            yesterday.setDate(today.getDate() - 1);

                            let dateString = "";
                            if (currentMessageDate.toDateString() === today.toDateString()) {
                                dateString = "Heute";
                            } else if (currentMessageDate.toDateString() === yesterday.toDateString()) {
                                dateString = "Gestern";
                            } else {
                                dateString = currentMessageDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
                            }

                            dateDivider = (
                                <div className="flex justify-center my-4 w-full">
                                    <span className="text-[11px] bg-[#f2ebd9] text-[#8C531E] px-3 py-1 rounded-lg opacity-90 font-medium shadow-sm">
                                        {dateString}
                                    </span>
                                </div>
                            );
                        }

                        // System messages
                        if (msg.type === "system") {
                            return (
                                <Fragment key={msg._id}>
                                    {dateDivider}
                                    <div className="flex justify-center my-4">
                                        <span className="flex items-center text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-lg shadow-sm text-center">
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
                                </Fragment>
                            );
                        }

                        return (
                            <Fragment key={msg._id}>
                                {dateDivider}
                                <div
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

                                        <div className={`flex flex-col relative group max-w-full ${isMe ? 'items-end' : 'items-start'}`}>
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
                                                relative w-fit max-w-full
                                            `}
                                                style={{
                                                    wordBreak: 'break-word',
                                                    overflowWrap: 'break-word',
                                                    whiteSpace: 'pre-wrap'
                                                }}
                                            >
                                                <div className="flex flex-col">
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
                                                    ) : msg.type === "poll" && (msg as any).chatPollId ? (
                                                        <ChatPollMessage
                                                            chatPollId={(msg as any).chatPollId as Id<"chatPolls">}
                                                            currentUserId={currentUser._id}
                                                            isMe={isMe}
                                                        />
                                                    ) : (
                                                        <div>
                                                            {linkifyText(msg.content)}
                                                        </div>
                                                    )}
                                                    <div className="flex items-center justify-end mt-1 gap-1.5 opacity-70">
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <button className="flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity">
                                                                    <SmilePlus size={12} className="text-black" />
                                                                </button>
                                                            </PopoverTrigger>
                                                            <PopoverContent side="top" align={isMe ? 'end' : 'start'} className="w-auto p-1.5 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.1),0_10px_20px_-2px_rgba(0,0,0,0.04)] rounded-full bg-white border border-gray-100 z-[60]">
                                                                <div className="flex gap-1">
                                                                    {EMOJIS.map(emoji => (
                                                                        <button
                                                                            key={emoji}
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                toggleMessageReaction({ messageId: msg._id, userId: currentUser._id, emoji });
                                                                            }}
                                                                            className="hover:scale-125 transition-transform text-lg flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100"
                                                                        >
                                                                            {emoji}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>
                                                        <span className="text-[10px]">
                                                            {new Date(msg._creationTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {hasReactions && (
                                        <div className={`flex flex-wrap gap-1 mt-1.5 z-10 relative ${isMe ? 'mr-0' : (conversation?.isGroup ? 'ml-10' : 'ml-0')}`}>
                                            {Object.entries(reactionCounts).map(([emoji, data]: [string, any]) => (
                                                <button
                                                    key={emoji}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        toggleMessageReaction({ messageId: msg._id, userId: currentUser._id, emoji });
                                                    }}
                                                    className={`flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full border ${data.hasReacted ? 'bg-[#f78d57]/20 border-[#f78d57]/30 text-[#8C531E]' : 'bg-white border-gray-200 text-gray-500'}`}
                                                >
                                                    <span>{emoji}</span>
                                                    <span className="font-medium text-[10px]">{data.count}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </Fragment>
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

            {/* Chat Poll Modal */}
            {currentUser && (
                <ChatPollModal
                    isOpen={isPollModalOpen}
                    onClose={() => setIsPollModalOpen(false)}
                    conversationId={conversationId}
                    senderId={currentUser._id}
                />
            )}

            {/* Input */}
            {!isLeft ? (
                <div
                    className="bg-[#FDFBF7]"
                    style={{ paddingBottom: `calc(0.75rem + env(safe-area-inset-bottom, 0px))` }}
                >
                    {/* Attachment tray — above the input bar */}
                    {isAttachMenuOpen && (
                        <>
                            {/* Invisible backdrop */}
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setIsAttachMenuOpen(false)}
                            />
                            <div className="relative z-20 flex gap-3 px-4 pt-3 pb-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAttachMenuOpen(false);
                                        fileInputRef.current?.click();
                                    }}
                                    className="flex flex-col items-center gap-1.5"
                                >
                                    <div className="w-12 h-12 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center">
                                        <File size={20} className="text-[#D08945]" />
                                    </div>
                                    <span className="text-[11px] text-gray-600 font-medium">Datei</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAttachMenuOpen(false);
                                        setIsPollModalOpen(true);
                                    }}
                                    className="flex flex-col items-center gap-1.5"
                                >
                                    <div className="w-12 h-12 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center">
                                        <BarChart2 size={20} className="text-[#D08945]" />
                                    </div>
                                    <span className="text-[11px] text-gray-600 font-medium">Umfrage</span>
                                </button>
                            </div>
                        </>
                    )}

                    <div className="p-3 pt-2">
                        <form
                            onSubmit={handleSend}
                            className="flex items-end bg-white border border-gray-300 rounded-3xl px-4 py-2 gap-3 transition-all duration-200 focus-within:outline-none focus-within:ring-2 focus-within:ring-[#D08945]"
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
                                onClick={() => setIsAttachMenuOpen(!isAttachMenuOpen)}
                                className={`p-2 rounded-full transition-all flex-shrink-0 ${isAttachMenuOpen ? 'text-[#8C531E]' : 'text-[#D08945]'}`}
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
