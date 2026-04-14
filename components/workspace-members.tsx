"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

export function WorkspaceMembers({ workspaceId }: { workspaceId: string }) {
  const { currentUser } = useCurrentUser();
  
  const isGroup = workspaceId.startsWith("group_");
  const entityId = workspaceId.replace("group_", "").replace("event_", "") as Id<"conversations">;

  // We only fetch members if it's a group for now. 
  // (In the future, Events will need an event_participants table)
  const conversationMembers = useQuery(
    api.queries.getConversationMembers, 
    isGroup ? { conversationId: entityId } : "skip"
  );
  
  // Example dummy data for Events just to maintain UI consistency for the MVP
  const dummyEventMembers = currentUser ? [currentUser] : [];
  
  const members = isGroup ? conversationMembers : dummyEventMembers;

  if (!members) {
    return <div className="text-center p-8 text-gray-500">Loading members...</div>;
  }

  return (
    <div className="p-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="mb-4">
        <h2 className="font-semibold text-lg">Members ({members.length})</h2>
        <p className="text-sm text-gray-500">People participating in this workspace.</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
        {members.map((member, idx) => (
          <div 
            key={member._id || idx} 
            className={`flex items-center gap-3 p-3 ${idx !== members.length - 1 ? 'border-b border-gray-50' : ''}`}
          >
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-200">
               {member.image ? (
                 <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center font-bold text-gray-500 text-sm">
                   {member.name?.charAt(0).toUpperCase()}
                 </div>
               )}
            </div>
            <div>
              <div className="font-medium text-sm text-gray-900">
                {member.name} {currentUser?._id === member._id && <span className="text-xs text-gray-400 font-normal">(You)</span>}
              </div>
              <div className="text-xs text-gray-500">@{member.username || "student"}</div>
            </div>
          </div>
        ))}
        {!isGroup && (
          <div className="p-3 text-xs text-gray-400 text-center bg-gray-50">
            Event participants feature arriving in Phase 4.
          </div>
        )}
      </div>
    </div>
  );
}
