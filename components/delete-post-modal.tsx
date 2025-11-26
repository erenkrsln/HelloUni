"use client";

import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";

interface DeletePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeletePostModal({
  isOpen,
  onClose,
  onConfirm,
}: DeletePostModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4">
            <ExclamationTriangleIcon className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Beitrag löschen?
          </h2>
          <p className="text-gray-600 mb-6">
            Bist du sicher, dass du diesen Beitrag unwiderruflich löschen möchtest?
          </p>
          <div className="flex gap-3 w-full">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
            >
              Löschen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

