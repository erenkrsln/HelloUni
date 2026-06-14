"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useCall } from "@/lib/hooks/useCall";
import { Plus, MessageCircle, Search, Trash2, Image, FileIcon, BarChart2, StickyNote, User, CirclePlay, CalendarDays, Phone, Video } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { LoadingScreen } from "@/components/ui/spinner";

function formatLastMessageTime(timestamp?: number) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();

  const isSameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isSameDay) {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  } else {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }
}

export function ChatSidebar() {
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Id<"users">[]>([]);
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "direct" | "group">("all");
  const router = useRouter();
  const pathname = usePathname();

  const { currentUser } = useCurrentUser();
  const [isFirstVisit, setIsFirstVisit] = useState(true);

  useEffect(() => {
    const visited = sessionStorage.getItem("chat_visited");
    if (visited) {
      setIsFirstVisit(false);
    } else {
      const timer = setTimeout(() => {
        sessionStorage.setItem("chat_visited", "true");
        setIsFirstVisit(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, []);

  const conversations = useQuery(api.queries.getConversations, currentUser ? { userId: currentUser._id } : "skip");
  const allUsers = useQuery(api.queries.getAllUsers);

  const { activeCallId, startCall } = useCall();

  const activeGroupCalls = useQuery(
    api.calls.getActiveGroupCallsForUser,
    currentUser ? { userId: currentUser._id } : "skip",
  );

  const activeGroupCallByConversationId = useMemo(() => {
    const m = new Map<
      string,
      { callId: Id<"calls">; type: "voice" | "video" }
    >();
    activeGroupCalls?.forEach((row) => {
      m.set(row.conversationId as string, {
        callId: row.callId as Id<"calls">,
        type: row.type,
      });
    });
    return m;
  }, [activeGroupCalls]);

  const isLoading = isFirstVisit && (currentUser === undefined || conversations === undefined);
  const createConversation = useMutation(api.mutations.createConversation);
  const deleteConversationFromList = useMutation(api.mutations.deleteConversationFromList);

  const toggleUserSelection = (userId: Id<"users">) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleStartChat = async () => {
    if (!currentUser || selectedUsers.length === 0) return;
    if (selectedUsers.length > 1 && !groupName.trim()) return;

    const participants = [currentUser._id, ...selectedUsers];

    try {
      const conversationId = await createConversation({
        participants,
        name: selectedUsers.length > 1 && groupName ? groupName : undefined,
        creatorId: currentUser._id,
      });
      setIsNewChatOpen(false);
      setSelectedUsers([]);
      setGroupName("");
      router.push(`/chat/${conversationId}`);
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  const selectableUsers = allUsers?.filter(u => u._id !== currentUser?._id) || [];

  const filteredConversations = conversations?.filter(conv => {
    const isDirectEmptyChat = !conv.isGroup && !conv.lastMessage;
    if (isDirectEmptyChat) return false;

    const matchesSearch = conv.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const matchesFilter =
      filterType === "all" ? true :
        filterType === "direct" ? !conv.isGroup :
          filterType === "group" ? conv.isGroup : true;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden relative border-r border-gray-100">
      {/* Desktop Local Header */}
      <div className="hidden md:flex items-center justify-between bg-white flex-shrink-0">

      </div>

      {/* Container for Filters, Search, and Chat List */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search & Filters Container */}
        <div className="px-4 pt-4 pb-2 md:px-6 md:pt-6 flex-shrink-0">

          {/* Filter Tabs */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <button
              onClick={() => setFilterType("all")}
              className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${filterType === "all"
                ? "bg-[#d08945] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              Alle
            </button>
            <button
              onClick={() => setFilterType("direct")}
              className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${filterType === "direct"
                ? "bg-[#d08945] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              Direkt
            </button>
            <button
              onClick={() => setFilterType("group")}
              className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${filterType === "group"
                ? "bg-[#d08945] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              Gruppen
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-2">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
              <Search className="h-5 w-5" />
            </div>
            <input
              type="text"
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-full outline-none focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent placeholder-gray-400 transition-colors"
              placeholder="Suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Scrollable Chat List */}
        <div className="flex-1 overflow-y-auto px-4 pb-24 md:px-6 md:pb-24 scrollbar-hide">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d08945]" />
            </div>
          ) : filteredConversations?.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Keine Chats gefunden.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {filteredConversations?.map((conv) => {
                const membership = (conv as any).membership;
                const isLeft = membership === "left";
                const isSelected = pathname === `/chat/${conv._id}`;

                const liveCall =
                  conv.isGroup && !isLeft
                    ? activeGroupCallByConversationId.get(conv._id as string)
                    : undefined;
                const inThisCall =
                  !!liveCall && activeCallId === liveCall.callId;

                return (
                  <div key={conv._id} className="relative group flex items-center gap-1.5 pb-4">
                    <Link
                      href={`/chat/${conv._id}`}
                      className={`flex items-center flex-1 min-w-0 p-2 rounded-xl transition-colors ${isSelected ? "bg-gray-100" : "hover:bg-gray-50/50"
                        } ${isLeft ? "opacity-50" : ""}`}
                    >
                      <div className="w-11 h-11 rounded-full overflow-hidden mr-3 flex-shrink-0" style={{ backgroundColor: "rgba(0, 0, 0, 0.2)" }}>
                        {conv.displayImage ? (
                          <img src={conv.displayImage} alt={conv.displayName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-semibold text-lg" style={{ color: "#000000" }}>
                            {conv.displayName?.charAt(0).toUpperCase() || "?"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold text-sm truncate pr-2 text-black">{conv.displayName}</h3>
                          <div className="flex flex-col items-end flex-shrink-0">
                            {conv.lastMessage && (
                              <span className="text-[10px] text-gray-400 font-medium mb-1">
                                {formatLastMessageTime((conv.lastMessage as any).createdAt)}
                              </span>
                            )}
                            {conv.unreadCount > 0 && (
                              <div className="bg-[#f78d57] text-white text-[9px] font-bold px-1.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full">
                                {conv.unreadCount}
                              </div>
                            )}
                            {isLeft && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (confirm("Möchtest du diesen Chat wirklich löschen?")) {
                                    deleteConversationFromList({
                                      conversationId: conv._id,
                                      userId: currentUser!._id
                                    });
                                  }
                                }}
                                className="mt-1 p-1 text-red-500 hover:bg-red-50 rounded-full transition-colors z-10"
                                title="Chat löschen"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 truncate flex items-center pl-0.5 mt-0.5 font-normal">
                          {liveCall ? (
                            <span className="flex items-center gap-1.5 text-[#D08945] font-medium">
                              {liveCall.type === "video" ? (
                                <Video size={12} className="flex-shrink-0" />
                              ) : (
                                <Phone size={12} className="flex-shrink-0" />
                              )}
                              {inThisCall
                                ? "Du bist im Anruf"
                                : liveCall.type === "video"
                                  ? "Gruppen-Videoanruf läuft"
                                  : "Gruppenanruf läuft"}
                            </span>
                          ) : conv.lastMessage ? (
                            (conv.lastMessage as any).type === "image" ? (
                              <>
                                <Image size={12} className="flex-shrink-0 mr-1" />
                                <span>Foto</span>
                              </>
                            ) : (conv.lastMessage as any).type === "video" ? (
                              <>
                                <CirclePlay size={12} className="flex-shrink-0 mr-1" />
                                <span>Video</span>
                              </>
                            ) : (conv.lastMessage as any).type === "pdf" ? (
                              <>
                                <FileIcon size={12} className="flex-shrink-0 mr-1" />
                                <span>{(conv.lastMessage as any).fileName || "Dokument"}</span>
                              </>
                            ) : (conv.lastMessage as any).type === "post" ? (
                              <>
                                <StickyNote size={12} className="flex-shrink-0 mr-1" />
                                <span>Geteilter Beitrag</span>
                              </>
                            ) : (conv.lastMessage as any).type === "poll" ? (
                              <>
                                <BarChart2 size={12} className="flex-shrink-0 mr-1" />
                                <span>Umfrage</span>
                              </>
                            ) : (conv.lastMessage as any).type === "profile" ? (
                              <>
                                <User size={12} className="flex-shrink-0 mr-1" />
                                <span>Geteiltes Profil</span>
                              </>
                            ) : (conv.lastMessage as any).type === "event_invite" ? (
                              <>
                                <CalendarDays size={12} className="flex-shrink-0 mr-1" />
                                <span>{conv.lastMessage.content || "Termin"}</span>
                              </>
                            ) : (
                              conv.lastMessage.content
                            )
                          ) : (
                            "Noch keine Nachrichten"
                          )}
                        </p>
                      </div>
                    </Link>
                    {liveCall && !inThisCall && !isLeft && (
                      <button
                        type="button"
                        onClick={() => {
                          void startCall(conv._id, liveCall.type);
                        }}
                        className="flex-shrink-0 self-center px-2 py-1 rounded-full text-[10px] font-semibold text-white bg-[#D08945] active:scale-95 transition-transform"
                      >
                        Beitreten
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal/Drawer */}
      <>
        {/* Backdrop */}
        <div
          className={`fixed inset-0 bg-black/50 z-[80] transition-opacity duration-300 ${isNewChatOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          onClick={() => {
            setIsNewChatOpen(false);
            setTimeout(() => {
              setSelectedUsers([]);
              setGroupName("");
            }, 300);
          }}
        />

        {/* Drawer */}
        <div
          className={`fixed inset-x-0 bottom-0 max-h-[85vh] md:max-h-[75vh] z-[80] flex flex-col bg-white rounded-t-3xl transition-transform duration-300 ease-out ${isNewChatOpen ? "translate-y-0" : "translate-y-full"
            }`}
          style={{
            pointerEvents: isNewChatOpen ? "auto" : "none"
          }}
        >
          <div
            className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white rounded-t-3xl"
          >
            <button
              onClick={() => {
                setIsNewChatOpen(false);
                setTimeout(() => {
                  setSelectedUsers([]);
                  setGroupName("");
                }, 300);
              }}
              className="text-sm font-medium text-gray-500 hover:text-black transition-colors"
            >
              Abbrechen
            </button>
            <h2 className="text-base font-semibold text-black">Neuer Chat</h2>
            <button
              onClick={handleStartChat}
              disabled={selectedUsers.length === 0 || (selectedUsers.length > 1 && !groupName.trim())}
              className={`text-sm font-semibold hover:opacity-70 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-[#D08945]`}
            >
              {selectedUsers.length > 1 ? "Erstellen" : "Starten"}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {/* Group Name Input */}
            {selectedUsers.length > 1 && (
              <div className="mb-6 animate-in slide-in-from-top-2 duration-200">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Gruppenname</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="z.B. Lerngruppe"
                  className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent placeholder-gray-400 transition-colors text-sm text-black"
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Vorschläge</div>
              {selectableUsers.map(user => {
                const isSelected = selectedUsers.includes(user._id);
                return (
                  <button
                    key={user._id}
                    onClick={() => toggleUserSelection(user._id)}
                    className={`w-full flex items-center p-3 rounded-2xl text-left transition-all ${isSelected ? "bg-[#d08945]/5 ring-2 ring-[#d08945]" : "hover:bg-gray-50/50 bg-white border border-gray-100"
                      }`}
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden mr-3 relative" style={{ backgroundColor: "rgba(0, 0, 0, 0.2)" }}>
                      {user.image ? (
                        <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-semibold text-sm" style={{ color: "#000000" }}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={`font-semibold text-sm ${isSelected ? "text-[#D08945]" : "text-black"}`}>{user.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">@{user.username}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </>

      {/* Floating New Chat Button */}
      <button
        onClick={() => setIsNewChatOpen(true)}
        className="absolute bottom-24 md:bottom-6 right-6 w-14 h-14 rounded-full bg-[#d08945] text-white shadow-lg flex items-center justify-center hover:bg-[#b07335] active:scale-95 transition-all z-40"
        title="Neuer Chat"
      >
        <Plus size={28} />
      </button>
    </div>
  );
}
