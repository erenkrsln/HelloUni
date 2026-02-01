"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { Plus, MessageCircle, Search, Trash2, Image, FileIcon, ArrowLeft, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { LoadingScreen } from "@/components/ui/spinner";
import { formatChatTimestamp } from "@/lib/utils";

export default function ChatPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Id<"users">[]>([]);
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "direct" | "group">("all");
  const router = useRouter();

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

    // Add current user to participants
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

  // Filter users to exclude current user
  const selectableUsers = allUsers?.filter(u => u._id !== currentUser?._id) || [];

  const filteredConversations = conversations?.filter(conv => {
    const matchesSearch = conv.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const matchesFilter =
      filterType === "all" ? true :
        filterType === "direct" ? !conv.isGroup :
          filterType === "group" ? conv.isGroup : true;
    return matchesSearch && matchesFilter;
  });

  return (
    <main className="min-h-screen w-full max-w-[428px] mx-auto pb-24 overflow-x-hidden bg-white header-spacing">
      <Header onMenuClick={() => setIsSidebarOpen(true)} />
      <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {isLoading ? (
        <LoadingScreen text="Chats werden geladen..." />
      ) : (
        <div className="px-4 py-6">
          <div className="flex items-center justify-center mb-6">
            <button
              onClick={() => setIsNewChatOpen(true)}
              className="w-10 h-10 rounded-full bg-[#d08945] text-white font-medium flex items-center justify-center active:scale-95 transition-transform"
            >
              <Plus size={24} />
            </button>
          </div>
          <div className="flex items-center justify-center gap-2 mb-6">
            <button
              onClick={() => setFilterType("all")}
              className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${filterType === "all"
                ? "bg-[#d08945] text-white"
                : "bg-gray-100 text-gray-700"
                }`}
            >
              Alle
            </button>
            <button
              onClick={() => setFilterType("direct")}
              className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${filterType === "direct"
                ? "bg-[#d08945] text-white"
                : "bg-gray-100 text-gray-700"
                }`}
            >
              Direkt
            </button>
            <button
              onClick={() => setFilterType("group")}
              className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${filterType === "group"
                ? "bg-[#d08945] text-white"
                : "bg-gray-100 text-gray-700"
                }`}
            >
              Gruppen
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
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

          {/* Chat List */}
          <div className="flex flex-col">
            {filteredConversations?.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>Keine Chats gefunden.</p>
              </div>
            ) : (
              filteredConversations?.map((conv) => {
                // Cast conv to any to access membership property if types are not generated yet
                const membership = (conv as any).membership;
                const isLeft = membership === "left";

                return (
                  <div key={conv._id} className="relative group">
                    <Link
                      href={`/chat/${conv._id}`}
                      className={`flex items-center pb-6 ${isLeft ? "opacity-50" : ""}`}
                    >

                      <div className="w-12 h-12 rounded-full overflow-hidden mr-3 flex-shrink-0" style={{ backgroundColor: "rgba(0, 0, 0, 0.2)" }}>
                        {conv.displayImage ? (
                          <img src={conv.displayImage} alt={conv.displayName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-semibold text-xl" style={{ color: "#000000" }}>
                            {conv.displayName?.charAt(0).toUpperCase() || "?"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold truncate pr-2 text-black">{conv.displayName}</h3>
                          <div className="flex flex-col items-end">
                            <span className="text-xs text-gray-400 whitespace-nowrap mb-0.5">
                              {formatChatTimestamp(conv.updatedAt)}
                            </span>
                            {conv.unreadCount > 0 && (
                              <div className="bg-[#f78d57] text-white text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full">
                                {conv.unreadCount}
                              </div>
                            )}
                            {isLeft && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault(); // Prevent navigation
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
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 truncate flex items-center pl-0.5">
                          {conv.lastMessage ? (
                            (conv.lastMessage as any).type === "image" ? (
                              <>
                                <Image size={14} className="flex-shrink-0" />
                                <span>Foto</span>
                              </>
                            ) : (conv.lastMessage as any).type === "pdf" ? (
                              <>
                                <FileIcon size={14} className="flex-shrink-0" />
                                <span>{(conv.lastMessage as any).fileName || "Dokument"}</span>
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

                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* New Chat Modal/Sheet */}
      {
        isNewChatOpen && (
          <div className="fixed inset-0 z-[80] flex flex-col bg-white">
            <div
              className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white"
              style={{
                paddingTop: `calc(0.75rem + env(safe-area-inset-top, 0px))`
              }}
            >
              <h2 className="text-lg font-semibold">Neuer Chat</h2>
              <button
                onClick={() => {
                  setIsNewChatOpen(false);
                  setSelectedUsers([]);
                  setGroupName("");
                }}
                className="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {/* Group Name Input */}
              {selectedUsers.length > 1 && (
                <div className="mb-6 animate-in slide-in-from-top-2 fade-in">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gruppenname</label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="z.B. Lerngruppe"
                    className="w-full pl-4 pr-4 py-3 bg-white border border-gray-300 rounded-full outline-none focus:outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent placeholder-gray-400 transition-colors"
                  />
                </div>
              )}

              <div className="space-y-2">
                <div className="text-sm font-semibold text-gray-500 mb-2">Vorschläge</div>
                {selectableUsers.map(user => {
                  const isSelected = selectedUsers.includes(user._id);
                  return (
                    <button
                      key={user._id}
                      onClick={() => toggleUserSelection(user._id)}
                      className={`w-full flex items-center p-3 rounded-xl text-left transition-all ${isSelected ? "ring-2 ring-[#D08945]" : "bg-white"
                        }`}
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden mr-3 relative" style={{ backgroundColor: "rgba(0, 0, 0, 0.2)" }}>
                        {user.image ? (
                          <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-semibold" style={{ color: "#000000" }}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}

                      </div>
                      <div className="flex-1">
                        <div className={`font-medium ${isSelected ? "text-[#D08945]" : "text-black"}`}>{user.name}</div>
                        <div className="text-xs text-gray-500">@{user.username}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedUsers.length > 0 && (
              <div
                className="p-4 border-t bg-white"
                style={{
                  paddingBottom: `calc(1rem + env(safe-area-inset-bottom, 0px))`
                }}
              >

                <button
                  onClick={handleStartChat}
                  disabled={selectedUsers.length > 1 && !groupName.trim()}
                  className={`w-full py-3 flex items-center justify-center rounded-full font-semibold active:scale-95 transition-transform
                  ${selectedUsers.length > 1 && !groupName.trim()
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-[#D08945] text-white"
                    }`}
                >
                  {selectedUsers.length > 1 ? "Gruppe erstellen" : "Chat starten"}
                </button>
              </div>
            )}
          </div>
        )
      }

      <BottomNavigation />
    </main >
  );
}
