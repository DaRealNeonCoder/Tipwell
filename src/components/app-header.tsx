"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/lib/site";
import AuthNav from "./auth-nav";

const primaryLinks = [
  { href: "/", label: "Diner" },
  { href: "/worker", label: "Worker" },
  { href: "/log", label: "Shift log" },
];

export default function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="app-header">
      <Link className="brand-lockup brand-link" href="/" aria-label="Tipwell home">
        <span className="brand-mark" aria-hidden="true">tw</span>
        <span>
          <span className="eyebrow">{siteConfig.name}</span>
          <span className="brand-tagline">A better way to settle up.</span>
        </span>
      </Link>
      <div className="header-actions">
        <nav className="main-nav" aria-label="Primary navigation">
          {primaryLinks.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link key={link.href} className={`nav-link ${active ? "active" : ""}`} href={link.href} aria-current={active ? "page" : undefined}>
                {link.label}
              </Link>
            );
          })}
        </nav>
        <AuthNav />
      </div>
    </header>
  );
}
