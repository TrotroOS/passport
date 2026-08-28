import Link from "next/link";
import { cn } from "@/lib/utils";
import { LEGAL_DOCUMENTS } from "@/lib/legal";

interface LegalNavProps {
  currentSlug?: string;
  className?: string;
}

export function LegalNav({ currentSlug, className }: LegalNavProps) {
  return (
    <nav className={cn("space-y-1", className)}>
      {LEGAL_DOCUMENTS.map((doc) => (
        <Link
          key={doc.slug}
          href={`/legal/${doc.slug}`}
          className={cn(
            "block rounded-md px-3 py-2 text-sm transition",
            currentSlug === doc.slug
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"
          )}
        >
          {doc.title}
        </Link>
      ))}
    </nav>
  );
}
