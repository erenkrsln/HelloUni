"use client";

import { ArrowLeft } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  onBackClick: () => void;
}

export function SectionHeader({
  title,
  subtitle,
  onBackClick,
}: SectionHeaderProps) {
  return (
    <div className="border-b border-gray-100 pb-4 mb-4">
      {/* Back Button */}
      <button
        onClick={onBackClick}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-3 transition-colors"
      >
        <ArrowLeft size={16} />
        Zurück zur Übersicht
      </button>

      {/* Title and Subtitle */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
