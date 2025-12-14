"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { Plus, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";

export default function ChatPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Id<"users">[]>([]);
  const [groupName, setGroupName] = useState("");
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

  return (
    <main className="min-h-screen w-full max-w-[428px] mx-auto pb-24 overflow-x-hidden bg-white">
      <Header onMenuClick={() => setIsSidebarOpen(true)} />
      <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Chats</h1>
          <button
            onClick={() => setIsNewChatOpen(true)}
            className="w-10 h-10 rounded-full bg-[#332B2B] flex items-center justify-center text-white active:scale-95 transition-transform shadow-md"
          >
            <Plus size={24} />
          </button>
        </div>

        {/* Chat List */}
        <div className="space-y-4">
          {!conversations ? (
            <div className="text-center py-8 text-gray-500">Loading chats...</div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>No chats yet. Start a new one!</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <Link
                key={conv._id}
                href={`/chat/${conv._id}`}
                className="flex items-center p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors active:scale-99"
              >
                <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden mr-3 flex-shrink-0">
                  {conv.displayImage ? (
                    <img src={conv.displayImage} alt={conv.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xl bg-[#e5e5e5]">
                      {conv.displayName?.charAt(0) || "?"}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold truncate pr-2">{conv.displayName}</h3>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
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
      {isNewChatOpen && (
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
              Cancel
            </button>
            <h2 className="text-lg font-bold flex-1 text-center">New Chat</h2>
            <button
              onClick={handleStartChat}
              disabled={selectedUsers.length === 0}
              className={`font-semibold ${selectedUsers.length === 0 ? "text-gray-300" : "text-[#8C531E]"}`}
            >
              Done
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Group Name Input */}
            {selectedUsers.length > 1 && (
              <div className="mb-6 animate-in slide-in-from-top-2 fade-in">
                <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Study Group"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#8C531E] transition-colors"
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-500 mb-2">SUGGESTED</div>
              {selectableUsers.map(user => {
                const isSelected = selectedUsers.includes(user._id);
                return (
                  <button
                    key={user._id}
                    onClick={() => toggleUserSelection(user._id)}
                    className={`w-full flex items-center p-3 rounded-xl text-left transition-all ${isSelected ? "bg-[#f6efe4] ring-1 ring-[#8C531E]" : "hover:bg-gray-50 bg-white"
                      }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden mr-3 relative">
                      {user.image ? (
                        <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">
                          {user.name.charAt(0)}
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute inset-0 bg-[#8C531E]/20 flex items-center justify-center">
                          <div className="w-4 h-4 bg-[#8C531E] rounded-full border-2 border-white"></div>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium ${isSelected ? "text-[#8C531E]" : "text-black"}`}>{user.name}</div>
                      <div className="text-xs text-gray-500">@{user.username}</div>
                    </div>
                    {isSelected && <div className="text-[#8C531E] font-bold text-xl ml-2">✓</div>}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedUsers.length > 0 && (
            <div className="p-4 border-t bg-white safe-area-bottom">
              <div className="text-sm text-center text-gray-500 mb-2">
                {selectedUsers.length} selected
              </div>
              <button
                onClick={handleStartChat}
                className="w-full py-3 bg-[#332B2B] text-white rounded-full font-semibold active:scale-95 transition-transform"
              >
                {selectedUsers.length > 1 ? "Create Group" : "Start Chat"}
              </button>
            </div>
          )}
        </div>
      )}

      <BottomNavigation />
    </main>
  );
}
