import { Image, StyleSheet, View, type ViewStyle } from "react-native";

interface LogoProps {
  width?: number;
  style?: ViewStyle;
}

export function Logo({ width = 280, style }: LogoProps) {
  const height = width * 0.55;

  return (
    <View style={[styles.wrap, style]}>
      <Image
        source={require("@/assets/logo.png")}
        style={{ width, height }}
        resizeMode="contain"
        accessibilityLabel="Passport logo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    marginBottom: 8,
  },
});
