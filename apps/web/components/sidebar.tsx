"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Inbox } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavigationItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
};

const navigation: NavigationItem[] = [
  {
    name: "Journal",
    href: "/",
    icon: BookOpen,
  },
  {
    name: "Inbox",
    href: "/inbox",
    icon: Inbox,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 border-r border-sidebar-border bg-sidebar">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-5">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl">
            <Image src="/tappy_mascot.png" alt="Tappy" width={40} height={40} className="object-cover" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-sidebar-foreground">Tappy</h1>
            <p className="text-xs text-muted-foreground">Your life assistant</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="flex-1">{item.name}</span>
                    {item.badge && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-medium text-primary-foreground">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom helper */}
        <div className="p-3">
          <div className="rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 p-4">
            <div className="flex items-start gap-3">
              <Image src="/tappy_mascot.png" alt="Tappy" width={32} height={32} className="flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Tappy is ready</p>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                  Tell me about your day and I&apos;ll help make things happen.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
