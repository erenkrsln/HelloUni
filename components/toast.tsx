"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

type Toast = { id: string; message: string; type?: "info" | "success" | "error"; action?: { label: string; onClick: () => void }; duration?: number };

const ToastContext = createContext<{
  push: (t: Omit<Toast, "id">) => string;
  remove: (id: string) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    setToasts((current) => {
      const duplicate = current.find((toast) =>
        toast.message === t.message &&
        toast.type === t.type &&
        (toast.action?.label || "") === (t.action?.label || "")
      );
      if (duplicate) return current;
      const nextToasts = [...current, { id, duration: t.duration ?? 3000, ...t }];
      return nextToasts.length > 3 ? nextToasts.slice(nextToasts.length - 3) : nextToasts;
    });
    return id;
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ push, remove }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2 max-w-sm">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const duration = toast.duration ?? 3000;
  const [progressStyle, setProgressStyle] = React.useState<{ width: string; transition?: string } | null>(null);

  useEffect(() => {
    const id = window.setTimeout(onClose, duration);
    requestAnimationFrame(() => {
      setProgressStyle({ width: "0%", transition: `width ${duration}ms linear` });
    });
    return () => window.clearTimeout(id);
  }, [onClose, duration]);

  const bg = toast.type === "error" ? "bg-red-600 text-white" : toast.type === "success" ? "bg-green-600 text-white" : "bg-white border shadow";

  return (
    <div className={`max-w-sm w-full px-4 py-3 rounded-2xl ${bg} transition-all duration-200 transform shadow-lg relative overflow-hidden`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm leading-5 break-words">{toast.message}</div>
        {toast.action && (
          <button onClick={() => { toast.action!.onClick(); onClose(); }} className={`text-sm font-semibold ${toast.type === 'error' ? 'text-white/90' : 'text-[#0F172A]'}`}>
            {toast.action.label}
          </button>
        )}
      </div>
      <div className="absolute left-0 bottom-0 h-1 w-full rounded-b-2xl overflow-hidden">
        <div className="h-1 bg-black/10" style={{ width: "100%" }} />
        <div className="h-1 bg-[#D08945] absolute left-0 top-0" style={progressStyle ?? { width: "100%" }} />
      </div>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return {
    info: (message: string) => ctx.push({ message, type: "info" }),
    success: (message: string) => ctx.push({ message, type: "success" }),
    error: (message: string) => ctx.push({ message, type: "error" }),
    push: ctx.push,
    remove: ctx.remove,
  };
}

export default ToastProvider;
