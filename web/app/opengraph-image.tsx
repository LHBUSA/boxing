import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "PropBetEdge Boxing";

// Our own visual system only: ring canvas, ropes, red and blue corner posts.
export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#07090c", padding: 64, position: "relative", color: "#efe8da" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 40, height: 40, background: "#d9473d" }} />
        <div style={{ position: "absolute", right: 0, bottom: 0, width: 40, height: 40, background: "#3f86dc" }} />
        <div style={{ position: "absolute", right: 0, top: 0, width: 40, height: 40, background: "#d7dbe1" }} />
        <div style={{ position: "absolute", left: 0, bottom: 0, width: 40, height: 40, background: "#d7dbe1" }} />
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 6, color: "#a4aebb" }}>PROPBETEDGE</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 150, fontWeight: 800, letterSpacing: -2, lineHeight: 1 }}>BOXING</div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 26, gap: 8 }}>
            {[0.35, 0.22, 0.12].map((o) => <div key={o} style={{ display: "flex", height: 2, width: 900, background: `rgba(239,232,218,${o})` }} />)}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#c9ced6" }}>Fight weekends · verified records · scorecards · titles</div>
      </div>
    ),
    size,
  );
}
