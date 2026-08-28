import { View, Text, StyleSheet } from "react-native";
import { getScoreColor } from "@/lib/status";
import { colors } from "@/lib/theme";

interface ScoreGaugeProps {
  score: number;
  label?: string;
  size?: number;
}

export function ScoreGauge({ score, label = "Passport Score", size = 100 }: ScoreGaugeProps) {
  const color = getScoreColor(score);
  const ringSize = size;
  const innerSize = size - 16;

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.ring,
          {
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            borderColor: color,
          },
        ]}
      >
        <View
          style={[
            styles.inner,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
            },
          ]}
        >
          <Text style={[styles.score, { color, fontSize: size * 0.28 }]}>{Math.round(score)}</Text>
        </View>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 8 },
  ring: {
    borderWidth: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  inner: {
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  score: { fontWeight: "800" },
  label: { fontSize: 13, fontWeight: "600", color: colors.muted },
});
