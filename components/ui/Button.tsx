import { ReactNode } from "react";

type Variant = "primary" | "outline" | "cream" | "ghost";

const variants: Record<Variant, string> = {
  primary:
    "bg-ink text-cream hover:bg-accent shadow-[0_1px_2px_rgba(27,22,18,0.15)]",
  outline:
    "border border-line text-ink hover:border-accent hover:text-accent bg-transparent",
  cream:
    "bg-paper text-accent hover:bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]",
  ghost: "text-ink-soft hover:text-ink",
};

export function Button({
  children,
  variant = "primary",
  className = "",
  href,
  onClick,
  type = "button",
  disabled = false,
}: {
  children: ReactNode;
  variant?: Variant;
  className?: string;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold tracking-tight transition-all duration-200 ease-out active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";
  const classes = `${base} ${variants[variant]} ${className}`;

  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  );
}
