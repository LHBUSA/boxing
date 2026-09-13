import Link from "next/link";
import type { ReactNode } from "react";

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`eyebrow ${className}`}>{children}</div>;
}

// Three rope lines: the section divider of the whole site.
export function Ropes({ className = "" }: { className?: string }) {
  return <div className={`ropes ${className}`} aria-hidden="true"><span /><span /><span /></div>;
}

export function SectionHead({ title, kicker, meta, href, hrefLabel, id }: { title: string; kicker?: string; meta?: ReactNode; href?: string; hrefLabel?: string; id?: string }) {
  return (
    <header className="section-head" id={id}>
      <div>
        {kicker ? <Eyebrow>{kicker}</Eyebrow> : null}
        <h2 className="section-title">{title}</h2>
      </div>
      <div className="section-meta">
        {meta}
        {href ? <Link className="more-link" href={href}>{hrefLabel ?? "All"} <span aria-hidden="true">→</span></Link> : null}
      </div>
    </header>
  );
}

export type ChipKind = "verified" | "limited" | "first" | "pending" | "building" | "review" | "final" | "live" | "soon" | "neutral" | "derived" | "official";
export function Chip({ kind = "neutral", children, title }: { kind?: ChipKind; children: ReactNode; title?: string }) {
  return <span className={`chip chip--${kind}`} title={title}>{children}</span>;
}

// Intentional coverage state: what is known, what is not yet, and why.
export function StateNote({ title, children, kind = "building", compact = false, action }: { title: string; children?: ReactNode; kind?: ChipKind; compact?: boolean; action?: ReactNode }) {
  return (
    <div className={`state-note state-note--${kind}${compact ? " state-note--compact" : ""}`}>
      <span className="state-note__mark" aria-hidden="true" />
      <div>
        <div className="state-note__title">{title}</div>
        {children ? <div className="state-note__body">{children}</div> : null}
        {action ? <div className="state-note__action">{action}</div> : null}
      </div>
    </div>
  );
}

// Square ring frame with four corner posts: red, blue and two neutral corners.
export function RingFrame({ children, className = "", as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" | "article" }) {
  return (
    <Tag className={`ring ${className}`}>
      <span className="post post--tl" aria-hidden="true" />
      <span className="post post--tr" aria-hidden="true" />
      <span className="post post--bl" aria-hidden="true" />
      <span className="post post--br" aria-hidden="true" />
      {children}
    </Tag>
  );
}

export function Stat({ value, label, sub }: { value: ReactNode; label: string; sub?: ReactNode }) {
  return (
    <div className="stat">
      <div className="stat__value">{value}</div>
      <div className="stat__label">{label}</div>
      {sub ? <div className="stat__sub">{sub}</div> : null}
    </div>
  );
}

export function Crumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      {items.map((it, i) => (
        <span key={i}>
          {it.href ? <Link href={it.href}>{it.label}</Link> : <span aria-current="page">{it.label}</span>}
          {i < items.length - 1 ? <span className="crumbs__sep" aria-hidden="true">/</span> : null}
        </span>
      ))}
    </nav>
  );
}

export function SourceLine({ children }: { children: ReactNode }) {
  return <p className="source-line">{children}</p>;
}

export function Unavailable({ what }: { what: string }) {
  return (
    <div className="wrap page-pad">
      <StateNote kind="pending" title={`${what} is temporarily unavailable`}>
        The Boxing data service did not answer. Nothing is shown rather than a stale or guessed view. Try again shortly.
      </StateNote>
    </div>
  );
}
