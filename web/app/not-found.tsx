import Link from "next/link";
import { Eyebrow, RingFrame } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="wrap page-pad">
      <RingFrame className="nf">
        <Eyebrow>404 · not on the record</Eyebrow>
        <h1 className="page-title">No such page</h1>
        <p className="page-lede">This event, bout or boxer is not on PropBetEdge record, or the link is out of date.</p>
        <div className="marquee__actions">
          <Link className="btn btn--primary" href="/fight-week">Fight Week</Link>
          <Link className="btn" href="/events">Events</Link>
          <Link className="btn" href="/fighters">Fighters</Link>
        </div>
      </RingFrame>
    </div>
  );
}
