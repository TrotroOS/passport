import { SettingsNav } from "@/components/settings/settings-nav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <SettingsNav />
      <div className="mt-6">{children}</div>
    </div>
  );
}
