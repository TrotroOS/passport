import { Stack } from "expo-router";

export default function ShipmentsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#fff" },
        headerTintColor: "#0f172a",
        headerTitleStyle: { fontWeight: "700" },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="new" options={{ title: "New Shipment", presentation: "modal" }} />
      <Stack.Screen name="[id]" options={{ title: "Shipment Details" }} />
    </Stack>
  );
}
