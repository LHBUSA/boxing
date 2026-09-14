import Link from "next/link";
import type { Portrait } from "@/lib/types";

// Fighter imagery, rights-aware.
//  - A licensed portrait (recorded license, author, source) renders as a photo
//    with its credit line.
//  - Otherwise: the PropBetEdge boxer silhouette. It is a generic figure in a
//    high guard, lit from the boxer's corner under an arena spotlight, behind
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
  red: { rim: "#ff6b6b", glow: "rgba(211,58,63,0.55)", rope: "rgba(255,120,120,0.35)" },
  blue: { rim: "#6aa6ff", glow: "rgba(47,118,220,0.55)", rope: "rgba(120,170,255,0.35)" },
  neutral: { rim: "#ecc85e", glow: "rgba(212,175,55,0.35)", rope: "rgba(236,200,94,0.28)" },
} as const;

export function Silhouette({ id, corner, mirror = false }: { id: string; corner: "red" | "blue" | null; mirror?: boolean }) {
  const h = hash(id);
  const tone = LIGHT[corner ?? "neutral"];
  const k = `s${(h % 1e9).toString(36)}${mirror ? "m" : ""}`;
  const rg = ((h >> 5) % 13) - 6;
  const lg = ((h >> 9) % 13) - 6;
  const ropeTilt = ((h >> 13) % 7) - 3;
  const lightX = mirror ? 20 : 80;
  const figure = (
    <>
      <path d="M150 42 C124 42 111 62 111 90 C111 114 119 131 129 141 C131 151 129 162 125 170 C99 178 68 190 55 214 C39 244 33 300 29 380 L271 380 C267 300 261 244 245 214 C232 190 201 178 175 170 C171 162 169 151 171 141 C181 131 189 114 189 90 C189 62 176 42 150 42 Z" />
      <path d={`M60 304 C68 254 90 ${216 + rg} 103 ${194 + rg} L125 ${199 + rg} C114 ${226 + rg} 99 264 95 310 Z`} />
      <path d={`M240 310 C234 264 214 ${230 + lg} 199 ${206 + lg} L176 ${208 + lg} C189 ${236 + lg} 203 272 207 310 Z`} />
      <path d={`M86 ${150 + rg} C84 ${125 + rg} 102 ${112 + rg} 119 ${116 + rg} C136 ${120 + rg} 143 ${137 + rg} 141 ${158 + rg} C139 ${181 + rg} 128 ${198 + rg} 110 ${198 + rg} C93 ${198 + rg} 87 ${177 + rg} 86 ${150 + rg} Z`} />
      <path d={`M214 ${160 + lg} C216 ${134 + lg} 197 ${120 + lg} 179 ${124 + lg} C161 ${128 + lg} 154 ${146 + lg} 156 ${168 + lg} C158 ${192 + lg} 170 ${210 + lg} 189 ${210 + lg} C207 ${210 + lg} 213 ${188 + lg} 214 ${160 + lg} Z`} />
    </>
  );
  const cuffs = (
    <>
      <path d={`M94 ${186 + rg} C102 ${192 + rg} 122 ${192 + rg} 132 ${184 + rg}`} fill="none" stroke="rgba(255,245,220,0.10)" strokeWidth="3" />
      <path d={`M166 ${197 + lg} C176 ${205 + lg} 198 ${205 + lg} 207 ${196 + lg}`} fill="none" stroke="rgba(255,245,220,0.10)" strokeWidth="3" />
    </>
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
        <g>{cuffs}</g>
      </g>
    </svg>
  );
}

export function FighterArt({ name, id, corner = null, portrait = null, side = "a", variant = "card", className = "", credit = true, href }: {
  name: string; id: string; corner?: "red" | "blue" | null; portrait?: Portrait | null; side?: "a" | "b"; variant?: "card" | "thumb"; className?: string; credit?: boolean; href?: string;
}) {
  const tone = corner ?? (side === "a" ? "red" : "blue");
  const cls = `fart fart--${tone}${variant === "thumb" ? " fart--thumb" : ""} ${className}`;
  if (portrait && variant !== "thumb") {
    // eslint-disable-next-line @next/next/no-img-element
    const img = <img src={portrait.src} alt={name} width={portrait.width ?? 800} height={portrait.height ?? 1000} loading="lazy" decoding="async"
      style={portrait.focus ? { objectPosition: portrait.focus } : undefined} />;
    return (
      <figure className={cls} style={{ margin: 0 }}>
        {href ? <Link href={href} className="fart__hit">{img}</Link> : img}
        {credit ? (
          <figcaption className="fart__credit">
            Photo: {portrait.credit} · <a href={portrait.license_url ?? portrait.source_url} target="_blank" rel="noopener noreferrer">{portrait.license}</a>
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
