import Image from "next/image";
import { cn } from "@/lib/utils";

const LOCKUP_ASPECT = 1600 / 511;

interface PassportLogoProps {
  /** Lockup width in px. Prefer `height` for headers. */
  width?: number;
  /** Mark diameter or lockup height in px. */
  height?: number;
  className?: string;
  /** Square S-mark, or full Seadell wordmark. */
  variant?: "mark" | "lockup";
}

export function PassportLogo({
  width,
  height,
  className,
  variant,
}: PassportLogoProps) {
  const resolvedVariant =
    variant ?? (width !== undefined && width > 96 ? "lockup" : "mark");

  if (resolvedVariant === "lockup") {
    const resolvedHeight = height ?? (width ? Math.round(width / LOCKUP_ASPECT) : 40);
    const resolvedWidth = width ?? Math.round(resolvedHeight * LOCKUP_ASPECT);

    return (
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-md bg-[#0d0d0d]",
          className
        )}
        style={{ width: resolvedWidth, height: resolvedHeight }}
      >
        <Image
          src="/logo-lockup.png"
          alt="Seadell"
          fill
          className="object-contain"
          sizes={`${resolvedWidth}px`}
          priority={resolvedWidth >= 180}
        />
      </div>
    );
  }

  const diameter = height ?? width ?? 32;

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-md bg-[#0d0d0d]",
        className
      )}
      style={{ width: diameter, height: diameter }}
    >
      <Image
        src="/logo.png"
        alt="Seadell"
        fill
        className="object-contain"
        sizes={`${diameter}px`}
      />
    </div>
  );
}
