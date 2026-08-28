import { View, Text, StyleSheet } from "react-native";
import { formatStatus } from "@/lib/validations";
import { getStatusStyle } from "@/lib/status";

export function StatusBadge({ status }: { status: string }) {
  const style = getStatusStyle(status);
  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <View style={[styles.dot, { backgroundColor: style.dot }]} />
      <Text style={[styles.text, { color: style.text }]}>{formatStatus(status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 12, fontWeight: "600" },
});
