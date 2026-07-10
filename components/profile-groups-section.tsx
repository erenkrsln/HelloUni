"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import Image from "next/image";

interface ProfileGroupsSectionProps {
  userId: Id<"users">;
  showOnlyPublic?: boolean; // true = only show public groups (for other users' profiles)
  maxDisplay?: number; // max groups to show in preview (default 3)
}

export function ProfileGroupsSection({
  userId,
  showOnlyPublic = false,
  maxDisplay = 3,
}: ProfileGroupsSectionProps) {
  const groups = useQuery(api.queries.getUserGroupsForProfile, {
    userId,
    showOnlyPublic: showOnlyPublic || undefined,
  });

  // Loading state
  if (groups === undefined) {
    return (
      <section className="mb-6 px-4 md:px-0">
        <h2 className="text-lg font-semibold mb-4">Gruppen</h2>
        {/* Simple group card skeleton loading state */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 overflow-hidden animate-pulse">
              <div className="w-full h-32 bg-gray-200" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // No groups state
  if (groups.length === 0) {
    return (
      <section className="mb-6 px-4 md:px-0">
        <h2 className="text-lg font-semibold mb-4">Gruppen</h2>
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">
            {showOnlyPublic ? "Keine öffentlichen Gruppen" : "Noch keine Gruppen"}
          </p>
        </div>
      </section>
    );
  }

  const displayedGroups = groups.slice(0, maxDisplay);
  const hasMoreGroups = groups.length > maxDisplay;
  const remainingCount = groups.length - maxDisplay;

  return (
    <section className="mb-6 px-4 md:px-0">
      <h2 className="text-lg font-semibold mb-4">Gruppen</h2>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {displayedGroups.map((group) => (
          <Link
            key={group._id}
            href={`/workspace/group_${group._id}`}
            className="group"
          >
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md hover:border-gray-300 transition-all cursor-pointer h-full">
              {/* Group Image */}
              <div className="relative w-full h-32 bg-gray-200 flex items-center justify-center overflow-hidden">
                {group.displayImage ? (
                  <Image
                    src={group.displayImage}
                    alt={group.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="text-4xl">👥</div>
                )}
              </div>

              {/* Group Info */}
              <div className="p-3">
                {/* Group Name */}
                <h3 className="font-semibold text-sm line-clamp-2 mb-2 group-hover:text-[#D08945]">
                  {group.name}
                </h3>

                {/* Member Count */}
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <span>👥</span>
                  <span>{group.memberCount} Mitglied{group.memberCount !== 1 ? "er" : ""}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* View All Link */}
      {hasMoreGroups && (
        <div className="text-center">
          <Link
            href="/workspace"
            className="text-sm font-medium text-[#D08945] hover:underline"
          >
            Alle {groups.length} Gruppen anzeigen →
          </Link>
        </div>
      )}
    </section>
  );
}
