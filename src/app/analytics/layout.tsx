import { AnalyticsPrintBlocker } from "@/components/analytics/analytics-print-blocker";

export default function AnalyticsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AnalyticsPrintBlocker>
      <div className="passport-analytics-shell print:hidden" data-passport-view="analytics">
        {children}
      </div>
    </AnalyticsPrintBlocker>
  );
}
