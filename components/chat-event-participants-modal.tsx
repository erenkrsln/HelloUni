"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Check, HelpCircle, X as XIcon, Clock, CalendarDays } from "lucide-react";

interface ChatEventParticipantsModalProps {
    isOpen: boolean;
    onClose: () => void;
    chatEventId: Id<"chatEvents">;
    slotIndex: number | null;
}

export function ChatEventParticipantsModal({ isOpen, onClose, chatEventId, slotIndex }: ChatEventParticipantsModalProps) {
    const chatEvent = useQuery(api.chatEvents.getChatEvent, { chatEventId });
    const votes = useQuery(api.chatEvents.getChatEventVotes, { chatEventId });
    
    // Fetch group members based on the conversation linked to the event
    const members = useQuery(api.queries.getConversationMembers, chatEvent ? { conversationId: chatEvent.conversationId } : "skip");

    if (!chatEvent || !votes || !members || slotIndex === null) return null;

    const slotVotes = votes.filter(v => v.slotIndex === slotIndex);
    
    // Categorize members based on their vote
    const yesUsers = members.filter(m => slotVotes.find(v => v.userId === m._id)?.vote === "yes");
    const maybeUsers = members.filter(m => slotVotes.find(v => v.userId === m._id)?.vote === "maybe");
    const noUsers = members.filter(m => slotVotes.find(v => v.userId === m._id)?.vote === "no");
    
    const votedUserIds = slotVotes.map(v => v.userId);
    const noVoteUsers = members.filter(m => !votedUserIds.includes(m._id));

    const slot = chatEvent.timeSlots[slotIndex];
    const formatSlotDate = (startMs: number) => {
        const d = new Date(startMs);
        return d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
    };

    const formatSlotTime = (startMs: number, endMs: number) => {
        const d1 = new Date(startMs);
        const d2 = new Date(endMs);
        return `${d1.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} - ${d2.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`;
    };

    const UserList = ({ users, label, icon: Icon, colorClass }: { users: typeof members, label: string, icon: any, colorClass: string }) => {
        if (users.length === 0) return null;
        return (
            <div className="mb-6">
                <div className={`flex items-center gap-2 mb-3 ${colorClass}`}>
                    <Icon size={18} />
                    <h3 className="font-semibold text-sm">{label} ({users.length})</h3>
                </div>
                <div className="space-y-3">
                    {users.map(user => (
                        <div key={user._id} className="flex items-center gap-3 bg-gray-50 border border-gray-100 p-2.5 rounded-xl">
                            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-white shadow-sm flex items-center justify-center">
                                {user.image ? (
                                    <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs font-bold bg-[#f2ebd9] text-[#8C531E]">
                                        {user.name?.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <span className="text-sm font-medium text-gray-800">{user.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[400px] w-[95vw] bg-white rounded-3xl p-5 border-0 shadow-2xl">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <CalendarDays className="text-[#D08945]" size={20} />
                        Teilnehmer
                    </DialogTitle>
                </DialogHeader>
                
                <div className="bg-[#fdFAF5] p-3 rounded-xl border border-orange-100/50 mb-4">
                    <p className="font-semibold text-orange-900 text-sm">
                        {formatSlotDate(slot.startTime)}
                    </p>
                    <p className="text-xs text-orange-700/80 font-medium">
                        {formatSlotTime(slot.startTime, slot.endTime)}
                    </p>
                </div>

                <div className="max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                    <UserList 
                        users={yesUsers} 
                        label="Zusagen" 
                        icon={Check} 
                        colorClass="text-emerald-600" 
                    />
                    <UserList 
                        users={maybeUsers} 
                        label="Vielleicht" 
                        icon={HelpCircle} 
                        colorClass="text-amber-600" 
                    />
                    <UserList 
                        users={noUsers} 
                        label="Absagen" 
                        icon={XIcon} 
                        colorClass="text-red-500" 
                    />
                    <UserList 
                        users={noVoteUsers} 
                        label="Noch keine Antwort" 
                        icon={Clock} 
                        colorClass="text-gray-400" 
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
