import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { AuditEvent } from "@/types/database";
import { EmptyState } from "@/components/EmptyState";
import { formatAction, formatDate } from "@/lib/validations";
import { colors, shared } from "@/lib/theme";

const ACTION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  "shipment.created": "cube-outline",
  "document.uploaded": "document-text-outline",
  "party.created": "people-outline",
  "product.created": "pricetag-outline",
  "user.login": "log-in-outline",
  "user.registered": "person-add-outline",
};

export default function ActivityScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!profile?.organization_id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const { data } = await supabase
      .from("audit_events")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .order("created_at", { ascending: false })
      .limit(50);

    setEvents((data as AuditEvent[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [profile?.organization_id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={[shared.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={shared.container}>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
        }
        contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
        ListEmptyComponent={
          <EmptyState
            icon="time-outline"
            title="No activity yet"
            message="Actions like creating shipments, uploading documents, and adding parties will appear here."
          />
        }
        renderItem={({ item }) => (
          <PressableEvent
            event={item}
            onPress={() => {
              if (item.shipment_id) {
                router.push(`/shipments/${item.shipment_id}`);
              }
            }}
          />
        )}
      />
    </View>
  );
}

function PressableEvent({
  event,
  onPress,
}: {
  event: AuditEvent;
  onPress: () => void;
}) {
  const iconName = ACTION_ICONS[event.action] ?? "ellipse-outline";
  const meta = event.metadata as Record<string, string | undefined>;
  const detail =
    meta.shipment_ref ?? meta.name ?? meta.doc_type ?? meta.file_name ?? event.entity_type;

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: "row",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={iconName} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: "700", color: colors.text, fontSize: 14 }}>
          {formatAction(event.action)}
        </Text>
        {detail ? (
          <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>{detail}</Text>
        ) : null}
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>
          {formatDate(event.created_at)}
        </Text>
      </View>
      {event.shipment_id ? (
        <Text onPress={onPress} style={{ color: colors.primary, fontWeight: "600", fontSize: 13 }}>
          View
        </Text>
      ) : null}
    </View>
  );
}
