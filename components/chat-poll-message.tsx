"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { BarChart2, CheckSquare, Square, Clock } from "lucide-react";
import { useState } from "react";

interface ChatPollMessageProps {
    chatPollId: Id<"chatPolls">;
    currentUserId: Id<"users">;
    isMe: boolean;
}

export function ChatPollMessage({ chatPollId, currentUserId, isMe }: ChatPollMessageProps) {
    const poll = useQuery(api.queries.getChatPoll, { chatPollId });
    const results = useQuery(api.queries.getChatPollResults, { chatPollId });
    const myVotes = useQuery(api.queries.getChatPollVote, { chatPollId, userId: currentUserId });
    const voteChatPoll = useMutation(api.mutations.voteChatPoll);

    const [isVoting, setIsVoting] = useState(false);
    const [optimisticMyVotes, setOptimisticMyVotes] = useState<number[] | null>(null);

    if (!poll) return (
        <div className="min-w-[220px] h-20 rounded-2xl animate-pulse bg-black/10" />
    );

    const isClosed = !!poll.closeAt && Date.now() >= poll.closeAt;
    const currentMyVotes = optimisticMyVotes ?? myVotes ?? [];
    const totalVoters = results?.totalVoters ?? 0;
    const optionResults = results?.results ?? poll.options.map(() => 0);
    const totalOptimisticVotes = optionResults.reduce((a, b) => a + b, 0);

    const handleVote = async (index: number) => {
        if (isVoting || isClosed) return;

        let newVotes: number[];
        if (poll.allowMultiple) {
            newVotes = currentMyVotes.includes(index)
                ? currentMyVotes.filter(i => i !== index)
                : [...currentMyVotes, index];
        } else {
            newVotes = currentMyVotes.includes(index) ? [] : [index];
        }

        setOptimisticMyVotes(newVotes);
        setIsVoting(true);
        try {
            await voteChatPoll({ chatPollId, userId: currentUserId, optionIndices: newVotes });
        } catch {
            setOptimisticMyVotes(myVotes ?? []);
        } finally {
            setIsVoting(false);
        }
    };

    return (
        <div className="min-w-[220px]">
            {/* Badge row */}
            <div className="flex items-center gap-1.5 mb-2">
                <BarChart2 size={12} className="text-[#D08945] flex-shrink-0" />
                <span className="text-[10px] font-bold text-[#D08945] uppercase tracking-wider">
                    {poll.allowMultiple ? "Umfrage" : "Umfrage"}
                </span>
                {isClosed && (
                    <span className="ml-auto text-[9px] font-semibold text-white bg-black/30 rounded-full px-1.5 py-0.5 leading-none">
                        Beendet
                    </span>
                )}
            </div>

            {/* Question */}
            <p className="text-sm font-semibold leading-snug mb-3">
                {poll.question}
            </p>

            {/* Options */}
            <div className="space-y-2">
                {poll.options.map((option, index) => {
                    const isSelected = currentMyVotes.includes(index);
                    const count = optionResults[index] ?? 0;
                    const percentage = totalOptimisticVotes > 0
                        ? Math.round((count / totalOptimisticVotes) * 100)
                        : 0;

                    return (
                        <button
                            key={index}
                            onClick={() => handleVote(index)}
                            disabled={isVoting || isClosed}
                            className={`w-full text-left rounded-xl relative overflow-hidden transition-all duration-150
                                ${!isClosed ? "active:scale-[0.98]" : "cursor-default"}
                                ${isSelected ? "ring-1 ring-[#D08945] ring-inset" : ""}
                            `}
                        >
                            {/* Progress fill */}
                            <div
                                className={`absolute inset-y-0 left-0 transition-all duration-500 rounded-xl
                                    ${isSelected ? "bg-[#D08945]/20" : "bg-black/8"}
                                `}
                                style={{ width: `${percentage}%`, backgroundColor: isSelected ? "rgba(208,137,69,0.18)" : "rgba(0,0,0,0.07)" }}
                            />

                            {/* Content */}
                            <div className="relative flex items-center gap-2 px-3 py-2.5">
                                {/* Indicator */}
                                <div className={`flex-shrink-0 ${isSelected ? "text-[#D08945]" : "opacity-35"}`}>
                                    {poll.allowMultiple ? (
                                        isSelected ? <CheckSquare size={14} /> : <Square size={14} />
                                    ) : (
                                        <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center
                                            ${isSelected ? "border-[#D08945]" : "border-current"}`}
                                        >
                                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#D08945]" />}
                                        </div>
                                    )}
                                </div>

                                {/* Label */}
                                <span className={`text-xs flex-1 leading-snug ${isSelected ? "font-semibold" : "opacity-75"}`}>
                                    {option}
                                </span>

                                {/* Percentage */}
                                <span className={`text-[10px] font-bold flex-shrink-0 tabular-nums
                                    ${isSelected ? "text-[#D08945]" : "opacity-40"}`}
                                >
                                    {percentage}%
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="flex items-start gap-1.5 mt-2.5">
                <span className="text-[10px] opacity-50 leading-snug">

                    {poll.closeAt && !isClosed && (
                        <> {formatCloseDate(poll.closeAt)}</>
                    )}
                </span>
            </div>
        </div>
    );
}

function formatCloseDate(closeAt: number): string {
    const closeDate = new Date(closeAt);
    const now = new Date();
    const time = closeDate.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

    const closeDay = new Date(closeDate.getFullYear(), closeDate.getMonth(), closeDate.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    let dateLabel: string;
    if (closeDay.getTime() === today.getTime()) {
        dateLabel = "heute";
    } else if (closeDay.getTime() === tomorrow.getTime()) {
        dateLabel = "morgen";
    } else {
        dateLabel = "am " + closeDate.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
    }

    return `Endet ${dateLabel} um ${time} Uhr`;
}
