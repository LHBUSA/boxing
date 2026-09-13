"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { NavItem } from "@/lib/nav";

const on = (path: string, href: string) => path === href || path.startsWith(`${href}/`);

export function DesktopNav({ primary, more }: { primary: NavItem[]; more: NavItem[] }) {
  const path = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", click); document.removeEventListener("keydown", key); };
  }, [open]);
  return (
    <nav className="nav" aria-label="Primary">
      {primary.map((n) => <Link key={n.href} href={n.href} className={on(path, n.href) ? "is-on" : ""} aria-current={on(path, n.href) ? "page" : undefined}>{n.label}</Link>)}
      <div className="more" ref={ref}>
        <button type="button" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((v) => !v)}>More ▾</button>
        {open ? (
          <div className="more__panel" role="menu">
            {more.map((n) => <Link key={n.href} href={n.href} role="menuitem">{n.label}<span>{n.blurb}</span></Link>)}
          </div>
        ) : null}
      </div>
    </nav>
  );
}

export function MobileNav({ items, next }: { items: NavItem[]; next: { label: string; href: string } | null }) {
  const path = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", key);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", key); };
  }, [open]);
  return (
    <>
      <button type="button" className="menu-btn" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="drawer" onClick={() => setOpen((v) => !v)}>
        <span /><span /><span />
      </button>
      {open ? (
        <div id="drawer" className="drawer" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="drawer__links">
            <Link href="/" className={path === "/" ? "is-on" : ""}>Home</Link>
            {items.map((n) => <Link key={n.href} href={n.href} className={on(path, n.href) ? "is-on" : ""}>{n.label}{n.blurb ? <small>{n.blurb.split(",")[0]}</small> : null}</Link>)}
          </div>
          {next ? <div className="drawer__foot"><Link className="btn btn--gold" href={next.href}>{next.label}</Link></div> : null}
        </div>
      ) : null}
    </>
  );
}
