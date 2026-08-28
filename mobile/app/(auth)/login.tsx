import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { loginSchema } from "@/lib/validations";
import { authScreen, shared } from "@/lib/theme";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);
    const parsed = loginSchema.safeParse({ email: email.trim(), password });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? "Invalid input");
      return;
    }

    setLoading(true);
    try {
      const err = await signIn(parsed.data.email, parsed.data.password);
      if (err) {
        setError(err);
        return;
      }
      router.replace("/(app)/(tabs)");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={authScreen.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[shared.content, { paddingHorizontal: 24, paddingVertical: 32 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Logo width={260} />
          <Text style={authScreen.tagline}>Clearer trade. Safer shipments.</Text>

          {error ? (
            <View style={authScreen.errorBox}>
              <Text style={authScreen.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={authScreen.label}>Email</Text>
          <TextInput
            style={authScreen.input}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@company.com"
            placeholderTextColor="#64748b"
            editable={!loading}
          />

          <Text style={authScreen.label}>Password</Text>
          <TextInput
            style={authScreen.input}
            secureTextEntry
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#64748b"
            editable={!loading}
            onSubmitEditing={handleLogin}
          />

          <Pressable
            style={[shared.button, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={shared.buttonText}>Sign in</Text>
            )}
          </Pressable>

          <Link href="/signup" asChild>
            <Pressable
              style={[shared.buttonSecondary, { marginTop: 8, borderColor: "#334155" }]}
              disabled={loading}
            >
              <Text style={[shared.buttonSecondaryText, { color: "#e2e8f0" }]}>
                Create account
              </Text>
            </Pressable>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
