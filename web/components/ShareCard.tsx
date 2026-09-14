// Share-image layouts (1200x630, rendered by next/og). PropBetEdge's own visual system only: warm ink, gold, red and
// blue corners, ring ropes. No fighter photos (share images are not licensed uses) and no likenesses.

export const SHARE_SIZE = { width: 1200, height: 630 };
const INK = "#110e0b";
const PAPER = "#f6f2ea";
const GOLD = "#d4af37";
const RED = "#d33a3f";
const BLUE = "#2f76dc";

function Frame({ eyebrow, footer, children }: { eyebrow: string; footer: string; children: React.ReactNode }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: INK, color: PAPER, padding: "56px 64px", position: "relative" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 14, background: RED, display: "flex" }} />
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 14, background: BLUE, display: "flex" }} />
      <div style={{ position: "absolute", left: 14, right: 14, bottom: 104, display: "flex", flexDirection: "column", gap: 10 }}>
        {[0.16, 0.1, 0.06].map((o) => <div key={o} style={{ display: "flex", height: 3, background: `rgba(212,175,55,${o})` }} />)}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 24, letterSpacing: 5, color: GOLD }}>
        <span style={{ display: "flex" }}>PROPBETEDGE BOXING</span>
        <span style={{ display: "flex", color: "rgba(246,242,234,0.55)", letterSpacing: 3 }}>{eyebrow.toUpperCase()}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>{children}</div>
      <div style={{ display: "flex", fontSize: 26, color: "rgba(246,242,234,0.72)" }}>{footer}</div>
    </div>
  );
}

const fit = (name: string, base: number) => (name.length > 22 ? Math.round(base * 0.62) : name.length > 16 ? Math.round(base * 0.78) : base);

export function FightShare({ a, b, verdict, meta, eyebrow }: { a: string; b: string; verdict: string | null; meta: string; eyebrow: string }) {
  const size = Math.min(fit(a, 92), fit(b, 92));
  return (
    <Frame eyebrow={eyebrow} footer={meta}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", fontSize: size, fontWeight: 800, lineHeight: 1.02, letterSpacing: -1 }}>{a}</div>
        <div style={{ display: "flex", fontSize: 44, fontStyle: "italic", color: GOLD, fontWeight: 700 }}>vs</div>
        <div style={{ display: "flex", fontSize: size, fontWeight: 800, lineHeight: 1.02, letterSpacing: -1 }}>{b}</div>
      </div>
      {verdict ? <div style={{ display: "flex", marginTop: 26, fontSize: 34, color: GOLD, fontWeight: 700 }}>{verdict}</div> : null}
    </Frame>
  );
}

export function CardShare({ name, lines, eyebrow, meta }: { name: string; lines: string[]; eyebrow: string; meta: string }) {
  return (
    <Frame eyebrow={eyebrow} footer={meta}>
      <div style={{ display: "flex", fontSize: fit(name, 84) > 70 && name.length > 30 ? 60 : fit(name, 84), fontWeight: 800, lineHeight: 1.04, letterSpacing: -1, maxWidth: 1040 }}>{name}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 24 }}>
        {lines.slice(0, 3).map((l) => <div key={l} style={{ display: "flex", fontSize: 32, color: "rgba(246,242,234,0.86)" }}>{l}</div>)}
      </div>
    </Frame>
  );
}

export function BrandShare() {
  return (
    <Frame eyebrow="fight intelligence" footer="Every card on the official record · scorecards · officials · titles · Hall of Fame">
      <div style={{ display: "flex", fontSize: 150, fontWeight: 800, letterSpacing: -3, lineHeight: 1 }}>BOXING</div>
      <div style={{ display: "flex", marginTop: 18, fontSize: 36, color: GOLD }}>Verified records. Official cards. No guesses.</div>
    </Frame>
  );
}
