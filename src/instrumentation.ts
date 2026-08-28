export async function register() {
  // Env validation uses Node-only APIs; skip edge runtime (middleware bundle).
  if (process.env.NEXT_RUNTIME === "edge") return;
  if (process.env.SKIP_ENV_VALIDATION === "true") return;
  if (process.env.NODE_ENV !== "production") return;

  const { validateProductionEnvironment } = await import("@/lib/env");
  validateProductionEnvironment();
}
