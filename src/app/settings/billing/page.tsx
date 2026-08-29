import { BillingSettingsPanel } from "@/components/settings/billing-settings";

export default function BillingSettingsPage() {
  return (
    <>
      <h1 className="mb-2 text-xl font-bold sm:text-2xl">Billing</h1>
      <p className="mb-6 text-sm text-muted-foreground sm:text-base">
        Manage your organization subscription and plan limits
      </p>
      <BillingSettingsPanel />
    </>
  );
}
