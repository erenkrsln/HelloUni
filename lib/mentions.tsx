import React from "react";
import Link from "next/link";

export function renderContentWithMentions(content: string) {
  if (!content) return content;
  
  // Match @username (word characters after @)
  const mentionRegex = /@(\w+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let keyCounter = 0;
  
  // Use matchAll for better compatibility
  const matches = Array.from(content.matchAll(mentionRegex));
  
  if (matches.length === 0) {
    // No mentions found, return content as-is
    return content;
  }
  
  matches.forEach((match) => {
    if (match.index === undefined) return;
    
    // Add text before mention
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${keyCounter++}`}>
          {content.substring(lastIndex, match.index)}
        </span>
      );
    }
    
    // Add mention as link
    const username = match[1];
    parts.push(
      <Link
        key={`mention-${keyCounter++}`}
        href={`/profile/${username}`}
        prefetch={true}
        className="text-[#D08945] cursor-pointer transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        @{username}
      </Link>
    );
    
    lastIndex = match.index + match[0].length;
  });
  
  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(
      <span key={`text-${keyCounter++}`}>
        {content.substring(lastIndex)}
      </span>
    );
  }
  
  return <>{parts}</>;
}












