import Link from "next/link";

// Ring mark: a square canvas, three ropes, red and blue corner posts.
export function RingMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true" className="ringmark">
      <rect x="3" y="3" width="22" height="22" fill="none" stroke="rgba(239,232,218,.55)" strokeWidth="1" />
      <line x1="3" x2="25" y1="10" y2="10" stroke="rgba(239,232,218,.35)" strokeWidth="1" />
      <line x1="3" x2="25" y1="14" y2="14" stroke="rgba(239,232,218,.35)" strokeWidth="1" />
      <line x1="3" x2="25" y1="18" y2="18" stroke="rgba(239,232,218,.35)" strokeWidth="1" />
      <rect x="0" y="0" width="6" height="6" fill="var(--red)" />
      <rect x="22" y="22" width="6" height="6" fill="var(--blue)" />
      <rect x="22" y="0" width="6" height="6" fill="#d7dbe1" />
      <rect x="0" y="22" width="6" height="6" fill="#d7dbe1" />
    </svg>
  );
}

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="PropBetEdge Boxing home">
      <RingMark />
      <span className="brand__text">
        <span className="brand__pbe">PropBetEdge</span>
        <span className="brand__sport">Boxing</span>
      </span>
    </Link>
  );
}
