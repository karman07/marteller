import { ReactNode } from "react";

type Variant = "primary" | "outline" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-cream hover:bg-accent shadow-[0_1px_2px_rgba(27,22,18,0.15)]",
  outline: "border border-line text-ink hover:border-accent hover:text-accent bg-transparent",
  ghost: "text-ink-soft hover:text-ink",
  danger: "bg-accent text-cream hover:bg-accent-light",
};

export function Button({
  children,
  variant = "primary",
  className = "",
  onClick,
  type = "button",
  disabled = false,
}: {
  children: ReactNode;
  variant?: Variant;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold tracking-tight transition-all duration-200 ease-out active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
