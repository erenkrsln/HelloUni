"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { Plus, MessageCircle, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";

export default function ChatPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Id<"users">[]>([]);
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "direct" | "group">("all");
  const router = useRouter();

  const { currentUser } = useCurrentUser();
  const conversations = useQuery(api.queries.getConversations, currentUser ? { userId: currentUser._id } : "skip");
  const allUsers = useQuery(api.queries.getAllUsers);
  const createConversation = useMutation(api.mutations.createConversation);

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

      <div className="px-4 py-6">
        <div className="flex items-center justify-center mb-6">
          <button
            onClick={() => setIsNewChatOpen(true)}
            className="w-10 h-10 rounded-full bg-gradient-to-r from-[#D08945] to-[#F4CFAB] text-black flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus size={24} />
          </button>
        </div>
        <div className="flex items-center justify-center gap-2 mb-6 text-[#8C531E]">
          <button
            onClick={() => setFilterType("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filterType === "all"
              ? "bg-gradient-to-r from-[#D08945] to-[#F4CFAB] text-black shadow-md"
              : "bg-[#FDFBF7] border border-[#EFEADD] text-[#8C531E] hover:bg-[#F6EFE4]"
              }`}
          >
            Alle
          </button>
          <button
            onClick={() => setFilterType("direct")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filterType === "direct"
              ? "bg-gradient-to-r from-[#D08945] to-[#F4CFAB] text-black shadow-md"
              : "bg-[#FDFBF7] border border-[#EFEADD] text-[#8C531E] hover:bg-[#F6EFE4]"
              }`}
          >
            Direkt
          </button>
          <button
            onClick={() => setFilterType("group")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filterType === "group"
              ? "bg-gradient-to-r from-[#D08945] to-[#F4CFAB] text-black shadow-md"
              : "bg-[#FDFBF7] border border-[#EFEADD] text-[#8C531E] hover:bg-[#F6EFE4]"
              }`}
          >
            Gruppen
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[#8C531E]">
            <Search className="h-5 w-5" />
          </div>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-3 bg-[#FDFBF7] border border-[#EFEADD] rounded-xl outline-none focus:border-[#8C531E] text-[#8C531E] placeholder:text-[#8C531E] transition-colors"
            placeholder="Suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Chat List */}
        <div className="flex flex-col">
          {!conversations ? (
            <div className="text-center py-8 text-gray-500">Lade Chats...</div>
          ) : filteredConversations?.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>Keine Chats gefunden.</p>
            </div>
          ) : (
            filteredConversations?.map((conv) => (
              <Link
                key={conv._id}
                href={`/chat/${conv._id}`}
                className="flex items-center p-3 hover:bg-[#FDFBF7] transition-colors active:bg-[#FDFBF7] border-b border-[#EFEADD] last:border-0"
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
                        {new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {conv.unreadCount > 0 && (
                        <div className="bg-[#f78d57] text-white text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full">
                          {conv.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {conv.isGroup ? (
                      <span className="font-semibold mr-1">{/* Optional sender name if available */}</span>
                    ) : null}
                    {conv.lastMessage?.content || "No messages yet"}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* New Chat Modal/Sheet */}
      {
        isNewChatOpen && (
          <div className="fixed inset-0 z-[60] flex flex-col bg-white">
            <div className="flex items-center px-4 py-4 border-b gap-3">
              <button
                onClick={() => {
                  setIsNewChatOpen(false);
                  setSelectedUsers([]);
                  setGroupName("");
                }}
                className="p-2 -ml-2 text-gray-500 active:scale-95"
              >
                Abbrechen
              </button>
              <h2 className="text-lg font-bold flex-1 text-center">Neuer Chat</h2>
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
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#8C531E] transition-colors"
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
                      className={`w-full flex items-center p-3 rounded-xl text-left transition-all ${isSelected ? "bg-[#f6efe4] ring-1 ring-[#8C531E]" : "hover:bg-gray-50 bg-white"
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
                        {isSelected && (
                          <div className="absolute inset-0 bg-[#8C531E]/20 flex items-center justify-center">

                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className={`font-medium ${isSelected ? "text-[#8C531E]" : "text-black"}`}>{user.name}</div>
                        <div className="text-xs text-gray-500">@{user.username}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedUsers.length > 0 && (
              <div className="p-4 border-t bg-white safe-area-bottom">
                <div className="text-sm text-center text-gray-500 mb-2">
                  {selectedUsers.length} ausgewählt
                </div>
                <button
                  onClick={handleStartChat}
                  disabled={selectedUsers.length > 1 && !groupName.trim()}
                  className={`w-full py-3 flex items-center justify-center rounded-full font-semibold active:scale-95 transition-transform
                  ${selectedUsers.length > 1 && !groupName.trim()
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-[#D08945] to-[#F4CFAB] text-black"
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
