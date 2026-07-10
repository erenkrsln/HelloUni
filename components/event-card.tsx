"use client";

import { Clock, MapPin } from "lucide-react";
import Link from "next/link";
import React from "react";

interface EventCardProps {
  title: string;
  startTime: number;
  endTime: number;
  location?: string;
  description?: string;
  badgeText: string;
  badgeType: "personal" | "group" | "public" | "termin";
  href?: string;
  onClick?: () => void;
  rightAction?: React.ReactNode;
}

export function EventCard({
  title,
  startTime,
  endTime,
  location,
  description,
  badgeText,
  badgeType,
  href,
  onClick,
  rightAction,
}: EventCardProps) {
  const dateObj = new Date(startTime);
  const endD = new Date(endTime);
  const isSameDay = dateObj.toDateString() === endD.toDateString();

  const month = dateObj.toLocaleString("de-DE", { month: "short" }).toUpperCase();
  const day = dateObj.getDate();

  const formatDate = (timeMs: number) => {
    const d = new Date(timeMs);
    return d.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTimeStr = (timeMs: number) => {
    const d = new Date(timeMs);
    return d.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  let timeText = "";
  if (isSameDay) {
    timeText = `${formatDate(startTime)} · ${formatTimeStr(startTime)} - ${formatTimeStr(endTime)} Uhr`;
  } else {
    timeText = `${formatDate(startTime)} ${formatTimeStr(startTime)} Uhr - ${formatDate(endTime)} ${formatTimeStr(endTime)} Uhr`;
  }

  const badgeClasses = {
    personal: "bg-purple-50 text-purple-700 border border-purple-100",
    group: "bg-blue-50 text-blue-700 border border-blue-100",
    public: "bg-amber-50 text-amber-700 border border-amber-100",
    termin: "bg-[#F78D57]/10 text-[#b55018] border border-[#F78D57]/20",
  }[badgeType];

  const cardContent = (
    <>
      {/* Date Block */}
      <div className="flex flex-col items-center justify-center bg-[#D08945]/10 text-[#953F0B] border border-[#D08945]/20 rounded-xl w-14 h-14 shrink-0 shadow-sm select-none transition-colors group-hover:bg-[#D08945] group-hover:text-white">
        <span className="text-[10px] font-extrabold uppercase leading-none tracking-wider opacity-90">
          {month}
        </span>
        <span className="text-xl font-extrabold leading-none mt-0.5">
          {day}
        </span>
      </div>

      {/* Main Info */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2 mb-1">
          <h4 className="font-bold text-sm sm:text-base text-slate-900 truncate pr-1">
            {title}
          </h4>
          <span
            className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeClasses}`}
          >
            {badgeText}
          </span>
        </div>

        {/* Date / Time */}
        <div className="flex items-center text-xs text-slate-500 gap-1.5 font-medium mb-1 select-none">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{timeText}</span>
        </div>

        {/* Location */}
        {location && (
          <div className="flex items-center text-xs text-slate-500 gap-1.5 font-medium mb-1.5 select-none">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{location}</span>
          </div>
        )}

        {/* Description */}
        {description && (
          <p className="text-xs text-slate-600 italic line-clamp-2 break-words leading-relaxed border-t border-slate-100 pt-1.5 mt-1.5">
            {description}
          </p>
        )}
      </div>

      {/* Right Side Action */}
      {rightAction && (
        <div className="flex-shrink-0 self-center ml-1">
          {rightAction}
        </div>
      )}
    </>
  );

  const containerClasses =
    "group w-full text-left p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 transition-all flex gap-4 items-start shadow-sm hover:shadow-md cursor-pointer";

  if (href) {
    return (
      <Link href={href} className={containerClasses} onClick={onClick}>
        {cardContent}
      </Link>
    );
  }

  return (
    <div onClick={onClick} className={containerClasses}>
      {cardContent}
    </div>
  );
}
