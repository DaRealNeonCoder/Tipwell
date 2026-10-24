"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/worker", label: "Overview" },
  { href: "/worker/hourly", label: "Tips per hour" },
  { href: "/worker/pool", label: "Pool split" },
  { href: "/worker/tip-out", label: "Tip-out" },
  { href: "/worker/insights", label: "Table insights" },
  { href: "/manager", label: "Manager" },
  { href: "/log", label: "Shift log" },
];

export default function WorkerToolsNav() {
  const pathname = usePathname();
  return (
    <nav className="worker-tools-nav" aria-label="Worker tools">
      {links.map((link) => {
        const active = link.href === "/worker" ? pathname === "/worker" : pathname.startsWith(link.href);
        return <Link key={link.href} className={`nav-link ${active ? "active" : ""}`} href={link.href} aria-current={active ? "page" : undefined}>{link.label}</Link>;
      })}
    </nav>
  );
}
