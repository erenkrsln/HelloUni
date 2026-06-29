"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useCall } from "@/lib/hooks/useCall";
import { Plus, MessageCircle, Search, Trash2, Image, FileIcon, BarChart2, StickyNote, User, CirclePlay, CalendarDays, Phone, Video, Globe, Lock, UserCheck, UserPlus, Users } from "lucide-react";
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
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "direct" | "group">("all");
  const [groupFilterType, setGroupFilterType] = useState<"all" | "public" | "private">("all");

  const [isGroupPublic, setIsGroupPublic] = useState(false);
  const [needsRequestToJoin, setNeedsRequestToJoin] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  const closeModal = () => {
    setIsNewChatOpen(false);
    setTimeout(() => {
      setSelectedUsers([]);
      setGroupName("");
      setUserSearchQuery("");
      setIsGroupPublic(false);
      setNeedsRequestToJoin(false);
    }, 300);
  };

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

  const chatSuggestions = useQuery(
    api.queries.getChatSuggestions,
    currentUser ? { userId: currentUser._id } : "skip"
  );

  const userSearchResults = useQuery(
    api.queries.searchProfiles,
    userSearchQuery.trim() ? { searchTerm: userSearchQuery } : "skip"
  );

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
        isPublic: selectedUsers.length > 1 ? isGroupPublic : undefined,
        needsRequestToJoin: selectedUsers.length > 1 ? needsRequestToJoin : undefined,
      });
      setIsNewChatOpen(false);
      setSelectedUsers([]);
      setGroupName("");
      setUserSearchQuery("");
      setIsGroupPublic(false);
      setNeedsRequestToJoin(false);
      router.push(`/chat/${conversationId}`);
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  const displayedUsers = useMemo(() => {
    if (userSearchQuery.trim()) {
      return userSearchResults?.filter(u => u._id !== currentUser?._id) || [];
    } else {
      return chatSuggestions || [];
    }
  }, [userSearchQuery, userSearchResults, chatSuggestions, currentUser?._id]);

  const isModalUsersLoading = userSearchQuery.trim()
    ? userSearchResults === undefined
    : chatSuggestions === undefined;

  const [knownUsers, setKnownUsers] = useState<Map<Id<"users">, any>>(new Map());

  useEffect(() => {
    setKnownUsers(prev => {
      const next = new Map(prev);
      let changed = false;
      chatSuggestions?.forEach(u => {
        if (!next.has(u._id)) {
          next.set(u._id, u);
          changed = true;
        }
      });
      userSearchResults?.forEach(u => {
        if (!next.has(u._id)) {
          next.set(u._id, u);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [chatSuggestions, userSearchResults]);

  const selectedUserObjects = useMemo(() => {
    return selectedUsers.map(id => {
      return knownUsers.get(id) || { _id: id, name: "Benutzer" };
    });
  }, [selectedUsers, knownUsers]);

  const filteredConversations = conversations?.filter(conv => {
    const isDirectEmptyChat = !conv.isGroup && !conv.lastMessage;
    if (isDirectEmptyChat) return false;

    const matchesSearch = conv.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const matchesFilter =
      filterType === "all" ? (
        groupFilterType === "all" ? true :
          groupFilterType === "public" ? (conv.isGroup && conv.isPublic) :
            (!conv.isPublic)
      ) :
        filterType === "direct" ? (
          !conv.isGroup && (
            groupFilterType === "all" ? true :
              groupFilterType === "public" ? false :
                true
          )
        ) :
          filterType === "group" ? (
            conv.isGroup && (
              groupFilterType === "all" ? true :
                groupFilterType === "public" ? conv.isPublic :
                  !conv.isPublic
            )
          ) : true;
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
        <div className="px-4 pt-4 pb-4 md:px-6 md:pt-6 border-b border-gray-100 flex-shrink-0">

          {/* Filter Tabs */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <button
              onClick={() => {
                setFilterType("all");
                setGroupFilterType("all");
              }}
              className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${filterType === "all"
                ? "bg-[#d08945] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              Alle
            </button>
            <button
              onClick={() => {
                setFilterType("direct");
                setGroupFilterType("all");
              }}
              className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${filterType === "direct"
                ? "bg-[#d08945] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              Direkt
            </button>
            <button
              onClick={() => {
                setFilterType("group");
                setGroupFilterType("all");
              }}
              className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${filterType === "group"
                ? "bg-[#d08945] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              Gruppen
            </button>
          </div>

          {/* Group Sub-filters */}
          {filterType === "group" && (
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setGroupFilterType("all")}
                className={`px-3 py-1.5 rounded-full text-xs  transition-all ${groupFilterType === "all"
                  ? "bg-gray-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                Alle
              </button>
              <button
                onClick={() => setGroupFilterType("public")}
                className={`px-3 py-1.5 rounded-full text-xs  transition-all ${groupFilterType === "public"
                  ? "bg-gray-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                Öffentlich
              </button>
              <button
                onClick={() => setGroupFilterType("private")}
                className={`px-3 py-1.5 rounded-full text-xs  transition-all ${groupFilterType === "private"
                  ? "bg-gray-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                Privat
              </button>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-full outline-none focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent placeholder-gray-400 transition-colors text-sm"
              placeholder="Suche in deinen Chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Scrollable Chat List */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 md:px-6 md:pt-4 md:pb-24 scrollbar-hide">
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
                          <div className="flex items-center gap-1.5 min-w-0">
                            <h3 className="font-semibold text-sm truncate text-black">{conv.displayName}</h3>
                            {conv.isGroup && conv.isPublic && (
                              <span className="bg-[#d08945]/10 text-[#d08945] text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0">
                                öffentlich
                              </span>
                            )}
                          </div>
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
          onClick={closeModal}
        />

        {/* Drawer / Centered Modal on Desktop */}
        <div
          className={`fixed inset-x-0 bottom-0 z-[80] flex flex-col bg-white rounded-t-3xl transition-all duration-300 ease-out h-[85vh] md:h-[80vh] md:max-h-[700px] md:w-[500px] md:rounded-3xl md:left-1/2 md:bottom-auto md:shadow-2xl ${
            isNewChatOpen
              ? "translate-y-0 opacity-100 md:top-1/2 md:-translate-y-1/2 md:-translate-x-1/2"
              : "translate-y-full opacity-0 md:top-[55%] md:-translate-y-1/2 md:-translate-x-1/2 pointer-events-none"
          }`}
          style={{
            pointerEvents: isNewChatOpen ? "auto" : "none"
          }}
        >
          <div
            className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white rounded-t-3xl flex-shrink-0"
          >
            <button
              onClick={closeModal}
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

          {/* Scrollable Container for the entire modal body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Search & Group Settings Area */}
            <div className="space-y-4">
              {/* Group Configuration options */}
              {selectedUsers.length > 1 && (
                <div className="space-y-3.5 animate-in slide-in-from-top-2 duration-200">
                  
                  {/* Selected People Preview */}
                  {selectedUserObjects.length > 0 && (
                    <div className="space-y-1.5 border-b border-gray-100 pb-3">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Ausgewählte Personen ({selectedUserObjects.length})
                      </label>
                      <div className="flex items-center gap-3 overflow-x-auto py-1 scrollbar-hide">
                        {selectedUserObjects.map((user) => (
                          <div key={user._id} className="relative flex flex-col items-center flex-shrink-0 w-12">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200" style={{ backgroundColor: "rgba(0, 0, 0, 0.1)" }}>
                              {user.image ? (
                                <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-semibold text-sm text-black">
                                  {user.name?.charAt(0).toUpperCase() || "?"}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleUserSelection(user._id)}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-gray-400 text-white rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors"
                            >
                              <Plus className="w-2.5 h-2.5 rotate-45" />
                            </button>
                            <span className="text-[10px] text-gray-500 truncate w-full text-center mt-1">
                              {user.name?.split(" ")[0]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Group Name Input */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Gruppenname
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                        <Users className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="z.B. Lerngruppe"
                        className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full outline-none focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent placeholder-gray-400 transition-colors text-sm text-black"
                      />
                    </div>
                  </div>

                  {/* Group Settings Toggles */}
                  <div className="space-y-2 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                    {/* Sichtbarkeit Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-black">Öffentliche Gruppe</span>
                        <span className="text-[10px] text-gray-400">Jeder kann die Gruppe finden und beitreten</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsGroupPublic(!isGroupPublic)}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isGroupPublic ? "bg-[#d08945]" : "bg-gray-200"
                          }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isGroupPublic ? "translate-x-4" : "translate-x-0"
                            }`}
                        />
                      </button>
                    </div>

                    {/* Beitrittsmethode Toggle */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200/50">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-black">Beitrittsanfrage erforderlich</span>
                        <span className="text-[10px] text-gray-400">Beitritt muss von einem Admin genehmigt werden</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNeedsRequestToJoin(!needsRequestToJoin)}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${needsRequestToJoin ? "bg-[#d08945]" : "bg-gray-200"
                          }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${needsRequestToJoin ? "translate-x-4" : "translate-x-0"
                            }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* User Search Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  placeholder="Nach Kontakten suchen..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full outline-none focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent placeholder-gray-400 transition-colors text-sm text-black"
                />
              </div>
            </div>

            {/* Suggestions / Results Header & List */}
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {userSearchQuery.trim() ? "Suchergebnisse" : "Vorschläge"}
              </div>

              <div className="space-y-2 px-1 py-1">
                {isModalUsersLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#d08945]" />
                  </div>
                ) : displayedUsers.length === 0 ? (
                  <div className="flex justify-center items-center py-12 text-gray-400 text-sm text-center">
                    {userSearchQuery.trim() ? "Keine Benutzer gefunden." : "Keine Vorschläge gefunden."}
                  </div>
                ) : (
                  displayedUsers.map(user => {
                    const isSelected = selectedUsers.includes(user._id);
                    return (
                      <button
                        key={user._id}
                        onClick={() => toggleUserSelection(user._id)}
                        className={`w-full flex items-center p-3 rounded-2xl text-left transition-all ${isSelected
                          ? "bg-[#d08945]/5 ring-2 ring-inset ring-[#d08945]"
                          : "hover:bg-gray-50/50 bg-white border border-gray-100"
                          }`}
                      >
                        <div className="w-10 h-10 rounded-full overflow-hidden mr-3 relative" style={{ backgroundColor: "rgba(0, 0, 0, 0.2)" }}>
                          {user.image ? (
                            <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-semibold text-sm" style={{ color: "#000000" }}>
                              {user.name?.charAt(0).toUpperCase() || "?"}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-semibold text-sm truncate ${isSelected ? "text-[#D08945]" : "text-black"}`}>{user.name}</div>
                          <div className="text-xs text-gray-500 truncate mt-0.5">@{user.username}</div>
                          {user.major && (
                            <div className="text-xs text-gray-400 mt-0.5 truncate" title={user.major}>
                              {user.major}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </>

      {/* Floating New Chat Button */}
      <button
        onClick={() => setIsNewChatOpen(true)}
        className="absolute bottom-[calc(94px+env(safe-area-inset-bottom,0px))] md:bottom-6 right-4 md:right-6 w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#d08945] text-white shadow-lg flex items-center justify-center hover:bg-[#b07335] active:scale-95 transition-all z-40"
        title="Neuer Chat"
      >
        <Plus className="w-[26px] h-[26px] md:w-7 md:h-7" />
      </button>
    </div>
  );
}
