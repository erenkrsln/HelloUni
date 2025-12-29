"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Search, UserPlus, Trash2, X, Star, StarOff, Sparkles } from "lucide-react";

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

    const members = useQuery(api.queries.getConversationMembers, { conversationId });
    const allUsers = useQuery(api.queries.getAllUsers);

    const addMember = useMutation(api.mutations.addConversationMember);
    const removeMember = useMutation(api.mutations.removeConversationMember);
    const promoteToAdmin = useMutation(api.mutations.promoteToAdmin);
    const demoteAdmin = useMutation(api.mutations.demoteAdmin);
    const claimGroup = useMutation(api.mutations.claimGroupOwnership);
    const transferCreator = useMutation(api.mutations.transferCreator);
    const deleteConversation = useMutation(api.mutations.deleteConversation);

    const myself = members?.find(m => m._id === currentUserId);
    const iAmCreator = myself?.role === "creator";
    const iAmAdmin = myself?.role === "admin" || myself?.role === "creator";

    const availableUsers = allUsers?.filter(u =>
        !members?.some(m => m._id === u._id && m.role !== 'left') &&
        (u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.username.toLowerCase().includes(searchQuery.toLowerCase()))
    ) || [];

    const handleAddMember = async (userId: Id<"users">) => {
        try {
            await addMember({
                conversationId,
                adminId: currentUserId,
                newMemberId: userId,
            });
            setView("list");
        } catch (error) {
            console.error("Failed to add member:", error);
        }
    };

    const handleRemoveMember = async (userId: Id<"users">) => {
        if (!confirm("Möchtest du dieses Mitglied wirklich entfernen?")) return;
        try {
            await removeMember({
                conversationId,
                adminId: currentUserId,
                memberIdToRemove: userId,
            });
        } catch (error) {
            console.error("Failed to remove member:", error);
        }
    };

    const handlePromote = async (userId: Id<"users">) => {
        try {
            await promoteToAdmin({
                conversationId,
                adminId: currentUserId,
                memberIdToPromote: userId,
            });
        } catch (error) {
            console.error("Failed to promote member:", error);
        }
    };

    const handleDemote = async (userId: Id<"users">) => {
        try {
            await demoteAdmin({
                conversationId,
                adminId: currentUserId,
                memberIdToDemote: userId,
            });
        } catch (error) {
            console.error("Failed to demote member:", error);
        }
    };

    const leaveGroup = useMutation(api.mutations.leaveGroup);

    const handleLeave = async () => {
        if (!confirm("Möchtest du die Gruppe wirklich verlassen? Du kannst danach keine Nachrichten mehr senden.")) return;
        try {
            await leaveGroup({
                conversationId,
                userId: currentUserId,
            });
            onClose();
        } catch (error) {
            console.error("Failed to leave group:", error);
            alert("Fehler beim Verlassen der Gruppe.");
        }
    };

    const handleTransferCreator = async (userId: Id<"users">, userName: string) => {
        if (!confirm(`Möchtest du die Gruppenleitung wirklich an ${userName} übertragen? Diese Aktion kann nicht rückgängig gemacht werden und du verlierst deine Inhaber-Rechte.`)) return;
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
            alert("Fehler beim Übernehmen der Gruppe. Möglicherweise hat sie bereits einen Admin.");
        }
    };

    const handleDeleteGroup = async () => {
        if (!confirm("Möchtest du diese Gruppe wirklich PERMANENT löschen? Diese Aktion kann nicht rückgängig gemacht werden und löscht alle Nachrichten und Daten für ALLE Mitglieder.")) return;

        if (!confirm("Bist du SICHER? Die Gruppe und alle Nachrichten werden unwiderruflich gelöscht!")) return;

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

    const hasAdmins = members?.some(m => m.role === "admin" || m.role === "creator");

    const handleClose = () => {
        setView("list");
        setSearchQuery("");
        onClose();
    };

    if (!members) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="w-[90vw] sm:w-[80vw] max-w-[500px] max-h-[85vh] overflow-y-auto flex flex-col p-3 sm:p-6">
                <div className="p-4 border-b flex items-center justify-between bg-white z-10">
                    {view === "list" ? (
                        <div className="flex items-center gap-2">
                            <DialogTitle className="text-xl font-semibold">Gruppenmitglieder</DialogTitle>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button onClick={() => setView("list")} className="mr-2">
                                <X size={20} />
                            </button>
                            <DialogTitle className="text-lg font-bold">Mitglied hinzufügen</DialogTitle>
                        </div>
                    )}


                </div>

                <div className="flex-1 overflow-y-auto p-0 bg-white">
                    {view === "list" ? (
                        <div className="flex flex-col">
                            {!hasAdmins && (
                                <div className="p-4 bg-yellow-50 border-b border-yellow-100">
                                    <p className="text-sm text-yellow-800 mb-2">Diese Gruppe hat keinen Admin. Du kannst sie übernehmen.</p>
                                    <Button onClick={handleClaim} variant="outline" size="sm" className="w-full border-yellow-200 text-yellow-800 hover:bg-yellow-100">
                                        Gruppe übernehmen
                                    </Button>
                                </div>
                            )}

                            {iAmAdmin && allUsers && members && allUsers.filter(u => !members.some(m => m._id === u._id && m.role !== 'left')).length > 0 && (
                                <button
                                    onClick={() => setView("add")}
                                    className="flex items-center p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 text-black font-medium"
                                >
                                    <div className="w-10 h-10 rounded-full bg-[#D08945] text-white flex items-center justify-center mr-3">
                                        <UserPlus size={20} />
                                    </div>
                                    Mitglied hinzufügen
                                </button>
                            )}

                            {/* Active Members */}
                            <div className="px-4 py-2 bg-gray-100 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Aktuelle Mitglieder
                            </div>
                            {members.filter(m => m.role !== 'left').map(member => (
                                <div key={member._id} className="flex items-center p-4 hover:bg-gray-50 border-b border-gray-50 last:border-0">
                                    <div className="w-10 h-10 rounded-full overflow-hidden mr-3 flex-shrink-0 relative" style={{ backgroundColor: "rgba(0, 0, 0, 0.2)" }}>
                                        {member.image ? (
                                            <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center font-bold text-gray-500" style={{ color: "#000000" }}>
                                                {member.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold truncate">{member.name}</span>

                                            {/* Inhaber Badge */}
                                            {member.role === "creator" && (
                                                <div className="flex items-center gap-1 bg-[#D08945] text-white px-2 py-0.5 rounded-full">
                                                    <Sparkles size={13} />
                                                    <span className="text-xs font-medium">Inhaber</span>
                                                </div>
                                            )}

                                            {/* Admin Badge */}
                                            {member.role === "admin" && (
                                                <div className="flex items-center gap-1 bg-[#D08945] text-white px-2 py-0.5 rounded-full">
                                                    <Star size={13} />
                                                    <span className="text-xs font-medium">Admin</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="text-xs text-gray-500 mt-0.5">@{member.username}</div>
                                    </div>

                                    {/* Admin Actions */}
                                    {iAmAdmin && member._id !== currentUserId && (
                                        <div className="flex items-center gap-1">
                                            {/* Transfer Creator (only visible to creator) */}
                                            {iAmCreator && member.role !== "creator" && (
                                                <button
                                                    onClick={() => handleTransferCreator(member._id, member.name)}
                                                    className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-full transition-colors"
                                                    title="Gruppenleitung übertragen"
                                                >
                                                    <Sparkles size={18} />
                                                </button>
                                            )}
                                            {member.role === "member" && (
                                                <button
                                                    onClick={() => handlePromote(member._id)}
                                                    className="p-2 text-gray-400 hover:text-[#D08945] "
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
                                                    className="p-2 text-gray-400 hover:text-[#D08945]"
                                                    title="Entfernen"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Previous Members */}
                            {members.some(m => m.role === 'left') && (
                                <>
                                    <div className="px-4 py-2 bg-gray-100 text-xs font-semibold text-gray-700 uppercase tracking-wider mt-2">
                                        Ehemalige Mitglieder
                                    </div>
                                    {members.filter(m => m.role === 'left').map(member => (
                                        <div key={member._id} className="flex items-center p-4 hover:bg-gray-50 border-b border-gray-50 last:border-0 opacity-60">
                                            <div className="w-10 h-10 rounded-full overflow-hidden mr-3 flex-shrink-0 relative" style={{ backgroundColor: "rgba(0, 0, 0, 0.2)" }}>
                                                {member.image ? (
                                                    <img src={member.image} alt={member.name} className="w-full h-full object-cover grayscale" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center font-bold text-gray-500" style={{ color: "#000000" }}>
                                                        {member.name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 mr-2">
                                                <div className="flex items-center gap-1">
                                                    <span className="font-semibold truncate text-gray-600">{member.name}</span>
                                                </div>
                                                <div className="text-xs text-gray-500">@{member.username}</div>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            <div className="p-4 border-b">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Suchen..."
                                        className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-xl outline-none focus:ring-1 focus:ring-[#8C531E] text-sm"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {availableUsers.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400 text-sm">
                                        Keine Nutzer gefunden
                                    </div>
                                ) : (
                                    availableUsers.map(user => (
                                        <button
                                            key={user._id}
                                            onClick={() => handleAddMember(user._id)}
                                            className="w-full flex items-center p-4 hover:bg-gray-50 border-b border-gray-50 text-left transition-colors"
                                        >
                                            <div className="w-10 h-10 rounded-full overflow-hidden mr-3 flex-shrink-0" style={{ backgroundColor: "rgba(0, 0, 0, 0.2)" }}>
                                                {user.image ? (
                                                    <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center font-bold text-gray-500" style={{ color: "#000000" }}>
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-medium text-black">{user.name}</div>
                                                <div className="text-xs text-gray-500">@{user.username}</div>
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

                {view === "list" && !iAmAdmin && members.some(m => m._id === currentUserId && m.role !== "creator") && (
                    <div className="p-4 border-t bg-gray-50">
                        <Button onClick={handleLeave} variant="destructive" className="w-full bg-red-100 text-red-600 hover:bg-red-200 border-0">
                            Gruppe verlassen
                        </Button>
                    </div>
                )}

                {view === "list" && iAmCreator && (
                    <div className="p-4 border-t bg-gray-50">
                        <Button onClick={handleDeleteGroup} variant="destructive" className="w-full bg-red-600 text-white hover:bg-red-700">
                            Gruppe löschen
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
