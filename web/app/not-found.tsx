import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap page">
      <header className="page-hero">
        <div className="eyebrow">404 · not on the record</div>
        <h1>No such page.</h1>
        <p>This card, fight or boxer is not on the PropBetEdge record, or the link is out of date.</p>
      </header>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link className="btn btn--gold" href="/fight-week">Fight Week</Link>
        <Link className="btn" href="/events">Schedule</Link>
        <Link className="btn" href="/fighters">Fighters</Link>
      </div>
    </div>
  );
}
