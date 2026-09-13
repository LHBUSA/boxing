"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { NavItem } from "@/lib/nav";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Item({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate?: () => void }) {
  if (item.status !== "live") {
    return (
      <span className="nav-item nav-item--soon" aria-disabled="true" title={`${item.blurb ?? item.label}: opening in a later phase`}>
        {item.label}<span className="soon-tag">Soon</span>
      </span>
    );
  }
  const active = isActive(pathname, item.href);
  return (
    <Link href={item.href} className={`nav-item${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined} onClick={onNavigate}>
      {item.label}
    </Link>
  );
}

export function DesktopNav({ primary, more }: { primary: NavItem[]; more: NavItem[] }) {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);
  const moreActive = more.some((m) => m.status === "live" && isActive(pathname, m.href));
  return (
    <nav className="nav-desktop" aria-label="Primary">
      {primary.map((item) => <Item key={item.href} item={item} pathname={pathname} />)}
      <div className="more" ref={ref}>
        <button type="button" className={`nav-item more__btn${moreActive ? " is-active" : ""}`} aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((v) => !v)}>
          More <span aria-hidden="true" className="caret">▾</span>
        </button>
        {open ? (
          <div className="more__panel" role="menu">
            {more.map((item) => (
              <div key={item.href} role="menuitem" className="more__row">
                <Item item={item} pathname={pathname} onNavigate={() => setOpen(false)} />
                {item.blurb ? <span className="more__blurb">{item.blurb}</span> : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </nav>
  );
}

export function MobileNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [open]);
  const live = items.filter((i) => i.status === "live");
  const soon = items.filter((i) => i.status !== "live");
  return (
    <div className="nav-mobile">
      <button type="button" className="menu-btn" aria-expanded={open} aria-controls="mobile-drawer" onClick={() => setOpen((v) => !v)}>
        <span className="menu-btn__bars" aria-hidden="true"><span /><span /><span /></span>
        <span className="menu-btn__label">{open ? "Close" : "Menu"}</span>
      </button>
      {open ? (
        <div id="mobile-drawer" className="drawer" role="dialog" aria-modal="true" aria-label="Site menu">
          <div className="drawer__inner wrap">
            <div className="eyebrow">Open now</div>
            <ul className="drawer__list">
              {live.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={`drawer__link${isActive(pathname, item.href) ? " is-active" : ""}`} onClick={() => setOpen(false)}>{item.label}</Link>
                </li>
              ))}
            </ul>
            <div className="eyebrow">Opening next</div>
            <ul className="drawer__list drawer__list--soon">
              {soon.map((item) => (
                <li key={item.href}><span className="drawer__soon">{item.label}<span className="soon-tag">Soon</span></span></li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
