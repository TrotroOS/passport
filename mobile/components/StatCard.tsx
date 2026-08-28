import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/lib/theme";

interface StatCardProps {
  label: string;
  value: number | string;
  accent?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function StatCard({
  label,
  value,
  accent = colors.primary,
  icon,
}: StatCardProps) {
  return (
    <View style={styles.card}>
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: `${accent}15` }]}>
          <Ionicons name={icon} size={18} color={accent} />
        </View>
      ) : null}
      <Text style={[styles.value, { color: accent }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 100,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  value: { fontSize: 22, fontWeight: "800" },
  label: { fontSize: 11, color: colors.muted, marginTop: 2, fontWeight: "500" },
});
