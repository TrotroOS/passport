import { ImageResponse } from "next/og";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_NAME } from "@/lib/seo/site";

export const runtime = "edge";

export const alt = DEFAULT_TITLE;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #2563eb 100%)",
          color: "#f8fafc",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "9999px",
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 700,
              color: "#2563eb",
            }}
          >
            P
          </div>
          <div style={{ fontSize: 40, fontWeight: 700 }}>{SITE_NAME}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 920 }}>
          <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1 }}>
            Clear customs with confidence — before you file
          </div>
          <div style={{ fontSize: 28, lineHeight: 1.4, color: "#cbd5e1" }}>
            {DEFAULT_DESCRIPTION}
          </div>
        </div>

        <div style={{ fontSize: 22, color: "#94a3b8" }}>
          Trade compliance · Ghana · Nigeria · Kenya · African import corridors
        </div>
      </div>
    ),
    { ...size }
  );
}
