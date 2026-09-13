import type { Metadata } from "next";
import Link from "next/link";
import { gateway } from "@/lib/gateway";
import { fmtDate, plural } from "@/lib/format";
import { Note, Unavailable } from "@/components/fight";

export const revalidate = 1800;
export const metadata: Metadata = { title: "Promoters", description: "Boxing promoters exactly as listed on official commission sheets, with their cards, venues and the fighters appearing on them." };

const COMM: Record<string, string> = { nsac: "Nevada", "fl-athletic-commission": "Florida", "nj-sacb": "New Jersey" };

export default async function PromotersPage() {
  const res = await gateway.promoters();
  if (!res.ok) return <Unavailable what="Promoters" />;
  const d = res.data;
  return (
    <div className="wrap page">
      <header className="page-hero">
        <div className="eyebrow">Promoters · as listed on official sheets</div>
        <h1>Who put the cards on.</h1>
        <p>{plural(d.listed_names, "promoter name")} across {plural(d.cards_with_sheet, "card")}, exactly as each commission sheet lists them. Spellings are not merged, and appearing on a promoter&apos;s card never implies a fighter is signed to that promoter.</p>
      </header>
      {!d.rows.length ? <Note title="No promoter listed on a filed sheet yet" /> : (
        <div className="mgrid mgrid--3">
          {d.rows.map((p) => (
            <Link key={p.key} href={`/promoters/${p.key}`} className="ncard">
              <div className="ncard__name" style={{ fontFamily: "var(--f-display)", fontSize: 22, fontWeight: 800 }}>{p.name}</div>
              <div className="ncard__meta">{plural(p.cards, "card")} · {plural(p.bouts, "verified bout")}</div>
              <div className="ncard__state"><span className="tag tag--gold">Last {fmtDate(p.last_date, { year: false })}</span>{p.commissions.map((c) => <span key={c} className="tag">{COMM[c] ?? c}</span>)}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
