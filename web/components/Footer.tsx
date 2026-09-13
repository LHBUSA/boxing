import Link from "next/link";
import { RingMark } from "./Brand";

export function Footer() {
  return (
    <footer className="ftr">
      <div className="wrap ftr__inner">
        <div className="ftr__brand">
          <RingMark size={22} />
          <div>
            <div className="ftr__name">PropBetEdge Boxing</div>
            <p className="ftr__note">
              Facts come from official athletic commission records (Nevada, Florida, New Jersey), each linked to its source.
              Values marked <strong>PropBetEdge-derived</strong> are our computations from those records, with sample sizes.
              Unknown facts are shown as unknown, never estimated.
            </p>
          </div>
        </div>
        <div className="ftr__cols">
          <div>
            <div className="eyebrow">Explore</div>
            <Link href="/fight-week">Fight Week</Link>
            <Link href="/events">Events</Link>
            <Link href="/fighters">Fighters</Link>
            <Link href="/titles">World Title Map</Link>
            <Link href="/rankings">Rankings</Link>
          </div>
          <div>
            <div className="eyebrow">Standards</div>
            <Link href="/methodology">Methodology</Link>
            <Link href="/methodology#sources">Sources</Link>
            <Link href="/methodology#coverage">Coverage</Link>
          </div>
        </div>
      </div>
      <div className="wrap ftr__legal">
        No probabilities or picks are published: the PropBetEdge bout model is untrained. No promoter or sanctioning-body logos are used. Please gamble responsibly.
      </div>
    </footer>
  );
}
