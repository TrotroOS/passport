import { StyleSheet } from "react-native";

export const colors = {
  primary: "#2563eb",
  background: "#f8fafc",
  card: "#ffffff",
  text: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  success: "#059669",
  warning: "#d97706",
  danger: "#dc2626",
  brandDark: "#000000",
  brandBlue: "#3b82f6",
};

export const authScreen = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.brandDark,
    justifyContent: "center",
  },
  tagline: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#e2e8f0",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    marginBottom: 12,
  },
  errorBox: {
    backgroundColor: "#450a0a",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#dc2626",
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 14,
    fontWeight: "500",
  },
});

export const shared = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#fff",
    marginBottom: 12,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonSecondary: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonSecondaryText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    marginBottom: 8,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#e2e8f0",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
});
