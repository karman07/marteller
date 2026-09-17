"use client";

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

const SIZES = {
  sm: "max-w-sm",
  lg: "max-w-2xl",
};

export function Modal({
  open,
  onClose,
  children,
  title,
  size = "sm",
  dismissable = true,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  size?: keyof typeof SIZES;
  dismissable?: boolean;
}) {
  useEffect(() => {
    if (!open || !dismissable) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, dismissable]);

  useEffect(() => {
    if (!open || dismissable) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, dismissable]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
        onClick={dismissable ? onClose : undefined}
        aria-hidden
      />
      <div
        className={`relative max-h-[90vh] w-full ${SIZES[size]} overflow-y-auto rounded-2xl border border-line bg-surface-2 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)] animate-fade-up`}
      >
        {dismissable && (
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream-secondary hover:text-ink"
          >
            <X size={16} />
          </button>
        )}
        {title && (
          <h2 className="mb-5 pr-8 text-lg font-semibold tracking-tight text-ink">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}
