"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ClipboardCheck, LayoutDashboard, Users } from "lucide-react";

const items = [
  { href: "", label: "Painel", icon: LayoutDashboard, exact: true },
  { href: "/presenca", label: "Presença", icon: ClipboardCheck },
  { href: "/encontros", label: "Encontros", icon: CalendarDays },
  { href: "/membros", label: "Membros", icon: Users },
];

export function GroupNav({
  base,
  className = "",
  variant = "top",
}: {
  base: string;
  className?: string;
  variant?: "top" | "bottom";
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Seções do GC" className={className}>
      {items.map(({ href, label, icon: Icon, exact }) => {
        const url = base + href;
        const active = exact ? pathname === url : pathname.startsWith(url);
        if (variant === "bottom") {
          return (
            <Link
              key={href}
              href={url}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
                active ? "text-primary" : "text-muted"
              }`}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          );
        }
        return (
          <Link
            key={href}
            href={url}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors ${
              active ? "bg-primary-soft text-primary" : "text-muted hover:bg-bg hover:text-fg"
            }`}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
