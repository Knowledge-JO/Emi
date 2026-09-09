interface LogoProps {
  withText?: boolean;
  size?: number;
  className?: string;
}

export function Logo({ withText = true, size = 20, className = "" }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        viewBox="0 0 28 28"
        width={size}
        height={size}
        className="text-accent"
        aria-hidden="true"
        fill="none"
      >
        <path
          d="M7.5 5 V23"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7.5 5 H20.5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M7.5 14 H17"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M7.5 23 H20.5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="21.2" cy="14" r="1.9" fill="currentColor" />
      </svg>
      {withText && <span className="text-base font-semibold tracking-tight text-foreground">Emi</span>}
    </span>
  );
}