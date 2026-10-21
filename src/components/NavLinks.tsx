"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/users", label: "Users" },
  { href: "/media", label: "AI media" },
  { href: "/votes", label: "Votes" },
];

export default function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1">
      {LINKS.map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-4 py-1.5 font-mono text-xs tracking-[0.15em] uppercase transition ${
              active ? "bg-[#e9c46a] text-[#1a1408]" : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
