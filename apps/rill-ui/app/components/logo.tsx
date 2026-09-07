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
          d="M5.5 4 V21"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5.5 4 H13 C18 4 19.5 8.5 19.5 10.8 C19.5 14.2 16.5 16.2 12.5 16.2 H5.5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12.5 16.2 L19.5 21.5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="20.9" cy="22.9" r="1.9" fill="currentColor" />
      </svg>
      {withText && <span className="text-base font-semibold tracking-tight text-foreground">Rill</span>}
    </span>
  );
}