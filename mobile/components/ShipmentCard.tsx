import { View, Text, Pressable, StyleSheet } from "react-native";
import type { Shipment } from "@/types/database";
import { formatDate } from "@/lib/validations";
import { StatusBadge } from "@/components/StatusBadge";
import { colors } from "@/lib/theme";

interface ShipmentCardProps {
  shipment: Shipment;
  onPress: () => void;
}

export function ShipmentCard({ shipment, onPress }: ShipmentCardProps) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.ref}>{shipment.shipment_ref}</Text>
        <StatusBadge status={shipment.status} />
      </View>
      <View style={styles.route}>
        <View style={styles.routePoint}>
          <Text style={styles.routeLabel}>From</Text>
          <Text style={styles.routeValue}>{shipment.origin_country ?? "—"}</Text>
        </View>
        <Text style={styles.arrow}>→</Text>
        <View style={styles.routePoint}>
          <Text style={styles.routeLabel}>To</Text>
          <Text style={styles.routeValue}>{shipment.destination_country ?? "—"}</Text>
        </View>
      </View>
      <Text style={styles.date}>Created {formatDate(shipment.created_at)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  ref: { fontSize: 17, fontWeight: "800", color: colors.text, flex: 1 },
  route: { flexDirection: "row", alignItems: "center", gap: 12 },
  routePoint: { flex: 1 },
  routeLabel: { fontSize: 11, color: colors.muted, fontWeight: "600", textTransform: "uppercase" },
  routeValue: { fontSize: 15, fontWeight: "600", color: colors.text, marginTop: 2 },
  arrow: { fontSize: 18, color: colors.primary, fontWeight: "700" },
  date: { fontSize: 12, color: colors.muted },
});
