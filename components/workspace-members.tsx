"use client";

import { useQuery, useMutation } from "convex/react";
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
    return <div className="text-center p-8 text-muted-foreground">Loading members...</div>;
  }

  return (
    <div className="p-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="mb-4">
        <h2 className="font-semibold text-lg">Members ({members.length})</h2>
        <p className="text-sm text-muted-foreground">People participating in this workspace.</p>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {members.map((member, idx) => (
          <MemberRow
            key={member._id || idx}
            member={member}
            isLast={idx === members.length - 1}
            conversationId={isGroup ? entityId : undefined}
            currentUser={currentUser}
          />
        ))}
        {!isGroup && (
          <div className="p-3 text-xs text-muted-foreground text-center bg-muted">
            Event participants feature arriving in Phase 4.
          </div>
        )}
      </div>
    </div>
  );
}

function MemberRow({ member, isLast, conversationId, currentUser }: any) {
  const promoteToAdmin = useMutation(api.workspace.promoteToAdmin);
  const demoteAdmin = useMutation(api.workspace.demoteAdmin);
  const removeMember = useMutation(api.workspace.removeMember);

  const myRole = currentUser && member && member.role ? (member.role === "creator" ? "creator" : member.role) : null;

  // Determine current user's role in this conversation by checking member list is done by parent, but
  // we compute allowed actions based on currentUser props and server-side permission model.
  const canPromote = currentUser && member && myRole === "creator" && currentUser._id !== member._id;
  const canDemote = currentUser && member && myRole === "creator" && currentUser._id !== member._id;
  const canRemove = currentUser && member && (myRole === "creator" || myRole === "admin") && currentUser._id !== member._id;

  const handlePromote = async () => {
    if (!conversationId || !currentUser) return;
    try {
      await promoteToAdmin({ conversationId, userId: member._id, actorId: currentUser._id });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDemote = async () => {
    if (!conversationId || !currentUser) return;
    try {
      await demoteAdmin({ conversationId, userId: member._id, actorId: currentUser._id });
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemove = async () => {
    if (!conversationId || !currentUser) return;
    if (!confirm("Remove member?")) return;
    try {
      await removeMember({ conversationId, userId: member._id, actorId: currentUser._id });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className={`flex items-center gap-3 p-3 ${!isLast ? 'border-b border-border' : ''}`}>
      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-muted border border-border">
        {member.image ? (
          <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-bold text-muted-foreground text-sm">
            {member.name?.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex-1">
        <div className="font-medium text-sm text-foreground">
          {member.name} {currentUser?._id === member._id && <span className="text-xs text-muted-foreground font-normal">(You)</span>}
        </div>
        <div className="text-xs text-muted-foreground">@{member.username || "student"} {member.role ? `· ${member.role}` : ''}</div>
      </div>
      <div className="flex items-center gap-2">
        {canPromote && <button onClick={handlePromote} className="text-sm text-blue-600 p-2">Promote</button>}
        {canDemote && <button onClick={handleDemote} className="text-sm text-yellow-600 p-2">Demote</button>}
        {canRemove && <button onClick={handleRemove} className="text-sm text-red-600 p-2">Remove</button>}
      </div>
    </div>
  );
}
