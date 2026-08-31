import { cn } from "@/lib/utils";

export type SihiaLogoVariant = "full" | "compact" | "icon";

type SihiaLogoProps = {
  variant?: SihiaLogoVariant;
  className?: string;
  /** When true, the image is hidden from assistive tech (parent must provide the label). */
  decorative?: boolean;
  /**
   * Light surface behind the logo — required on dark backgrounds so the navy wordmark stays readable.
   * Does not alter the logo asset itself.
   */
  surface?: "none" | "light";
};

const VARIANTS = {
  full: {
    src: "/brand/sihia-logo-primary.png",
    width: 925,
    height: 302,
    alt: "SIHIA — Smart Hospital Intelligence Platform",
    className: "h-auto w-full max-w-[320px]",
  },
  compact: {
    src: "/brand/sihia-logo-compact.png",
    width: 917,
    height: 217,
    alt: "SIHIA",
    className: "h-9 w-auto max-w-[180px]",
  },
  icon: {
    src: "/brand/sihia-icon.png",
    width: 322,
    height: 322,
    alt: "SIHIA",
    className: "size-8",
  },
} as const;

export function SihiaLogo({
  variant = "compact",
  className,
  decorative = false,
  surface = "none",
}: SihiaLogoProps) {
  const spec = VARIANTS[variant];
  const image = (
    <img
      src={spec.src}
      alt={decorative ? "" : spec.alt}
      width={spec.width}
      height={spec.height}
      className={cn(
        "block object-contain",
        variant === "icon" ? "object-center" : "object-left",
        spec.className,
        className,
      )}
      decoding="async"
      draggable={false}
    />
  );

  if (surface === "light") {
    return (
      <span className="inline-flex max-w-full items-center rounded-lg bg-white px-3 py-2 shadow-[var(--shadow-card)] ring-1 ring-black/5">
        {image}
      </span>
    );
  }

  return image;
}

export function SihiaLogoIcon({ className }: { className?: string }) {
  return <SihiaLogo variant="icon" className={className} decorative />;
}
