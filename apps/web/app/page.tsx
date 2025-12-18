"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import Link from "next/link";

type JournalEntry = {
  id: string;
  date: Date;
  preview: string;
  actionsTriggered: number;
};

// Mock data - would come from API
const mockEntries: JournalEntry[] = [
  {
    id: "1",
    date: new Date(),
    preview: "Had a great workout today. Feeling motivated to keep up the routine. Also need to remember to call mom this weekend...",
    actionsTriggered: 2,
  },
  {
    id: "2",
    date: new Date(Date.now() - 86400000),
    preview: "Work was busy but productive. The new project is coming along nicely. Thinking about taking a vacation next month...",
    actionsTriggered: 1,
  },
  {
    id: "3",
    date: new Date(Date.now() - 86400000 * 2),
    preview: "Finally finished reading that book I've been putting off. Really need to start eating healthier, maybe try meal prep...",
    actionsTriggered: 3,
  },
  {
    id: "4",
    date: new Date(Date.now() - 86400000 * 5),
    preview: "Anniversary coming up next week. Should plan something special for dinner. Also need to renew gym membership...",
    actionsTriggered: 2,
  },
];

function formatDate(date: Date) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function JournalPage() {
  const [entries] = useState<JournalEntry[]>(mockEntries);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background border-b border-border">
        <div className="flex h-14 items-center justify-between px-6">
          <h1 className="text-base font-semibold text-foreground">Journal</h1>
          <Link
            href="/new"
            className="inline-flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>New Entry</span>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <div className="mx-auto max-w-2xl px-6 py-6">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search entries..."
              className="h-10 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Tappy greeting */}
        <div className="mb-8 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-500 shadow-md">
              <span className="text-2xl">🦊</span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Ready when you are</p>
              <p className="text-sm text-muted-foreground">Write about your day and I&apos;ll help make things happen.</p>
            </div>
            <Link
              href="/new"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <Plus className="h-5 w-5" />
            </Link>
          </div>
        </div>

        {/* Entries grid */}
        <div className="grid grid-cols-2 gap-3">
          {entries.map((entry) => (
            <Link
              key={entry.id}
              href={`/entry/${entry.id}`}
              className="group rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
            >
              <p className="text-xs text-muted-foreground mb-2">{formatDate(entry.date)}</p>
              <p className="text-sm text-foreground line-clamp-4 leading-relaxed">
                {entry.preview}
              </p>
              {entry.actionsTriggered > 0 && (
                <div className="mt-3 flex items-center gap-1.5">
                  <span className="text-sm">🦊</span>
                  <span className="text-xs text-primary font-medium">
                    {entry.actionsTriggered} action{entry.actionsTriggered !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>

        {entries.length === 0 && (
          <div className="text-center py-16">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
              <span className="text-3xl">📝</span>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">No entries yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Start journaling and let Tappy help you take action.</p>
            <Link
              href="/new"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              <span>Write your first entry</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
