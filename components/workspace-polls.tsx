"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Plus, BarChart2, Check, Edit2 } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useToast } from "@/components/toast";
import { PollEditModal } from "@/components/poll-edit-modal";
import { SectionHeader } from "@/components/section-header";

export function WorkspacePolls({
  workspaceId,
  onBackToOverview,
}: {
  workspaceId: string;
  onBackToOverview?: () => void;
}) {
  const { currentUser } = useCurrentUser();
  const toast = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [editingPollId, setEditingPollId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const polls = useQuery(api.workspace.listPollsByWorkspace, { workspaceId });
  const createPoll = useMutation(api.workspace.createPoll);
  const votePoll = useMutation(api.workspace.votePoll);

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !currentUser) return;

    // Filter empty options
    const validOptions = options.filter((opt) => opt.trim());
    if (validOptions.length < 2) {
      toast.error("Eine Umfrage benötigt mindestens zwei Optionen.");
      return;
    }

    try {
      await createPoll({
        workspaceId,
        question: question.trim(),
        options: validOptions,
        createdBy: currentUser._id,
      });
      setIsCreating(false);
      setQuestion("");
      setOptions(["", ""]);
    } catch (error) {
      console.error(error);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const calculatePercentage = (pollVotes: any[], optionIndex: number) => {
    if (!pollVotes || pollVotes.length === 0) return 0;
    const optionVotes = pollVotes.filter(
      (v) => v.optionIndex === optionIndex,
    ).length;
    return Math.round((optionVotes / pollVotes.length) * 100);
  };

  const hasUserVotedFor = (pollVotes: any[], optionIndex: number): boolean => {
    if (!currentUser) return false;
    return pollVotes.some(
      (v) => v.userId === currentUser._id && v.optionIndex === optionIndex,
    );
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background px-4 py-6">
      <div className="max-w-lg mx-auto space-y-4">
        {onBackToOverview && (
          <SectionHeader
            title="Polls"
            subtitle="Erstelle Umfragen und stimme über Gruppenentscheidungen ab"
            onBackClick={onBackToOverview}
          />
        )}

        <div className="flex justify-between items-center mb-6 px-1">
          {!onBackToOverview && (
            <h2 className="font-bold text-lg text-slate-900">Aktive Umfragen</h2>
          )}
          {!isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="bg-[#D08945] text-white px-4 py-2 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold hover:bg-[#b07335] transition-all active:scale-95 shadow-sm min-h-[38px]"
            >
              <Plus size={18} /> Neue Umfrage
            </button>
          )}
        </div>

        {isCreating && (
          <form
            onSubmit={handleCreatePoll}
            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6 space-y-4"
          >
            <input
              type="text"
              placeholder="Stelle eine Frage..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full font-bold bg-transparent border-b border-slate-200 outline-none pb-2 text-slate-900 focus:border-[#D08945] text-base"
            />
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <input
                  key={idx}
                  type="text"
                  placeholder={`Option ${idx + 1}`}
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#D08945]/20 text-sm text-slate-900"
                />
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <button
                type="button"
                onClick={() => setOptions([...options, ""])}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors"
              >
                + Option hinzufügen
              </button>
              <div className="flex-1"></div>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={
                  !question.trim() || options.filter((o) => o.trim()).length < 2
                }
                className="px-4 py-2 text-sm font-semibold text-white bg-[#D08945] rounded-2xl hover:bg-[#b07335] disabled:opacity-50 transition-all active:scale-95"
              >
                Umfrage starten
              </button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {!polls ? (
            <div className="text-center text-slate-500 p-8 font-medium">
              Umfragen werden geladen...
            </div>
          ) : polls.length === 0 && !isCreating ? (
            <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200 border-dashed shadow-sm">
              <BarChart2 className="w-12 h-12 mx-auto mb-2 opacity-20 text-[#D08945]" />
              <p className="text-sm font-semibold text-slate-500">
                Keine aktiven Umfragen. <br /> Stelle der Gruppe eine Frage!
              </p>
            </div>
          ) : (
            polls.map((poll) => {
              const totalVotes = poll.votes.length;
              const editingPoll =
                editingPollId === poll._id.toString() ? poll : null;

              return (
                <div
                  key={poll._id}
                  className="group bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative"
                >
                  <div className="flex justify-between items-start mb-4 gap-4">
                    <h3 className="font-bold text-slate-900 flex-1 text-base">
                      {poll.question}
                    </h3>
                    {currentUser && poll.createdBy === currentUser._id && (
                      <button
                        onClick={() => setEditingPollId(poll._id.toString())}
                        className="p-2 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
                        title="Umfrage bearbeiten"
                      >
                        <Edit2 size={16} className="text-[#D08945]" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {poll.options.map((option, idx) => {
                      const percentage = calculatePercentage(poll.votes, idx);
                      const voted = hasUserVotedFor(poll.votes, idx);
                      const isWinning =
                        percentage > 0 &&
                        Math.max(
                          ...poll.options.map((_, i) =>
                            calculatePercentage(poll.votes, i),
                          ),
                        ) === percentage;

                      return (
                        <div
                          key={idx}
                          onClick={() =>
                            currentUser &&
                            votePoll({
                              pollId: poll._id,
                              userId: currentUser._id,
                              optionIndex: idx,
                            })
                          }
                          className={`relative overflow-hidden rounded-2xl border p-3.5 cursor-pointer transition-colors ${voted ? "border-[#D08945] bg-orange-50/40" : "border-slate-200 hover:bg-slate-50"}`}
                        >
                          <div
                            className={`absolute left-0 top-0 bottom-0 transition-all duration-500 ${voted || isWinning ? "bg-[#D08945] opacity-10" : "bg-slate-200 opacity-50"}`}
                            style={{ width: `${percentage}%` }}
                          />
                          <div className="relative flex justify-between items-center z-10">
                            <div className="flex items-center gap-2">
                              {voted ? (
                                <Check size={16} className="text-[#D08945] stroke-[3]" />
                              ) : (
                                <div className="w-4 h-4 border rounded-full border-slate-300 bg-white" />
                              )}
                              <span
                                className={`text-sm ${voted ? "font-bold text-slate-900" : "text-slate-700 font-semibold"}`}
                              >
                                {option}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-slate-600">
                              {percentage}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-xs text-slate-400 mt-3 font-semibold">
                    {totalVotes} {totalVotes === 1 ? "Stimme" : "Stimmen"}
                  </div>

                  {editingPoll && currentUser && (
                    <PollEditModal
                      poll={editingPoll}
                      isOpen={!!editingPollId}
                      onClose={() => setEditingPollId(null)}
                      userId={currentUser._id}
                      hasVotes={totalVotes > 0}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
