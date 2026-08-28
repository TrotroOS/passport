export async function register() {
  if (process.env.SKIP_ENV_VALIDATION === "true") return;
  const { validateProductionEnvironment } = await import("@/lib/env");
  validateProductionEnvironment();
}
