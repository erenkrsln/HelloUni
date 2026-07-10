"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Bestätigen",
  cancelLabel = "Abbrechen",
  isDangerous = false,
  isLoading = false,
}: ConfirmationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-6 gap-4">
        <DialogHeader className="flex flex-row items-start gap-3 pb-3 border-b border-slate-100">
          {isDangerous && (
            <AlertTriangle className="w-5.5 h-5.5 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-base font-semibold text-slate-900">
              {title}
            </DialogTitle>
          </div>
        </DialogHeader>

        <DialogBody className="py-2">
          <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
        </DialogBody>

        <DialogFooter className="gap-2 border-t border-slate-100 pt-3 mt-0 flex flex-row justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-2xl border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 min-h-[40px] flex-1 sm:flex-initial"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-2xl font-medium transition-colors disabled:opacity-50 text-white min-h-[40px] flex-1 sm:flex-initial ${
              isDangerous
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[#D08945] hover:bg-[#b07335]"
            }`}
          >
            {isLoading ? "..." : confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
