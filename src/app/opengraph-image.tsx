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
          background: "#0d0d0d",
          color: "#f8fafc",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 12,
              background: "#0d0d0d",
              border: "1px solid #262626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 42,
              fontWeight: 800,
              color: "#f97316",
            }}
          >
            S
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: 4 }}>{SITE_NAME.toUpperCase()}</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#f97316", letterSpacing: 3 }}>
              GLOBAL TRADE INTELLIGENCE
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 920 }}>
          <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1 }}>
            Clear customs with confidence — before you file
          </div>
          <div style={{ fontSize: 28, lineHeight: 1.4, color: "#a3a3a3" }}>
            {DEFAULT_DESCRIPTION}
          </div>
        </div>

        <div style={{ fontSize: 22, color: "#737373" }}>
          Trade compliance · Ghana · Nigeria · Kenya · African import corridors
        </div>
      </div>
    ),
    { ...size }
  );
}
