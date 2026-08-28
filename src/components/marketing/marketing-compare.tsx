import { Check, X } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";

const ROWS = [
  { key: "documents", passport: true, legacy: true },
  { key: "verification", passport: true, legacy: false },
  { key: "regulatory", passport: true, legacy: false },
  { key: "collaboration", passport: true, legacy: false },
  { key: "audit", passport: true, legacy: false },
] as const;

function CellIcon({ value }: { value: boolean }) {
  return value ? (
    <Check className="mx-auto h-5 w-5 text-emerald-600" aria-hidden />
  ) : (
    <X className="mx-auto h-5 w-5 text-muted-foreground/50" aria-hidden />
  );
}

export async function MarketingCompare() {
  const t = await getTranslations("marketing.compare");

  return (
    <section
      id="compare"
      className="scroll-mt-16 border-y bg-muted/30 py-14 sm:scroll-mt-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl sm:mx-auto sm:text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">{t("title")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:mt-4 sm:text-base">
            {t("subtitle")}
          </p>
        </div>

        <div className="mt-10 overflow-x-auto sm:mt-14">
          <table className="w-full min-w-[32rem] border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th className="pb-4 pe-4 text-start font-medium text-muted-foreground">
                  {t("capability")}
                </th>
                <th className="pb-4 px-4 text-center font-semibold text-primary">
                  {t("passport")}
                </th>
                <th className="pb-4 ps-4 text-center font-medium text-muted-foreground">
                  {t("legacy")}
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.key} className="border-b border-border/60 last:border-0">
                  <td className="py-4 pe-4 align-middle">
                    <span className="font-medium">{t(`rows.${row.key}.label`)}</span>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t(`rows.${row.key}.detail`)}
                    </p>
                  </td>
                  <td className={cn("px-4 py-4 text-center align-middle", "bg-primary/5")}>
                    <CellIcon value={row.passport} />
                  </td>
                  <td className="py-4 ps-4 text-center align-middle">
                    <CellIcon value={row.legacy} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
