"use client";

import { useEffect } from "react";
import { Check, X } from "lucide-react";

interface ToastProps {
  message: string;
  type?: "success" | "error";
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type = "success", onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-background border border-border rounded-lg shadow-lg animate-in slide-in-from-bottom-5">
      {type === "success" ? (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/10">
          <Check className="h-3 w-3 text-green-600" />
        </div>
      ) : (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive/10">
          <X className="h-3 w-3 text-destructive" />
        </div>
      )}
      <p className="text-sm text-foreground">{message}</p>
      <button
        onClick={onClose}
        className="ml-2 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
