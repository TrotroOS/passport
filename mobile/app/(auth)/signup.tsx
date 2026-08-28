import { useState } from "react";
import {
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Link } from "expo-router";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { signupSchema } from "@/lib/validations";
import { authScreen, shared } from "@/lib/theme";

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    setError(null);
    const parsed = signupSchema.safeParse({ email, password, fullName });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? "Invalid input");
      return;
    }

    setLoading(true);
    const err = await signUp(parsed.data.email, parsed.data.password, parsed.data.fullName);
    setLoading(false);
    if (err) setError(err);
  }

  return (
    <KeyboardAvoidingView
      style={authScreen.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={[shared.content, { padding: 24 }]}>
        <Logo width={240} />
        <Text style={authScreen.tagline}>Create your organization account</Text>

        {error ? <Text style={shared.error}>{error}</Text> : null}

        <Text style={authScreen.label}>Full name</Text>
        <TextInput
          style={authScreen.input}
          value={fullName}
          onChangeText={setFullName}
          placeholderTextColor="#64748b"
        />

        <Text style={authScreen.label}>Email</Text>
        <TextInput
          style={authScreen.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholderTextColor="#64748b"
        />

        <Text style={authScreen.label}>Password</Text>
        <TextInput
          style={authScreen.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholderTextColor="#64748b"
        />

        <Pressable style={shared.button} onPress={handleSignup} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={shared.buttonText}>Sign up</Text>
          )}
        </Pressable>

        <Link href="/login" asChild>
          <Pressable style={[shared.buttonSecondary, { marginTop: 8, borderColor: "#334155" }]}>
            <Text style={[shared.buttonSecondaryText, { color: "#e2e8f0" }]}>
              Back to sign in
            </Text>
          </Pressable>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
