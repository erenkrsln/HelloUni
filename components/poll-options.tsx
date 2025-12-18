"use client";

import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";

interface PollOptionsProps {
  postId: Id<"posts">;
  pollOptions: string[];
  pollResults: number[];
  pollVote: number | null;
  onVote: (optionIndex: number) => void;
  isVoting: boolean;
}

export function PollOptions({ 
  pollOptions, 
  pollResults, 
  pollVote, 
  onVote, 
  isVoting 
}: PollOptionsProps) {
  return (
    <div className="mt-3 space-y-2">
      {pollOptions.map((option, index) => {
        const resultsArray = pollResults && Array.isArray(pollResults) 
          ? pollResults 
          : new Array(pollOptions.length).fill(0);
        
        const voteCount = index >= 0 && index < resultsArray.length 
          ? (resultsArray[index] || 0) 
          : 0;
        
        const totalVotes = resultsArray.reduce((sum, count) => {
          const num = typeof count === 'number' ? count : 0;
          return sum + (isNaN(num) ? 0 : num);
        }, 0);
        
        const percentage = totalVotes > 0 && !isNaN(voteCount) && !isNaN(totalVotes)
          ? (voteCount / totalVotes) * 100
          : 0;
        
        const isSelected = pollVote === index;

        return (
          <button
            key={index}
            onClick={() => onVote(index)}
            disabled={isVoting}
            className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
              isSelected
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-900">{option}</span>
              {totalVotes > 0 && (
                <span className="text-xs text-gray-500">
                  {voteCount} ({Math.round(percentage)}%)
                </span>
              )}
            </div>
            {totalVotes > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}




