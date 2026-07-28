"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Search,
  UserPlus,
  Trash2,
  X,
  Star,
  StarOff,
  Sparkles,
  ArrowLeft,
} from "lucide-react";

interface GroupMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: Id<"conversations">;
  currentUserId: Id<"users">;
}

export function GroupMembersModal({
  isOpen,
  onClose,
  conversationId,
  currentUserId,
}: GroupMembersModalProps) {
  const router = useRouter();
  const [view, setView] = useState<"list" | "add">("list");
  const [searchQuery, setSearchQuery] = useState("");

  const members = useQuery(api.queries.getConversationMembers, {
    conversationId,
  });
  const allUsers = useQuery(api.queries.getAllUsers);

  const addMember = useMutation(api.workspace.addMember);
  const removeMember = useMutation(api.workspace.removeMember);
  const promoteToAdmin = useMutation(api.workspace.promoteToAdmin);
  const demoteAdmin = useMutation(api.workspace.demoteAdmin);
  const claimGroup = useMutation(api.mutations.claimGroupOwnership);
  const transferCreator = useMutation(api.mutations.transferCreator);
  const deleteConversation = useMutation(api.mutations.deleteConversation);
  const leaveGroup = useMutation(api.mutations.leaveGroup);

  const myself = members?.find((m) => m._id === currentUserId);
  const iAmCreator = myself?.role === "creator";
  const iAmAdmin = myself?.role === "admin" || myself?.role === "creator";

  const availableUsers =
    allUsers?.filter(
      (u) =>
        !members?.some((m) => m._id === u._id && m.role !== "left") &&
        (u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.username.toLowerCase().includes(searchQuery.toLowerCase())),
    ) || [];

  const handleAddMember = async (userId: Id<"users">) => {
    try {
      await addMember({ conversationId, userId, actorId: currentUserId });
      setView("list");
    } catch (error) {
      console.error("Failed to add member:", error);
    }
  };

  const handleRemoveMember = async (userId: Id<"users">) => {
    if (!confirm("Möchtest du dieses Mitglied wirklich entfernen?")) return;
    try {
      await removeMember({ conversationId, userId, actorId: currentUserId });
    } catch (error) {
      console.error("Failed to remove member:", error);
    }
  };

  const handlePromote = async (userId: Id<"users">) => {
    try {
      await promoteToAdmin({ conversationId, userId, actorId: currentUserId });
    } catch (error) {
      console.error("Failed to promote member:", error);
    }
  };

  const handleDemote = async (userId: Id<"users">) => {
    try {
      await demoteAdmin({ conversationId, userId, actorId: currentUserId });
    } catch (error) {
      console.error("Failed to demote member:", error);
    }
  };

  const handleLeave = async () => {
    if (iAmCreator) {
      alert(
        "Du bist der Ersteller dieser Gruppe. Bitte übertrage zuerst die Gruppenleitung an ein anderes Mitglied, bevor du die Gruppe verlässt.",
      );
      return;
    }
    if (
      !confirm(
        "Möchtest du die Gruppe wirklich verlassen? Du kannst danach keine Nachrichten mehr senden.",
      )
    )
      return;
    try {
      await leaveGroup({
        conversationId,
        userId: currentUserId,
      });
      onClose();
    } catch (error: any) {
      console.error("Failed to leave group:", error);
      let errorMessage = "Fehler beim Verlassen der Gruppe.";
      if (
        error.data ===
          "Creator must transfer creator status before leaving the group" ||
        (error.message && error.message.includes("Creator must transfer"))
      ) {
        errorMessage =
          "Du bist der Ersteller dieser Gruppe. Bitte übertrage zuerst die Gruppenleitung an ein anderes Mitglied, bevor du die Gruppe verlässt.";
      } else if (error.data) {
        errorMessage = error.data;
      } else if (error.message) {
        errorMessage = error.message;
      }
      alert(errorMessage);
    }
  };

  const handleTransferCreator = async (
    userId: Id<"users">,
    userName: string,
  ) => {
    if (
      !confirm(
        `Möchtest du die Gruppenleitung wirklich an ${userName} übertragen? Diese Aktion kann nicht rückgängig gemacht werden und du verlierst deine Inhaber-Rechte.`,
      )
    )
      return;
    try {
      await transferCreator({
        conversationId,
        currentCreatorId: currentUserId,
        newCreatorId: userId,
      });
      window.location.reload();
    } catch (error) {
      console.error("Failed to transfer creator:", error);
      alert("Fehler beim Übertragen der Gruppenleitung.");
    }
  };

  const handleClaim = async () => {
    try {
      await claimGroup({
        conversationId,
        userId: currentUserId,
      });
      window.location.reload();
    } catch (error) {
      console.error("Failed to claim group:", error);
      alert(
        "Fehler beim Übernehmen der Gruppe. Möglicherweise hat sie bereits einen Admin.",
      );
    }
  };

  const handleDeleteGroup = async () => {
    if (
      !confirm(
        "Möchtest du diese Gruppe wirklich PERMANENT löschen? Diese Aktion kann nicht rückgängig gemacht werden und löscht alle Nachrichten und Daten für ALLE Mitglieder.",
      )
    )
      return;

    if (
      !confirm(
        "Bist du SICHER? Die Gruppe und alle Nachrichten werden unwiderruflich gelöscht!",
      )
    )
      return;

    try {
      await deleteConversation({
        conversationId,
        userId: currentUserId,
      });
      onClose();
      router.push("/chat");
    } catch (error) {
      console.error("Failed to delete group:", error);
      alert("Fehler beim Löschen der Gruppe.");
    }
  };

  const hasAdmins = members?.some(
    (m) => m.role === "admin" || m.role === "creator",
  );

  const handleClose = () => {
    setView("list");
    setSearchQuery("");
    onClose();
  };

  if (!members) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        hideCloseButton
        className="w-[90vw] sm:w-[80vw] max-w-[500px] max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-card text-card-foreground gap-0"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card z-10">
          {view === "list" ? (
            <>
              <DialogTitle className="text-lg font-semibold">
                Gruppenmitglieder
              </DialogTitle>
              <button
                onClick={handleClose}
                className="p-2 -mr-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
              >
                <X size={20} />
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setView("list")}
                  className="p-2 -ml-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <DialogTitle className="text-lg font-semibold">
                  Mitglied hinzufügen
                </DialogTitle>
              </div>
              <button
                onClick={handleClose}
                className="p-2 -mr-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
              >
                <X size={20} />
              </button>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-0 bg-card">
          {view === "list" ? (
            <div className="flex flex-col">
              {!hasAdmins && (
                <div className="p-4 bg-yellow-500/10 border-b border-yellow-500/20">
                  <p className="text-sm text-yellow-700 mb-2">
                    Diese Gruppe hat keinen Admin. Du kannst sie übernehmen.
                  </p>
                  <Button
                    onClick={handleClaim}
                    variant="outline"
                    size="sm"
                    className="w-full border-yellow-500/30 text-yellow-700 hover:bg-yellow-500/20"
                  >
                    Gruppe übernehmen
                  </Button>
                </div>
              )}

              {iAmAdmin &&
                allUsers &&
                members &&
                allUsers.filter(
                  (u) =>
                    !members.some((m) => m._id === u._id && m.role !== "left"),
                ).length > 0 && (
                  <button
                    onClick={() => setView("add")}
                    className="flex items-center p-4 hover:bg-accent transition-colors border-b border-border text-foreground font-medium"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#D08945] text-white flex items-center justify-center mr-3">
                      <UserPlus size={20} />
                    </div>
                    Mitglied hinzufügen
                  </button>
                )}

              <div className="px-4 py-2 bg-muted text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Aktuelle Mitglieder
              </div>
              {members
                .filter((m) => m.role !== "left")
                .map((member) => (
                  <div
                    key={member._id}
                    className="flex items-center p-4 hover:bg-accent border-b border-border last:border-0"
                  >
                    <div
                      className="w-10 h-10 rounded-full overflow-hidden mr-3 flex-shrink-0 relative"
                      style={{ backgroundColor: "rgba(0, 0, 0, 0.2)" }}
                    >
                      {member.image ? (
                        <img
                          src={member.image}
                          alt={member.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center font-bold text-muted-foreground"
                          style={{ color: "#000000" }}
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate">
                          {member.name}
                        </span>
                        {member.role === "creator" && (
                          <div className="flex items-center gap-1 bg-[#D08945] text-white px-2 py-0.5 rounded-full">
                            <Sparkles size={13} />
                            <span className="text-xs font-medium">Inhaber</span>
                          </div>
                        )}
                        {member.role === "admin" && (
                          <div className="flex items-center gap-1 bg-[#D08945] text-white px-2 py-0.5 rounded-full">
                            <Star size={13} />
                            <span className="text-xs font-medium">Admin</span>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        @{member.username}
                      </div>
                    </div>

                    {iAmAdmin && member._id !== currentUserId && (
                      <div className="flex items-center gap-1">
                        {iAmCreator && member.role !== "creator" && (
                          <button
                            onClick={() =>
                              handleTransferCreator(member._id, member.name)
                            }
                            className="p-2 text-muted-foreground hover:text-yellow-600 hover:bg-yellow-500/10 rounded-full transition-colors"
                            title="Gruppenleitung übertragen"
                          >
                            <Sparkles size={18} />
                          </button>
                        )}
                        {member.role === "member" && (
                          <button
                            onClick={() => handlePromote(member._id)}
                            className="p-2 text-muted-foreground hover:text-[#D08945]"
                            title="Zum Admin machen"
                          >
                            <Star size={18} />
                          </button>
                        )}
                        {member.role === "admin" && (
                          <button
                            onClick={() => handleDemote(member._id)}
                            className="p-2 text-[#D08945]"
                            title="Admin entfernen"
                          >
                            <StarOff size={18} />
                          </button>
                        )}
                        {member.role !== "creator" && (
                          <button
                            onClick={() => handleRemoveMember(member._id)}
                            className="p-2 text-muted-foreground hover:text-[#D08945]"
                            title="Entfernen"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}

              {members.some((m) => m.role === "left") && (
                <>
                  <div className="px-4 py-2 bg-muted text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">
                    Ehemalige Mitglieder
                  </div>
                  {members
                    .filter((m) => m.role === "left")
                    .map((member) => (
                      <div
                        key={member._id}
                        className="flex items-center p-4 hover:bg-accent border-b border-border last:border-0 opacity-60"
                      >
                        <div
                          className="w-10 h-10 rounded-full overflow-hidden mr-3 flex-shrink-0 relative"
                          style={{ backgroundColor: "rgba(0, 0, 0, 0.2)" }}
                        >
                          {member.image ? (
                            <img
                              src={member.image}
                              alt={member.name}
                              className="w-full h-full object-cover grayscale"
                            />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center font-bold text-muted-foreground"
                              style={{ color: "#000000" }}
                            >
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 mr-2">
                          <div className="flex items-center gap-1">
                            <span className="font-semibold truncate text-muted-foreground">
                              {member.name}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            @{member.username}
                          </div>
                        </div>
                      </div>
                    ))}
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Suchen..."
                    className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-xl outline-none focus:ring-1 focus:ring-[#8C531E] text-sm text-foreground placeholder:text-muted-foreground"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {availableUsers.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    Keine Nutzer gefunden
                  </div>
                ) : (
                  availableUsers.map((user) => (
                    <button
                      key={user._id}
                      onClick={() => handleAddMember(user._id)}
                      className="w-full flex items-center p-4 hover:bg-accent border-b border-border text-left transition-colors"
                    >
                      <div
                        className="w-10 h-10 rounded-full overflow-hidden mr-3 flex-shrink-0"
                        style={{ backgroundColor: "rgba(0, 0, 0, 0.2)" }}
                      >
                        {user.image ? (
                          <img
                            src={user.image}
                            alt={user.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center font-bold text-muted-foreground"
                            style={{ color: "#000000" }}
                          >
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-foreground">
                          {user.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          @{user.username}
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-[#D08945] text-white flex items-center justify-center">
                        <UserPlus size={16} />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {view === "list" &&
          members.some(
            (m) => m._id === currentUserId && m.role !== "creator",
          ) && (
            <div className="p-4 border-t border-border bg-card">
              <Button
                onClick={handleLeave}
                variant="destructive"
                className="w-full bg-red-100 text-red-600 hover:bg-red-200 border-0"
              >
                Gruppe verlassen
              </Button>
            </div>
          )}

        {view === "list" && iAmCreator && (
          <div className="p-4 border-t border-border bg-card">
            <Button
              onClick={handleDeleteGroup}
              variant="destructive"
              className="w-full bg-red-600 text-white hover:bg-red-700"
            >
              Gruppe löschen
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
