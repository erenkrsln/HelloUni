"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Plus, BarChart2, Check } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

export function WorkspacePolls({ workspaceId }: { workspaceId: string }) {
  const { currentUser } = useCurrentUser();
  const [isCreating, setIsCreating] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const polls = useQuery(api.workspace.listPollsByWorkspace, { workspaceId });
  const createPoll = useMutation(api.workspace.createPoll);
  const votePoll = useMutation(api.workspace.votePoll);

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !currentUser) return;
    
    // Filter empty options
    const validOptions = options.filter(opt => opt.trim());
    if (validOptions.length < 2) {
      alert("A poll needs at least two options.");
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
    const optionVotes = pollVotes.filter(v => v.optionIndex === optionIndex).length;
    return Math.round((optionVotes / pollVotes.length) * 100);
  };

  const hasUserVotedFor = (pollVotes: any[], optionIndex: number): boolean => {
    if (!currentUser) return false;
    return pollVotes.some(v => v.userId === currentUser._id && v.optionIndex === optionIndex);
  };

  return (
    <div className="p-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-semibold text-lg">Active Polls</h2>
        {!isCreating && (
          <button 
            onClick={() => setIsCreating(true)}
            className="bg-[#D08945] text-white px-4 py-2 rounded-full flex items-center justify-center gap-2 text-sm font-medium hover:bg-[#b07335] transition-colors"
          >
            <Plus size={18} /> New Poll
          </button>
        )}
      </div>

      {isCreating && (
        <form onSubmit={handleCreatePoll} className="bg-card p-4 rounded-xl shadow-sm border border-[#D08945]/20 mb-6">
          <input
            type="text"
            placeholder="Ask a question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full font-medium bg-transparent border-b border-border outline-none pb-2 mb-4 focus:border-[#D08945] text-foreground"
          />
          <div className="space-y-2 mb-4">
            {options.map((opt, idx) => (
              <input
                key={idx}
                type="text"
                placeholder={`Option ${idx + 1}`}
                value={opt}
                onChange={(e) => handleOptionChange(idx, e.target.value)}
                className="w-full bg-background border border-input text-foreground rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-[#D08945]"
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOptions([...options, ""])}
              className="px-3 py-1.5 text-xs font-medium text-foreground bg-muted rounded-lg hover:bg-accent"
            >
              + Add Option
            </button>
            <div className="flex-1"></div>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
              className="px-4 py-2 text-sm font-medium text-white bg-[#D08945] rounded-xl hover:bg-[#b07335] disabled:opacity-50"
            >
              Post Poll
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {!polls ? (
          <div className="text-center text-muted-foreground p-8">Loading polls...</div>
        ) : polls.length === 0 && !isCreating ? (
          <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-border border-dashed">
            <BarChart2 className="w-12 h-12 mx-auto mb-2 opacity-20 text-[#D08945]" />
            <p className="text-sm">No active polls. <br/> Ask the group a question!</p>
          </div>
        ) : (
          polls.map((poll) => {
            const totalVotes = poll.votes.length;
            
            return (
              <div key={poll._id} className="bg-card p-4 rounded-xl shadow-sm border border-border">
                <h3 className="font-semibold text-foreground mb-4">{poll.question}</h3>
                <div className="space-y-2">
                  {poll.options.map((option, idx) => {
                    const percentage = calculatePercentage(poll.votes, idx);
                    const voted = hasUserVotedFor(poll.votes, idx);
                    const isWinning = percentage > 0 && Math.max(...poll.options.map((_, i) => calculatePercentage(poll.votes, i))) === percentage;

                    return (
                      <div 
                        key={idx}
                        onClick={() => currentUser && votePoll({ pollId: poll._id, userId: currentUser._id, optionIndex: idx })}
                        className={`relative overflow-hidden rounded-lg border p-3 cursor-pointer transition-colors ${voted ? 'border-[#D08945] bg-[#D08945]/10' : 'border-border hover:bg-accent'}`}
                      >
                         <div 
                           className={`absolute left-0 top-0 bottom-0 transition-all duration-500 ${voted || isWinning ? 'bg-[#D08945] opacity-20' : 'bg-muted opacity-50'}`} 
                           style={{ width: `${percentage}%` }}
                         />
                         <div className="relative flex justify-between items-center z-10">
                           <div className="flex items-center gap-2">
                             {voted ? <Check size={16} className="text-[#D08945]" /> : <div className="w-4 h-4 border rounded-full border-muted-foreground" />}
                             <span className={`text-sm ${voted ? 'font-medium text-foreground' : 'text-foreground'}`}>{option}</span>
                           </div>
                           <span className="text-xs font-semibold text-muted-foreground">{percentage}%</span>
                         </div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-xs text-muted-foreground mt-3">{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
