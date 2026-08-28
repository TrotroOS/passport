import Image from "next/image";
import { cn } from "@/lib/utils";

interface PassportLogoProps {
  /** Legacy wordmark width — maps to a circular mark (~96px) when large. */
  width?: number;
  /** Diameter in px for compact/header use. */
  height?: number;
  className?: string;
}

export function PassportLogo({ width, height = 32, className }: PassportLogoProps) {
  const diameter = width && width > 80 ? 96 : width ?? height;

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-background ring-1 ring-border/50",
        className
      )}
      style={{ width: diameter, height: diameter }}
    >
      <Image
        src="/logo.png"
        alt="Passport"
        fill
        className="object-cover object-[center_24%] scale-[1.35]"
        sizes={`${diameter}px`}
        priority={Boolean(width && width > 80)}
      />
    </div>
  );
}
