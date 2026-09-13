import { initials } from "@/lib/format";

// No licensed boxer photography exists yet. Instead of a scraped photo or an
// AI likeness, every boxer gets a deterministic PropBetEdge composition: a
// ring-canvas square, the boxer's monogram, rope lines at a per-boxer angle and
// a corner post in their corner colour (red, blue, or neutral when the sheet
// does not say). Same boxer, same composition, everywhere.

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function Portrait({ name, id, corner = null, size = 160, className = "" }: { name: string; id: string; corner?: "red" | "blue" | null; size?: number; className?: string }) {
  const h = hash(id);
  const angle = [-18, -9, 9, 18][h % 4];
  const offset = (h >> 3) % 24;
  const post = corner === "red" ? "var(--red)" : corner === "blue" ? "var(--blue)" : "var(--neutral-corner)";
  const mono = initials(name);
  const gid = `p${h.toString(36)}`;
  return (
    <svg className={`portrait ${className}`} width={size} height={size} viewBox="0 0 160 160" role="img" aria-label={`${name}: PropBetEdge monogram (no licensed photo)`}>
      <defs>
        <linearGradient id={`${gid}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1a212c" />
          <stop offset="1" stopColor="#0b0f14" />
        </linearGradient>
        <pattern id={`${gid}grid`} width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M16 0H0V16" fill="none" stroke="rgba(239,232,218,0.05)" strokeWidth="1" />
        </pattern>
        <clipPath id={`${gid}c`}><rect x="0" y="0" width="160" height="160" /></clipPath>
      </defs>
      <rect width="160" height="160" fill={`url(#${gid}g)`} />
      <rect width="160" height="160" fill={`url(#${gid}grid)`} />
      <g clipPath={`url(#${gid}c)`} transform={`rotate(${angle} 80 80)`} opacity="0.5">
        {[0, 1, 2].map((i) => (
          <line key={i} x1="-40" x2="200" y1={104 + offset + i * 9} y2={104 + offset + i * 9} stroke="rgba(239,232,218,0.22)" strokeWidth={i === 1 ? 1.5 : 1} />
        ))}
      </g>
      <text x="80" y="92" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="700" fontSize={mono.length > 1 ? 62 : 70} letterSpacing="2" fill="#efe8da">{mono}</text>
      <rect x="0" y="0" width="12" height="12" fill={post} />
      <rect x="0.5" y="0.5" width="159" height="159" fill="none" stroke="rgba(239,232,218,0.14)" />
    </svg>
  );
}
