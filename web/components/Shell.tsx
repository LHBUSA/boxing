import Link from "next/link";
import { gateway, todayUtc } from "@/lib/gateway";
import { daysBetween, fmtDateShort, methodLabel, shortEventName, winnerLoser } from "@/lib/format";
import { eventPath } from "@/lib/slug";
import { MORE_NAV, NETWORK, PRIMARY_NAV, SITE, filterNav } from "@/lib/nav";
import { navAvailability } from "@/lib/availability";
import { DesktopNav, MobileNav } from "./Nav";

export function RingGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 9.5h18M3 14.5h18" stroke="currentColor" strokeWidth="1.1" opacity=".6" />
      <rect x="1.5" y="1.5" width="4" height="4" rx="1" fill="#d33a3f" />
      <rect x="18.5" y="18.5" width="4" height="4" rx="1" fill="#2f76dc" />
    </svg>
  );
}

export function Arena() {
  return (
    <div className="arena" aria-hidden="true">
      <svg viewBox="0 0 1800 520" preserveAspectRatio="none">
        <defs>
          <linearGradient id="rope" x1="0" x2="1">
            <stop offset="0" stopColor="#d33a3f" stopOpacity="0.9" />
            <stop offset="0.5" stopColor="#f6f2ea" stopOpacity="0.5" />
            <stop offset="1" stopColor="#2f76dc" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M-40 ${240 + i * 70} C 500 ${170 + i * 64}, 1300 ${170 + i * 64}, 1840 ${240 + i * 70}`} fill="none" stroke="url(#rope)" strokeWidth={i === 1 ? 3 : 2} />
        ))}
      </svg>
    </div>
  );
}

async function nextCard() {
  const up = await gateway.events("upcoming", { limit: 1 });
  if (!up.ok || !up.data.rows.length) return null;
  const e = up.data.rows[0];
  const d = daysBetween(todayUtc(), e.date);
  const label = d <= 0 ? "Fight night" : d <= 6 ? "Fight week" : "Next card";
  return { label, date: fmtDateShort(e.date), href: d <= 6 ? "/fight-week" : eventPath(e) };
}

export async function Header() {
  const [next, available] = await Promise.all([nextCard(), navAvailability()]);
  const primary = filterNav(PRIMARY_NAV, available);
  const more = filterNav(MORE_NAV, available);
  return (
    <header className="hdr">
      <div className="wrap hdr__in">
        <Link href="/" className="brand" aria-label="PropBetEdge Boxing home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand__mark" src={SITE.mark} alt="" width={66} height={26} />
          <span className="brand__word">PropBet<em>Edge</em></span>
          <span className="brand__tag">BOXING</span>
        </Link>
        <DesktopNav primary={primary} more={more} />
        <div className="hdr__right">
          {next ? (
            <Link href={next.href} className="next-chip" aria-label={`${next.label}: ${next.date}`}>
              <i aria-hidden="true" />
              <span><b>{next.label}</b>{next.date}</span>
            </Link>
          ) : null}
          <MobileNav items={[...primary, ...more]} next={next ? { label: `${next.label} · ${next.date}`, href: next.href } : null} />
        </div>
      </div>
    </header>
  );
}

export async function Wire() {
  const [up, done] = await Promise.all([gateway.events("upcoming", { limit: 4 }), gateway.events("results", { limit: 6 })]);
  if (!up.ok && !done.ok) return null;
  const items: { key: string; kind: "final" | "next"; href: string; text: React.ReactNode }[] = [];
  for (const e of done.ok ? done.data.rows : []) {
    const h = e.headline;
    const { winner, loser } = h ? winnerLoser(h) : { winner: null, loser: null };
    if (!winner || !loser || !h?.result) continue;
    items.push({ key: e.public_id, kind: "final", href: eventPath(e), text: <><b>{winner.name}</b> def. {loser.name} · {methodLabel(h.result, true)} · {fmtDateShort(e.date)}</> });
  }
  for (const e of up.ok ? up.data.rows : []) {
    items.push({ key: e.public_id, kind: "next", href: eventPath(e), text: <><b>{shortEventName(e.name, e.venue)}</b> · {fmtDateShort(e.date)} · {e.commission?.jurisdiction ?? ""}</> });
  }
  if (!items.length) return null;
  return (
    <div className="wire" aria-label="Boxing wire">
      <div className="wrap wire__in">
        <span className="wire__label"><i aria-hidden="true" />Boxing wire</span>
        <div className="wire__list">
          {items.map((it) => (
            <Link key={`${it.kind}-${it.key}`} href={it.href} className="wire__item">
              <span className={`wire__k wire__k--${it.kind}`}>{it.kind === "final" ? "Final" : "Next"}</span>
              <span>{it.text}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export async function Footer() {
  const available = await navAvailability();
  const primary = filterNav(PRIMARY_NAV, available);
  const more = filterNav(MORE_NAV, available);
  return (
    <footer className="ftr">
      <div className="wrap ftr__grid">
        <div className="ftr__about">
          <Link href="/" className="brand" aria-label="PropBetEdge Boxing home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="brand__mark" src={SITE.mark} alt="" width={66} height={26} loading="lazy" />
            <span className="brand__word">PropBet<em>Edge</em></span>
            <span className="brand__tag">BOXING</span>
          </Link>
          <p>Every fact starts on an official athletic commission record and links back to it. Values marked PropBetEdge-derived are our computations, always with their sample. Unknown stays unknown.</p>
        </div>
        <div className="ftr__cols">
          <div>
            <h4>Boxing</h4>
            {primary.slice(0, 4).map((n) => <Link key={n.href} href={n.href}>{n.label}</Link>)}
          </div>
          <div>
            <h4>Intelligence</h4>
            {[...primary.slice(4), ...more].map((n) => <Link key={n.href} href={n.href}>{n.label}</Link>)}
          </div>
          <div>
            <h4>PropBetEdge</h4>
            {NETWORK.map((s) => <a key={s.key} href={s.href}>{s.label}</a>)}
          </div>
        </div>
      </div>
      <div className="wrap ftr__legal">No picks or probabilities are published: the PropBetEdge bout model is untrained. Fighter photos appear only with a recorded license and credit. 21+. Gamble responsibly.</div>
    </footer>
  );
}
