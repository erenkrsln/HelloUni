"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Search, X } from "lucide-react";
import { formatChatTimestamp } from "@/lib/utils";

interface ShareProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: Id<"users">;
  currentUserId: Id<"users">;
}

export function ShareProfileModal({ isOpen, onClose, profileId, currentUserId }: ShareProfileModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  const conversations = useQuery(api.queries.getConversations, { userId: currentUserId });
  const sendMessage = useMutation(api.mutations.sendMessage);

  if (!isOpen) return null;

  const filteredConversations = conversations?.filter(conv => {
    const isDirectEmptyChat = !conv.isGroup && !conv.lastMessage;
    if (isDirectEmptyChat) return false;
    
    // Don't show inactive ("left") chats for sharing
    const membership = (conv as any).membership;
    if (membership === "left") return false;

    return conv.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
  });

  const handleSend = async (conversationId: Id<"conversations">) => {
    if (sendingTo) return;
    
    setSendingTo(conversationId);
    try {
      const profileUrl = `${window.location.origin}/profile/${profileId}`;
      await sendMessage({
        conversationId,
        senderId: currentUserId,
        content: profileUrl,
        type: "profile",
        sharedProfileId: profileId,
      });
      // Optionally could show a success toast here
      onClose();
    } catch (error) {
      console.error("Failed to share profile:", error);
      // Could show error toast
    } finally {
      setSendingTo(null);
    }
  };

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/50 z-[80] transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      <div 
        className={`fixed inset-x-0 bottom-0 z-[80] flex flex-col bg-card text-card-foreground rounded-t-3xl transition-transform duration-300 ease-out ${isOpen ? "translate-y-0" : "translate-y-full"}`}
        style={{
          maxHeight: "85vh",
          paddingBottom: "max(env(safe-area-inset-bottom), 1rem)"
        }}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Profil teilen an...</h2>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-border">
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-xl outline-none focus:outline-none focus:ring-2 focus:ring-[#D08945] text-sm transition-colors text-foreground placeholder:text-muted-foreground"
              placeholder="Suchen nach Chat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pt-2">
          {!conversations ? (
            <div className="text-center text-sm py-8 text-muted-foreground">Lade Chats...</div>
          ) : filteredConversations?.length === 0 ? (
            <div className="text-center text-sm py-8 text-muted-foreground">
              {searchQuery ? "Keine Chats gefunden" : "Keine aktiven Chats"}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filteredConversations?.map((conv) => (
                <div 
                  key={conv._id} 
                  className="flex items-center justify-between p-2 hover:bg-accent rounded-xl transition-colors cursor-pointer"
                  onClick={() => handleSend(conv._id)}
                >
                  <div className="flex items-center flex-1 min-w-0 pr-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden mr-3 flex-shrink-0" style={{ backgroundColor: "rgba(0, 0, 0, 0.2)" }}>
                      {conv.displayImage ? (
                        <img src={conv.displayImage} alt={conv.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-semibold text-black dark:text-white">
                          {conv.displayName?.charAt(0).toUpperCase() || "?"}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0 mr-3">
                      <span className="font-medium text-[15px] truncate text-foreground">
                        {conv.displayName}
                      </span>
                      {conv.lastMessage && (
                        <span className="text-[12px] text-muted-foreground truncate">
                          {formatChatTimestamp(conv.updatedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    className="flex-shrink-0 px-4 py-1.5 bg-[#D08945] text-white text-sm font-medium rounded-full hover:bg-[#c27a3c] transition-colors disabled:opacity-50"
                    disabled={sendingTo === conv._id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSend(conv._id);
                    }}
                  >
                    {sendingTo === conv._id ? "Sendet..." : "Senden"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
