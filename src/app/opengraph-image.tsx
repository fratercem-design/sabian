import { ImageResponse } from "next/og";
import { brand, designTokens } from "@/lib/config";

export const alt = "The Psyche Symbols — 360 original degree images";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Social preview card.
 *
 * Drawn from the same restrained vocabulary as the existing book cover —
 * midnight ground, concentric signal rings, 12 chamber marks, one active gold
 * degree — rather than a photographic or AI-generated image. No text is baked
 * into artwork elsewhere in the product; here the title IS the content, which
 * is what a social card is for.
 *
 * This is intentionally generated rather than copied so no master asset under
 * outputs/ is touched. Phase 2 may replace it with an approved derivative of
 * the cover plate.
 */
export default function OpengraphImage() {
  const ticks = Array.from({ length: 60 }, (_, i) => (i / 60) * 360);
  const chambers = Array.from({ length: 12 }, (_, i) => (i / 12) * 360);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: designTokens.midnight,
          fontFamily: "serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 78% 50%, rgba(111,75,139,0.45) 0%, rgba(11,16,32,0) 62%)",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", padding: "0 72px", width: 700 }}>
          <div
            style={{
              fontSize: 20,
              letterSpacing: 6,
              color: designTokens.gold,
              fontFamily: "sans-serif",
            }}
          >
            A CULT OF PSYCHE WORK
          </div>
          <div
            style={{
              marginTop: 20,
              fontSize: 82,
              lineHeight: 1.02,
              color: "#FBF6EA",
            }}
          >
            {brand.name}
          </div>
          <div style={{ marginTop: 26, fontSize: 31, color: "#D8BD68" }}>
            360 mirrors of signal, shadow, and sovereignty
          </div>
          <div
            style={{
              marginTop: 26,
              fontSize: 23,
              lineHeight: 1.45,
              color: designTokens.silverMoon,
              fontFamily: "sans-serif",
            }}
          >
            Your chart locates the degree. The symbol opens the question.
          </div>
        </div>

        <svg width="430" height="430" viewBox="0 0 240 240" style={{ marginLeft: 8 }}>
          <circle cx="120" cy="120" r="112" fill="none" stroke={designTokens.gold} strokeOpacity="0.35" strokeWidth="1" />
          <circle cx="120" cy="120" r="86" fill="none" stroke={designTokens.violetDust} strokeOpacity="0.55" strokeWidth="1" />
          <circle cx="120" cy="120" r="54" fill="none" stroke={designTokens.silverMoon} strokeOpacity="0.4" strokeWidth="1" />
          {ticks.map((deg) => {
            const rad = ((deg - 90) * Math.PI) / 180;
            return (
              <circle
                key={`t${deg}`}
                cx={120 + Math.cos(rad) * 100}
                cy={120 + Math.sin(rad) * 100}
                r="1.1"
                fill={designTokens.silverMoon}
                fillOpacity="0.5"
              />
            );
          })}
          {chambers.map((deg) => {
            const rad = ((deg - 90) * Math.PI) / 180;
            return (
              <circle
                key={`c${deg}`}
                cx={120 + Math.cos(rad) * 112}
                cy={120 + Math.sin(rad) * 112}
                r="2.6"
                fill={designTokens.gold}
                fillOpacity="0.8"
              />
            );
          })}
          {/* One active degree. */}
          <circle cx={120 + Math.cos((-42 * Math.PI) / 180) * 100} cy={120 + Math.sin((-42 * Math.PI) / 180) * 100} r="5" fill="#D8BD68" />
          <circle cx="120" cy="120" r="6" fill={designTokens.gold} />
        </svg>
      </div>
    ),
    size
  );
}
