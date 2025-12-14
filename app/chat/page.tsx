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
  const router = useRouter();

  const { currentUser } = useCurrentUser();
  const conversations = useQuery(api.queries.getConversations, currentUser ? { userId: currentUser._id } : "skip");
  const allUsers = useQuery(api.queries.getAllUsers);
  const createConversation = useMutation(api.mutations.createConversation);

  const startChat = async (partnerId: Id<"users">) => {
    if (!currentUser) return;

    try {
      const conversationId = await createConversation({
        creatorId: currentUser._id,
        partnerId: partnerId,
      });
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
            className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white active:scale-95 transition-transform"
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
                  {conv.partner?.image ? (
                    <img src={conv.partner.image} alt={conv.partner.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xl">
                      {conv.partner?.name?.charAt(0) || "?"}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold truncate pr-2">{conv.partner?.name || "Unknown User"}</h3>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(conv.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">
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
          <div className="flex items-center px-4 py-4 border-b">
            <button
              onClick={() => setIsNewChatOpen(false)}
              className="mr-4 p-2 -ml-2 text-gray-500 active:scale-95"
            >
              Cancel
            </button>
            <h2 className="text-lg font-bold">New Chat</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {selectableUsers.map(user => (
                <button
                  key={user._id}
                  onClick={() => startChat(user._id)}
                  className="w-full flex items-center p-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 text-left transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden mr-3">
                    {user.image ? (
                      <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">
                        {user.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-gray-500">@{user.username}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <BottomNavigation />
    </main>
  );
}
