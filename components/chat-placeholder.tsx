"use client";

import { MessageSquare } from "lucide-react";

export function ChatPlaceholder() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#FDFBF7] p-8 text-center h-full">
      <div className="w-20 h-20 rounded-full bg-[#D08945]/10 flex items-center justify-center text-[#D08945] mb-6 animate-pulse">
        <MessageSquare size={40} />
      </div>
      <h3 className="text-2xl font-bold text-gray-800 mb-2 font-poppins">
        Deine Chats
      </h3>
      <p className="text-sm text-gray-500 max-w-sm">
        Wähle einen Chat aus der Liste aus oder erstelle eine neue Gruppe, um mit deinen Kommilitonen zu schreiben.
      </p>
    </div>
  );
}
