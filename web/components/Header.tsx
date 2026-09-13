import { Brand } from "./Brand";
import { DesktopNav, MobileNav } from "./NavClient";
import { NAV } from "@/lib/nav";

export function Header() {
  const primary = NAV.filter((n) => n.place === "primary");
  const more = NAV.filter((n) => n.place === "more");
  return (
    <header className="hdr">
      <div className="hdr__inner wrap">
        <Brand />
        <DesktopNav primary={primary} more={more} />
        <MobileNav items={NAV} />
      </div>
    </header>
  );
}
