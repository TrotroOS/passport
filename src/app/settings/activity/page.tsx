import { ActivityFeedCard } from "@/components/activity/activity-feed";

export default function ActivityPage() {
  return (
    <>
      <h1 className="mb-2 text-xl font-bold sm:text-2xl">Activity log</h1>
      <p className="mb-6 text-sm text-muted-foreground sm:text-base">
        Professional audit trail of compliance actions across your organization
      </p>
      <ActivityFeedCard />
    </>
  );
}
