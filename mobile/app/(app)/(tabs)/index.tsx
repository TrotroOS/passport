import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Shipment, ShipmentStatus } from "@/types/database";
import { StatCard } from "@/components/StatCard";
import { ShipmentCard } from "@/components/ShipmentCard";
import { EmptyState } from "@/components/EmptyState";
import { countByStatus } from "@/lib/status";
import { colors, shared } from "@/lib/theme";

const FILTERS: { key: ShipmentStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "in_review", label: "In Review" },
  { key: "ready", label: "Ready" },
  { key: "blocked", label: "Blocked" },
];

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ShipmentStatus | "all">("all");

  const loadShipments = useCallback(async () => {
    const { data, error } = await supabase
      .from("shipments")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setShipments(data as Shipment[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadShipments();
    }, [loadShipments])
  );

  const stats = useMemo(() => countByStatus(shipments), [shipments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return shipments.filter((s) => {
      if (filter !== "all" && s.status !== filter) return false;
      if (!q) return true;
      return (
        s.shipment_ref.toLowerCase().includes(q) ||
        s.origin_country?.toLowerCase().includes(q) ||
        s.destination_country?.toLowerCase().includes(q)
      );
    });
  }, [shipments, search, filter]);

  const orgName =
    profile?.organizations && typeof profile.organizations === "object"
      ? profile.organizations.name
      : null;

  const greeting = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <View style={shared.container}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadShipments();
            }}
          />
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 12 }}
        ListHeaderComponent={
          <View style={{ gap: 16, marginBottom: 4 }}>
            <View>
              <Text style={{ fontSize: 14, color: colors.muted }}>{orgName ?? "Passport"}</Text>
              <Text style={{ fontSize: 26, fontWeight: "800", color: colors.text, marginTop: 2 }}>
                Welcome back{greeting !== "there" ? `, ${greeting}` : ""}
              </Text>
              <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>
                Clearer trade. Safer shipments.
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <StatCard label="Total" value={stats.total} icon="cube-outline" />
                <StatCard label="Ready" value={stats.ready} accent={colors.success} icon="checkmark-circle-outline" />
                <StatCard label="In Review" value={stats.inReview} accent={colors.warning} icon="search-outline" />
                <StatCard label="Blocked" value={stats.blocked} accent={colors.danger} icon="ban-outline" />
              </View>
            </ScrollView>

            <Pressable
              style={[shared.button, { flexDirection: "row", gap: 8, justifyContent: "center" }]}
              onPress={() => router.push("/shipments/new")}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={shared.buttonText}>New Shipment</Text>
            </Pressable>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 12,
                gap: 8,
              }}
            >
              <Ionicons name="search-outline" size={18} color={colors.muted} />
              <TextInput
                style={{ flex: 1, paddingVertical: 12, fontSize: 15, color: colors.text }}
                placeholder="Search by ref or country..."
                placeholderTextColor={colors.muted}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {FILTERS.map((f) => (
                  <Pressable
                    key={f.key}
                    onPress={() => setFilter(f.key)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 999,
                      backgroundColor: filter === f.key ? colors.primary : colors.card,
                      borderWidth: 1,
                      borderColor: filter === f.key ? colors.primary : colors.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: filter === f.key ? "#fff" : colors.text,
                      }}
                    >
                      {f.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
              Shipments ({filtered.length})
            </Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
          ) : (
            <EmptyState
              icon="boat-outline"
              title="No shipments yet"
              message="Create your first shipment to start tracking trade compliance, documents, and verification."
              actionLabel="Create Shipment"
              onAction={() => router.push("/shipments/new")}
            />
          )
        }
        renderItem={({ item }) => (
          <ShipmentCard
            shipment={item}
            onPress={() => router.push(`/shipments/${item.id}`)}
          />
        )}
      />
    </View>
  );
}
