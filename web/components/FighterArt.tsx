import Link from "next/link";
import type { Portrait } from "@/lib/types";
import { portraitAsset, type ArtVariant } from "@/lib/media";

// Fighter imagery, rights-aware.
//  - A licensed portrait (recorded license, author, source) renders as a photo
//    with its credit line.
//  - Otherwise: the PropBetEdge boxer silhouette. It is a generic figure in a
//    high guard (gloves in the corner color), lit from the boxer's corner under an arena spotlight, behind
//    ring ropes. It never depicts a face and is never presented as a likeness.
//  - `href` links the art to a page. The link wraps only the image, never the credit line: the
//    credit carries its own license link, and a link inside a link is invalid HTML (it broke
//    hydration on fight and scorecard pages).

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const LIGHT = {
  red: { rim: "#ff6b6b", glow: "rgba(211,58,63,0.55)", rope: "rgba(255,120,120,0.35)", glove: "#5a1c1f", glove2: "#2a0c0e" },
  blue: { rim: "#6aa6ff", glow: "rgba(47,118,220,0.55)", rope: "rgba(120,170,255,0.35)", glove: "#1c3558", glove2: "#0b1626" },
  neutral: { rim: "#ecc85e", glow: "rgba(212,175,55,0.35)", rope: "rgba(236,200,94,0.28)", glove: "#4a3a17", glove2: "#1f180a" },
} as const;

export function Silhouette({ id, corner, mirror = false }: { id: string; corner: "red" | "blue" | null; mirror?: boolean }) {
  const h = hash(id);
  const tone = LIGHT[corner ?? "neutral"];
  const k = `s${(h % 1e9).toString(36)}${mirror ? "m" : ""}`;
  const rg = ((h >> 5) % 9) - 4;
  const lg = ((h >> 9) % 9) - 4;
  const ropeTilt = ((h >> 13) % 7) - 3;
  const lightX = mirror ? 20 : 80;
  // One boxer in a high guard: head and shoulders, forearms up, gloves in the corner color in front of the chin.
  // Gloves are smaller than the head and tinted so they never read as extra heads.
  const figure = (
    <path d="M150 42 C128 42 115 60 115 86 C115 108 124 124 135 131 L136 150 C104 154 76 164 62 182 C46 204 40 260 36 380 L264 380 C260 260 254 204 238 182 C224 164 196 154 164 150 L165 131 C176 124 185 108 185 86 C185 60 172 42 150 42 Z" />
  );
  const glove = (cx: number, dy: number, dir: 1 | -1, tilt: number) => (
    <g transform={`rotate(${tilt} ${cx} ${167 + dy})`}>
      <path d={`M${cx - 25} ${150 + dy} C${cx - 25} ${133 + dy} ${cx - 13} ${124 + dy} ${cx} ${124 + dy} C${cx + 15} ${124 + dy} ${cx + 25} ${134 + dy} ${cx + 25} ${152 + dy} L${cx + 25} ${184 + dy} C${cx + 25} ${200 + dy} ${cx + 13} ${210 + dy} ${cx} ${210 + dy} C${cx - 14} ${210 + dy} ${cx - 25} ${200 + dy} ${cx - 25} ${184 + dy} Z`} />
      <path d={`M${cx + dir * 24} ${150 + dy} C${cx + dir * 34} ${152 + dy} ${cx + dir * 34} ${174 + dy} ${cx + dir * 24} ${178 + dy}`} strokeOpacity="0.5" />
      <path d={`M${cx - 22} ${197 + dy} C${cx - 10} ${204 + dy} ${cx + 10} ${204 + dy} ${cx + 22} ${197 + dy}`} fill="none" stroke="rgba(255,245,220,0.16)" strokeWidth="3" />
    </g>
  );
  return (
    <svg viewBox="0 0 300 375" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id={`${k}sp`} cx={`${lightX}%`} cy="-5%" r="95%">
          <stop offset="0" stopColor="rgba(255,236,190,0.30)" />
          <stop offset="0.45" stopColor="rgba(255,236,190,0.06)" />
          <stop offset="1" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <radialGradient id={`${k}cg`} cx={mirror ? "100%" : "0%"} cy="100%" r="85%">
          <stop offset="0" stopColor={tone.glow} />
          <stop offset="1" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <linearGradient id={`${k}body`} x1={mirror ? "1" : "0"} y1="0" x2={mirror ? "0" : "1"} y2="1">
          <stop offset="0" stopColor="#3a3027" />
          <stop offset="0.35" stopColor="#1d1813" />
          <stop offset="1" stopColor="#0a0806" />
        </linearGradient>
        <linearGradient id={`${k}gl`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={tone.glove} />
          <stop offset="1" stopColor={tone.glove2} />
        </linearGradient>
        <filter id={`${k}blur`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.4" /></filter>
      </defs>
      <rect width="300" height="375" fill="#0c0a08" />
      <rect width="300" height="375" fill={`url(#${k}sp)`} />
      <rect width="300" height="375" fill={`url(#${k}cg)`} />
      <g stroke={tone.rope} strokeWidth="2.2" opacity="0.9">
        <line x1="-10" y1={238 + ropeTilt} x2="310" y2={230 - ropeTilt} />
        <line x1="-10" y1={272 + ropeTilt} x2="310" y2={264 - ropeTilt} />
        <line x1="-10" y1={306 + ropeTilt} x2="310" y2={298 - ropeTilt} />
      </g>
      <g transform={mirror ? "translate(300 0) scale(-1 1)" : undefined}>
        <g fill="none" stroke={tone.rim} strokeWidth="5" opacity="0.75" filter={`url(#${k}blur)`} transform="translate(5 -2)">{figure}</g>
        <g fill={`url(#${k}body)`}>{figure}</g>
        <g fill="#171310" stroke="rgba(255,245,220,0.05)" strokeWidth="1.5">
          <path d={`M52 330 C54 286 70 240 100 ${204 + rg} L134 ${210 + rg} C114 244 98 290 92 336 Z`} />
          <path d={`M248 330 C246 286 230 240 200 ${204 + lg} L166 ${210 + lg} C186 244 202 290 208 336 Z`} />
        </g>
        <g fill={`url(#${k}gl)`} stroke={tone.rim} strokeOpacity="0.35" strokeWidth="1.5">
          {glove(118, rg, 1, -9)}
          {glove(182, lg, -1, 9)}
        </g>
      </g>
    </svg>
  );
}

export function FighterArt({ name, id, corner = null, portrait = null, side = "a", variant = "card", className = "", credit = true, href, priority = false }: {
  name: string; id: string; corner?: "red" | "blue" | null; portrait?: Portrait | null; side?: "a" | "b"; variant?: ArtVariant; className?: string; credit?: boolean; href?: string; priority?: boolean;
}) {
  const tone = corner ?? (side === "a" ? "red" : "blue");
  const shape = variant === "thumb" ? " fart--thumb" : variant === "avatar" ? " fart--avatar" : variant === "square" ? " fart--square"
    : variant === "wide" ? " fart--wide" : variant === "hero" ? " fart--hero" : "";
  const cls = `fart fart--${tone}${shape} ${className}`;
  // an approved portrait renders in every shape, using the crop made for that shape (lib/media.ts)
  const asset = portraitAsset(portrait, variant);
  if (asset) {
    // eslint-disable-next-line @next/next/no-img-element
    const img = <img src={asset.src} srcSet={asset.srcSet} sizes={asset.sizes} alt={name} width={asset.width} height={asset.height}
      loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} decoding="async"
      style={asset.focus ? { objectPosition: asset.focus } : undefined} />;
    // a credit line cannot live inside a card that is itself a link (invalid HTML, broke hydration), so small shapes
    // carry their credit through the card's own PhotoCredits line instead
    const showCredit = credit && variant !== "thumb" && variant !== "avatar";
    return (
      <figure className={cls} style={{ margin: 0 }}>
        {href ? <Link href={href} className="fart__hit">{img}</Link> : img}
        {showCredit ? (
          <figcaption className="fart__credit">
            Photo: {asset.credit} · <a href={asset.license_url ?? asset.source_url} target="_blank" rel="noopener noreferrer">{asset.license}</a>
          </figcaption>
        ) : null}
      </figure>
    );
  }
  const silhouette = <Silhouette id={id} corner={tone === "red" || tone === "blue" ? tone : null} mirror={side === "b"} />;
  if (href) return <Link href={href} className={cls} aria-label={`${name}: no licensed photo on file`}>{silhouette}</Link>;
  return (
    <div className={cls} role="img" aria-label={`${name}: no licensed photo on file`}>
      {silhouette}
    </div>
  );
}
