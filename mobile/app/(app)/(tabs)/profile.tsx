import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { countByStatus } from "@/lib/status";
import { formatDate } from "@/lib/validations";
import type { Shipment } from "@/types/database";
import { colors, shared } from "@/lib/theme";

interface WorkspaceStats {
  shipments: number;
  inReview: number;
  documents: number;
}

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<WorkspaceStats>({
    shipments: 0,
    inReview: 0,
    documents: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  const orgName =
    profile?.organizations && typeof profile.organizations === "object"
      ? profile.organizations.name
      : null;

  const displayName = profile?.full_name?.trim() || profile?.email?.split("@")[0] || "User";
  const initials = useMemo(() => getInitials(profile?.full_name, profile?.email), [profile]);
  const roleLabel = formatRole(profile?.role);
  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  const loadStats = useCallback(async () => {
    if (!profile?.organization_id) {
      setLoadingStats(false);
      return;
    }

    const [shipmentsRes, documentsRes] = await Promise.all([
      supabase.from("shipments").select("status"),
      supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", profile.organization_id),
    ]);

    const shipments = (shipmentsRes.data as Shipment[] | null) ?? [];
    const statusCounts = countByStatus(shipments);

    setStats({
      shipments: shipments.length,
      inReview: statusCounts.inReview ?? 0,
      documents: documentsRes.count ?? 0,
    });
    setLoadingStats(false);
  }, [profile?.organization_id]);

  useFocusEffect(
    useCallback(() => {
      setLoadingStats(true);
      loadStats();
    }, [loadStats])
  );

  const handleSignOut = () => {
    Alert.alert("Sign out", "You will need to sign in again to access your workspace.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => void signOut() },
    ]);
  };

  return (
    <ScrollView
      style={shared.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.headerMeta}>
            <Text style={styles.displayName}>{displayName}</Text>
            <Text style={styles.email}>{profile?.email}</Text>
            <View style={styles.badgeRow}>
              <Badge label={roleLabel} tone="primary" />
              {profile?.is_platform_admin ? (
                <Badge label="Platform Admin" tone="accent" />
              ) : null}
            </View>
          </View>
        </View>

        {orgName ? (
          <View style={styles.orgRow}>
            <Ionicons name="business-outline" size={16} color="#94a3b8" />
            <Text style={styles.orgName} numberOfLines={1}>
              {orgName}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.sectionLabel}>Workspace Overview</Text>
        {loadingStats ? (
          <ActivityIndicator color={colors.primary} style={styles.statsLoader} />
        ) : (
          <View style={styles.statsRow}>
            <StatItem icon="cube-outline" label="Shipments" value={stats.shipments} />
            <View style={styles.statDivider} />
            <StatItem icon="time-outline" label="In Review" value={stats.inReview} />
            <View style={styles.statDivider} />
            <StatItem icon="document-text-outline" label="Documents" value={stats.documents} />
          </View>
        )}
      </View>

      <Section title="Account Details">
        <DetailRow icon="business-outline" label="Organization" value={orgName ?? "Not assigned"} />
        <Divider />
        <DetailRow icon="shield-checkmark-outline" label="Access Level" value={roleLabel} />
        <Divider />
        <DetailRow
          icon="calendar-outline"
          label="Member Since"
          value={profile?.created_at ? formatDate(profile.created_at).split(",")[0] : "—"}
        />
        <Divider />
        <DetailRow
          icon="finger-print-outline"
          label="User ID"
          value={profile?.id ? truncateId(profile.id) : "—"}
          mono
        />
      </Section>

      <Section title="Workspace">
        <MenuRow
          icon="add-circle-outline"
          title="Create Shipment"
          subtitle="Start a new compliance record"
          onPress={() => router.push("/shipments/new")}
        />
        <Divider inset />
        <MenuRow
          icon="pulse-outline"
          title="Activity Log"
          subtitle="Review recent workspace events"
          onPress={() => router.push("/activity")}
        />
      </Section>

      <Section title="Application">
        <DetailRow icon="information-circle-outline" label="Version" value={`Passport Mobile ${appVersion}`} />
        <Divider />
        <Text style={styles.aboutText}>
          Trade compliance platform for document verification, shipment scoring, and audit-ready
          workflows.
        </Text>
      </Section>

      <Pressable style={styles.signOutButton} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>

      <Text style={styles.footer}>Passport Trade Compliance</Text>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function StatItem({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconWrap}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, mono && styles.detailValueMono]}>{value}</Text>
      </View>
    </View>
  );
}

function MenuRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.menuRow} onPress={onPress}>
      <View style={styles.menuIconWrap}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

function Badge({
  label,
  tone,
}: {
  label: string;
  tone: "primary" | "accent";
}) {
  const toneStyles =
    tone === "accent"
      ? { bg: "#fef3c7", text: "#92400e" }
      : { bg: "rgba(59, 130, 246, 0.2)", text: "#bfdbfe" };

  return (
    <View style={[styles.badge, { backgroundColor: toneStyles.bg }]}>
      <Text style={[styles.badgeText, { color: toneStyles.text }]}>{label}</Text>
    </View>
  );
}

function Divider({ inset }: { inset?: boolean }) {
  return <View style={[styles.divider, inset && styles.dividerInset]} />;
}

function getInitials(fullName: string | null | undefined, email: string | undefined): string {
  const parts = fullName?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (email?.[0] ?? "U").toUpperCase();
}

function formatRole(role: string | undefined): string {
  if (!role) return "Member";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function truncateId(id: string): string {
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  headerCard: {
    backgroundColor: colors.brandDark,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.12)",
  },
  avatarText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  headerMeta: {
    flex: 1,
    gap: 4,
  },
  displayName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#f8fafc",
  },
  email: {
    fontSize: 14,
    color: "#94a3b8",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  orgRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
  },
  orgName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#cbd5e1",
  },
  statsCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsLoader: {
    paddingVertical: 12,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    marginTop: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  detailIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  detailContent: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  detailValueMono: {
    fontFamily: "monospace",
    fontSize: 13,
    letterSpacing: 0.2,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  menuContent: {
    flex: 1,
    gap: 2,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  menuSubtitle: {
    fontSize: 13,
    color: colors.muted,
  },
  aboutText: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  dividerInset: {
    marginLeft: 68,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: colors.card,
  },
  signOutText: {
    color: colors.danger,
    fontWeight: "700",
    fontSize: 15,
  },
  footer: {
    textAlign: "center",
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 0.4,
    marginTop: 4,
  },
});
