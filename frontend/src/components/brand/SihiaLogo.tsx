import { cn } from "@/lib/utils";

type SihiaLogoProps = {
  variant?: "full" | "icon";
  className?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
};

/** Placeholder vectoriel SIHIA — remplacer par le logo final sans changer l'API. */
export function SihiaLogo({
  variant = "full",
  className,
  iconClassName,
  wordmarkClassName,
}: SihiaLogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <SihiaLogoIcon className={iconClassName} />
      {variant === "full" ? (
        <div className={cn("leading-tight", wordmarkClassName)}>
          <div className="text-sm font-semibold tracking-tight text-foreground">SIHIA</div>
          <div className="text-[10px] text-muted-foreground">Health Platform</div>
        </div>
      ) : null}
    </div>
  );
}

export function SihiaLogoIcon({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-card)]",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-5" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 4.5c-2.2 0-4 1.5-4 3.4 0 .9.4 1.7 1 2.3V12c0 1.7 1.3 3 3 3s3-1.3 3-3V10.2c.6-.6 1-1.4 1-2.3 0-1.9-1.8-3.4-4-3.4Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8.5 18.5h7M10 21h4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path d="M12 7.5v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </div>
  );
}
