import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { createShipmentSchema } from "@/lib/validations";
import { colors, shared } from "@/lib/theme";

function suggestRef() {
  const year = new Date().getFullYear();
  const num = String(Math.floor(Math.random() * 9000) + 1000);
  return `GH-IMP-${year}-${num}`;
}

export default function NewShipmentScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [shipmentRef, setShipmentRef] = useState(suggestRef());
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("Ghana");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setError(null);
    const parsed = createShipmentSchema.safeParse({
      shipment_ref: shipmentRef.trim(),
      origin_country: origin.trim() || undefined,
      destination_country: destination.trim() || undefined,
    });

    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? "Invalid input");
      return;
    }

    if (!profile?.organization_id) {
      setError("Organization not found. Try signing out and back in.");
      return;
    }

    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      setError("Not signed in");
      return;
    }

    const { data: shipment, error: insertError } = await supabase
      .from("shipments")
      .insert({
        ...parsed.data,
        organization_id: profile.organization_id,
        created_by: user.id,
      })
      .select()
      .single();

    setLoading(false);

    if (insertError) {
      if (insertError.message.includes("shipments_organization_id_shipment_ref_key")) {
        const { data: existing } = await supabase
          .from("shipments")
          .select("id")
          .eq("organization_id", profile.organization_id)
          .eq("shipment_ref", parsed.data.shipment_ref)
          .maybeSingle();

        if (existing?.id) {
          router.replace(`/shipments/${existing.id}`);
          return;
        }
      }
      setError(insertError.message);
      return;
    }

    if (shipment) {
      router.replace(`/shipments/${shipment.id}`);
    }
  }

  return (
    <KeyboardAvoidingView
      style={shared.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={[shared.content, { padding: 16, gap: 16 }]}>
        <View
          style={{
            backgroundColor: "#dbeafe",
            borderRadius: 14,
            padding: 16,
            flexDirection: "row",
            gap: 12,
            alignItems: "center",
          }}
        >
          <Ionicons name="information-circle-outline" size={28} color={colors.primary} />
          <Text style={{ flex: 1, fontSize: 13, color: "#1e40af", lineHeight: 18 }}>
            After creating a shipment, add parties, products, and upload trade documents for AI
            verification.
          </Text>
        </View>

        {error ? <Text style={shared.error}>{error}</Text> : null}

        <View style={shared.card}>
          <Text style={shared.label}>Shipment reference *</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              style={[shared.input, { flex: 1, marginBottom: 0 }]}
              value={shipmentRef}
              onChangeText={setShipmentRef}
              autoCapitalize="characters"
            />
            <Pressable
              onPress={() => setShipmentRef(suggestRef())}
              style={{
                backgroundColor: "#f1f5f9",
                borderRadius: 8,
                paddingHorizontal: 12,
                justifyContent: "center",
              }}
            >
              <Ionicons name="refresh-outline" size={20} color={colors.primary} />
            </Pressable>
          </View>

          <Text style={[shared.label, { marginTop: 12 }]}>Origin country</Text>
          <TextInput
            style={shared.input}
            value={origin}
            onChangeText={setOrigin}
            placeholder="China"
            placeholderTextColor={colors.muted}
          />

          <Text style={shared.label}>Destination country</Text>
          <TextInput
            style={shared.input}
            value={destination}
            onChangeText={setDestination}
            placeholder="Ghana"
            placeholderTextColor={colors.muted}
          />
        </View>

        <Pressable style={shared.button} onPress={handleCreate} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={shared.buttonText}>Create Shipment</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
