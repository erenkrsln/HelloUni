"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";

interface SharedProfileMessageProps {
  profileId: Id<"users">;
  currentUserId: Id<"users">;
  isMe: boolean;
}

export function SharedProfileMessage({ profileId, currentUserId, isMe }: SharedProfileMessageProps) {
  const router = useRouter();
  const user = useQuery(api.queries.getUserById, {
    userId: profileId
  });

  if (user === undefined) {
    return (
      <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-2xl w-full min-h-[100px] border border-gray-100">
        <span className="text-sm text-gray-500">Lade Profil...</span>
      </div>
    );
  }

  if (user === null) {
    return (
      <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-2xl w-full border border-gray-100">
        <span className="text-sm text-gray-500 italic">Dieses Profil ist nicht mehr verfügbar.</span>
      </div>
    );
  }

  return (
    <div
      onClick={() => {
        if (user.username) {
          router.push(`/profile/${user.username}`);
        } else {
          router.push(`/profile/${profileId}`);
        }
      }}
      className="flex flex-col w-full max-w-[320px] sm:max-w-[360px] bg-white rounded-2xl overflow-hidden mt-1 cursor-pointer"
    >
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <User size={12} className="text-[#D08945] flex-shrink-0" />
          <span className="text-[10px] font-bold text-[#D08945] uppercase tracking-wider">Geteiltes Profil</span>
        </div>
      </div>

      <div className="pointer-events-none pb-2 px-3 pt-1">
        <div className="flex items-start gap-3 w-full relative">
          {/* Use Avatar from ui/avatar for consistent rendering */}
          <Avatar className="w-10 h-10 border border-gray-100/50 shadow-sm rounded-full overflow-hidden flex-shrink-0">
            {user.image && <AvatarImage src={user.image} alt={user.name} className="object-cover" />}
            <AvatarFallback className="bg-gray-100/80 text-gray-600 font-medium">
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* User Info & Headers */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            {/* Name */}
            <div className="flex items-center gap-1.5 w-full">
              <span className="font-semibold text-[15px] truncate text-gray-900">
                {user.name}
              </span>
            </div>

            {/* Major and Semester (like FeedCard) */}
            <div className="flex items-center gap-x-1.5 gap-y-0.5 text-[13px] text-gray-500 flex-wrap w-full mt-0.5">
              {user.major && (
                <>
                  <span className="truncate max-w-[12rem]">{user.major}</span>
                  {user.semester && (
                    <>
                      <span className="text-[10px]">•</span>
                      <span className="whitespace-nowrap">{user.semester}. Semester</span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
