"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { BarChart2 } from "lucide-react";
import { useState, useEffect } from "react";

interface ChatPollMessageProps {
    chatPollId: Id<"chatPolls">;
    currentUserId: Id<"users">;
    isMe: boolean;
}

export function ChatPollMessage({ chatPollId, currentUserId, isMe }: ChatPollMessageProps) {
    const poll = useQuery(api.queries.getChatPoll, { chatPollId });
    const results = useQuery(api.queries.getChatPollResults, { chatPollId });
    const myVotes = useQuery(api.queries.getChatPollVote, { chatPollId, userId: currentUserId });

    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        if (!poll?.closeAt) return;

        const interval = setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => clearInterval(interval);
    }, [poll?.closeAt]);
    const voteChatPoll = useMutation(api.mutations.voteChatPoll);

    const [isVoting, setIsVoting] = useState(false);
    const [optimisticMyVotes, setOptimisticMyVotes] = useState<number[] | null>(null);

    if (!poll) return (
        <div className="min-w-[220px] h-20 rounded-2xl animate-pulse bg-black/10" />
    );

    const isClosed = !!poll.closeAt && now >= poll.closeAt;
    const currentMyVotes = optimisticMyVotes ?? myVotes ?? [];
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
            <div className="flex items-center gap-1.5 mb-2">
                <BarChart2 size={12} className="text-[#D08945] flex-shrink-0" />
                <span className="text-[10px] font-bold text-[#D08945] uppercase tracking-wider">
                    Umfrage
                </span>
                {isClosed && (
                    <span className="ml-auto text-[9px] uppercase tracking-wider font-semibold text-white bg-gray-600 rounded-full px-1.5 py-0.5 leading-none">
                        Beendet
                    </span>
                )}
            </div>

            <p className="text-sm font-semibold leading-snug mb-3">
                {poll.question}
            </p>
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
                            className={`w-full text-left pb-3 pl-3 pr-3 rounded-lg border-2 transition-all ${isSelected
                                ? "border-[#D08945] bg-[#D08945]/20"
                                : "border-gray-200"
                                }`}
                        >
                            <div className="relative min-w-[220px] w-full max-w-[320px] flex items-center gap-2 px-3 py-2.5">
                                <span className={`text-xs flex-1 leading-snug ${isSelected ? "font-semibold" : "opacity-75"}`}>
                                    {option}
                                </span>

                                <span className={`text-xs tab ${isSelected ? "text-[#D08945]" : "opacity-40"}`}>
                                    {count} ({Math.round(percentage)}%)
                                </span>
                            </div>

                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-[#D08945] h-2 rounded-full transition-all"
                                    style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                                />
                            </div>
                        </button>
                    );
                })}
            </div>

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
