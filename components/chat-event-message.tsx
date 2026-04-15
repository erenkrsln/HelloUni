"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { CalendarDays, Check, HelpCircle, X as XIcon } from "lucide-react";
import { useState, useEffect } from "react";

interface ChatEventMessageProps {
    chatEventId: Id<"chatEvents">;
    currentUserId: Id<"users">;
    isMe: boolean;
}

export function ChatEventMessage({ chatEventId, currentUserId, isMe }: ChatEventMessageProps) {
    const chatEvent = useQuery(api.chatEvents.getChatEvent, { chatEventId });
    const votes = useQuery(api.chatEvents.getChatEventVotes, { chatEventId });

    const voteChatEvent = useMutation(api.chatEvents.voteChatEvent);
    const confirmChatEvent = useMutation(api.chatEvents.confirmChatEvent);

    const [isVoting, setIsVoting] = useState(false);
    const [now, setNow] = useState(Date.now());

    const isConfirmed = chatEvent?.confirmedTimeSlotIndex !== undefined;

    useEffect(() => {
        if (!chatEvent || !isConfirmed) return;
        const confirmedStartTime = chatEvent.timeSlots[chatEvent.confirmedTimeSlotIndex!].startTime;
        if (now >= confirmedStartTime) return;

        const interval = setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => clearInterval(interval);
    }, [isConfirmed, chatEvent, now]);

    if (!chatEvent || !votes) return (
        <div className="min-w-[240px] h-32 rounded-2xl animate-pulse bg-black/10" />
    );

    const isCreator = currentUserId === chatEvent.creatorId;
    const isClosed = isConfirmed && now >= chatEvent.timeSlots[chatEvent.confirmedTimeSlotIndex!].startTime;

    const handleVote = async (slotIndex: number, vote: "yes" | "maybe" | "no") => {
        if (isVoting) return;
        setIsVoting(true);
        try {
            await voteChatEvent({ chatEventId, userId: currentUserId, slotIndex, vote });
        } catch (error) {
            console.error("Failed to vote:", error);
        } finally {
            setIsVoting(false);
        }
    };

    const handleConfirm = async (slotIndex: number) => {
        if (isVoting || isConfirmed || !isCreator) return;
        setIsVoting(true);
        try {
            await confirmChatEvent({ chatEventId, userId: currentUserId, slotIndex });
        } catch (error) {
            console.error("Failed to confirm event:", error);
        } finally {
            setIsVoting(false);
        }
    };

    const formatSlotDate = (startMs: number) => {
        const d = new Date(startMs);
        return d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
    };

    const formatSlotTime = (startMs: number, endMs: number) => {
        const d1 = new Date(startMs);
        const d2 = new Date(endMs);
        return `${d1.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} - ${d2.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`;
    };

    return (
        <div className="min-w-[260px] max-w-[320px]">
            <div className="flex items-center gap-1.5 mb-2">
                <CalendarDays size={14} className="text-[#D08945] flex-shrink-0" />
                <span className="text-[10px] font-bold text-[#D08945] uppercase tracking-wider">
                    Terminfindung
                </span>
                {isConfirmed && (
                    <span className={`ml-auto text-[9px] uppercase tracking-wider font-semibold text-white ${isClosed ? 'bg-gray-400' : 'bg-gray-600'} rounded-full px-1.5 py-0.5 leading-none`}>
                        {isClosed ? 'Beendet' : 'Bestätigt'}
                    </span>
                )}
            </div>

            <p className="text-base font-bold leading-snug mb-1 text-gray-900">
                {chatEvent.title}
            </p>
            {chatEvent.description && (
                <p className="text-sm opacity-80 leading-snug mb-3">
                    {chatEvent.description}
                </p>
            )}

            <div className="space-y-3 mt-4">
                {chatEvent.timeSlots.map((slot, index) => {
                    const slotVotes = votes.filter(v => v.slotIndex === index);
                    const yesVotes = slotVotes.filter(v => v.vote === "yes");
                    const maybeVotes = slotVotes.filter(v => v.vote === "maybe");
                    const noVotes = slotVotes.filter(v => v.vote === "no");

                    const myVote = slotVotes.find(v => v.userId === currentUserId)?.vote;
                    const isWinningSlot = chatEvent.confirmedTimeSlotIndex === index;
                    const isOtherSlotConfirmed = isConfirmed && chatEvent.confirmedTimeSlotIndex !== index;

                    if (isOtherSlotConfirmed) return null;

                    return (
                        <div
                            key={index}
                            className={`rounded-xl border border-gray-200 overflow-hidden bg-white/70 transition-all ${(isWinningSlot || (myVote && !isConfirmed)) ? 'border-[#D08945]/30 shadow-sm' : ''}`}
                        >
                            <div className={`p-3 ${isWinningSlot ? 'bg-gray-100' : 'bg-gray-50/50'} border-b border-gray-100 flex justify-between items-start`}>
                                <div>
                                    <p className="font-semibold text-gray-900 text-sm">
                                        {formatSlotDate(slot.startTime)}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {formatSlotTime(slot.startTime, slot.endTime)}
                                    </p>
                                </div>
                                {!isConfirmed && isCreator && (
                                    <button
                                        onClick={() => handleConfirm(index)}
                                        disabled={isVoting}
                                        className="text-[10px] font-bold text-white bg-slate-900 px-3 py-1.5 rounded-full hover:bg-slate-800 transition-colors uppercase tracking-wider"
                                    >
                                        Bestätigen
                                    </button>
                                )}
                            </div>

                            <div className="p-2 space-y-2">
                                {/* Voting Buttons */}
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleVote(index, "yes")}
                                        disabled={isVoting || isClosed}
                                        className={`flex-1 flex justify-center items-center py-2 rounded-lg transition-all border ${myVote === 'yes' ? 'bg-emerald-100 border-emerald-200 text-emerald-800' : `bg-white border-gray-100 text-gray-400 ${!(isVoting || isClosed) ? 'hover:bg-emerald-50 hover:text-emerald-600' : ''}`} ${isClosed ? 'opacity-50 cursor-default' : ''}`}
                                    >
                                        <Check size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleVote(index, "maybe")}
                                        disabled={isVoting || isWinningSlot || isClosed}
                                        className={`flex-1 flex justify-center items-center py-2 rounded-lg transition-all border ${myVote === 'maybe' ? 'bg-amber-100 border-amber-200 text-amber-800' : `bg-white border-gray-100 text-gray-400 ${!(isVoting || isWinningSlot || isClosed) ? 'hover:bg-amber-50 hover:text-amber-600' : ''}`} ${(isWinningSlot || isClosed) ? 'opacity-50 cursor-default' : ''}`}
                                    >
                                        <HelpCircle size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleVote(index, "no")}
                                        disabled={isVoting || isClosed}
                                        className={`flex-1 flex justify-center items-center py-2 rounded-lg transition-all border ${myVote === 'no' ? 'bg-red-100 border-red-200 text-red-800' : `bg-white border-gray-100 text-gray-400 ${!(isVoting || isClosed) ? 'hover:bg-red-50 hover:text-red-600' : ''}`} ${isClosed ? 'opacity-50 cursor-default' : ''}`}
                                    >
                                        <XIcon size={16} />
                                    </button>
                                </div>

                                {/* Results */}
                                <div className="flex justify-between px-1 text-[11px] font-medium text-gray-500">
                                    <div className="flex gap-2">
                                        {yesVotes.length > 0 && <span className="text-emerald-600">{yesVotes.length + maybeVotes.length} Teilnehmer ({yesVotes.length} sicher)</span>}
                                        {yesVotes.length === 0 && maybeVotes.length > 0 && <span className="text-amber-600">{maybeVotes.length} Potentielle Teilnehmer</span>}
                                        {noVotes.length > 0 && <span className="text-red-600">{noVotes.length} Nein</span>}
                                        {slotVotes.length === 0 && <span className="opacity-50">Noch keine Stimmen</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
