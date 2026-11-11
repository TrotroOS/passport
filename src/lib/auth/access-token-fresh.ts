import type { NextRequest } from "next/server";

const REFRESH_SKEW_MS = 90_000;

function decodeJwtExpMs(token: string): number | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const json = JSON.parse(atob(padded)) as { exp?: number };
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

function parseSessionValue(raw: string): number | null {
  const candidates = [raw];
  try {
    candidates.push(decodeURIComponent(raw));
  } catch {
    // keep original
  }

  for (const value of candidates) {
    try {
      const parsed = JSON.parse(value) as {
        expires_at?: number;
        access_token?: string;
      };
      if (typeof parsed.expires_at === "number") {
        return parsed.expires_at > 1_000_000_000_000
          ? parsed.expires_at
          : parsed.expires_at * 1000;
      }
      if (parsed.access_token) {
        const exp = decodeJwtExpMs(parsed.access_token);
        if (exp) return exp;
      }
    } catch {
      // not JSON
    }

    if (value.split(".").length === 3) {
      const exp = decodeJwtExpMs(value);
      if (exp) return exp;
    }
  }

  return null;
}

function readAuthCookieValue(request: NextRequest): string | null {
  const cookies = request.cookies.getAll();
  const exact = cookies.find((cookie) => /^sb-[\w-]+-auth-token$/.test(cookie.name));
  if (exact?.value) return exact.value;

  const chunks = cookies
    .filter((cookie) => /^sb-[\w-]+-auth-token\.\d+$/.test(cookie.name))
    .sort(
      (a, b) =>
        Number(a.name.slice(a.name.lastIndexOf(".") + 1)) -
        Number(b.name.slice(b.name.lastIndexOf(".") + 1))
    );
  if (!chunks.length) return null;
  return chunks.map((cookie) => cookie.value).join("");
}

/** True when the access token is valid for at least 90s (skip Auth refresh). */
export function isAccessTokenFresh(request: NextRequest): boolean {
  const raw = readAuthCookieValue(request);
  if (!raw) return false;
  const expiresAt = parseSessionValue(raw);
  if (!expiresAt) return false;
  return expiresAt - Date.now() > REFRESH_SKEW_MS;
}
