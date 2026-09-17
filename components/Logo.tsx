export function Logomark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M16 16L7 9M16 16L25 9M16 16L16 25"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.45"
      />
      <circle cx="7" cy="9" r="2.4" fill="currentColor" opacity="0.55" />
      <circle cx="25" cy="9" r="2.4" fill="currentColor" opacity="0.55" />
      <circle cx="16" cy="25" r="2.4" fill="currentColor" opacity="0.55" />
      <circle cx="16" cy="16" r="5.4" fill="currentColor" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-ink ${className}`}
    >
      <Logomark className="h-7 w-7 text-accent" />
      <span className="text-lg font-extrabold tracking-tight">
        Marteller
      </span>
    </span>
  );
}
