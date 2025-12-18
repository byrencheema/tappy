"use client";

import { useState } from "react";
import { Plus, Search, ArrowRight, FileText } from "lucide-react";
import Link from "next/link";

type JournalEntry = {
  id: string;
  date: Date;
  preview: string;
  actionsTriggered: number;
  title?: string;
};

// Mock data - would come from API
const mockEntries: JournalEntry[] = [
  {
    id: "1",
    date: new Date(),
    title: "Morning reflection",
    preview: "Had a great workout today. Feeling motivated to keep up the routine. Also need to remember to call mom this weekend...",
    actionsTriggered: 2,
  },
  {
    id: "2",
    date: new Date(Date.now() - 86400000),
    title: "Project update",
    preview: "Work was busy but productive. The new project is coming along nicely. Thinking about taking a vacation next month...",
    actionsTriggered: 1,
  },
  {
    id: "3",
    date: new Date(Date.now() - 86400000 * 2),
    title: "Reading goals",
    preview: "Finally finished reading that book I've been putting off. Really need to start eating healthier, maybe try meal prep...",
    actionsTriggered: 3,
  },
  {
    id: "4",
    date: new Date(Date.now() - 86400000 * 5),
    title: "Anniversary planning",
    preview: "Anniversary coming up next week. Should plan something special for dinner. Also need to renew gym membership...",
    actionsTriggered: 2,
  },
  {
    id: "5",
    date: new Date(Date.now() - 86400000 * 7),
    title: "Weekly review",
    preview: "Looking back at this week. Made good progress on the side project. Need to focus more on sleep schedule...",
    actionsTriggered: 0,
  },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

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
  return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function JournalPage() {
  const [entries] = useState<JournalEntry[]>(mockEntries);
  const [searchQuery, setSearchQuery] = useState("");

  const todayEntry = entries.find(
    (e) => e.date.toDateString() === new Date().toDateString()
  );

  const recentEntries = entries.slice(0, 5);

  const filteredEntries = searchQuery
    ? entries.filter(
        (e) =>
          e.preview.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.title?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Clean Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-foreground">Home</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-64 rounded-lg border border-border bg-secondary/50 pl-9 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-background"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Search Results */}
        {filteredEntries && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-muted-foreground">
                {filteredEntries.length} result{filteredEntries.length !== 1 ? "s" : ""} for &ldquo;{searchQuery}&rdquo;
              </h2>
              <button
                onClick={() => setSearchQuery("")}
                className="text-sm text-primary hover:underline"
              >
                Clear
              </button>
            </div>
            <div className="space-y-2">
              {filteredEntries.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/entry/${entry.id}`}
                  className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-secondary/50"
                >
                  <FileText className="h-5 w-5 flex-shrink-0 text-muted-foreground mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{entry.title || "Untitled"}</p>
                    <p className="text-sm text-muted-foreground line-clamp-1">{entry.preview}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(entry.date)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Main Content - Hidden when searching */}
        {!filteredEntries && (
          <>
            {/* Greeting Section */}
            <div className="mb-10">
              <h1 className="text-3xl font-semibold text-foreground mb-2">
                {getGreeting()}
              </h1>
              <p className="text-lg text-muted-foreground">
                {todayEntry
                  ? "You've already journaled today. Keep up the streak!"
                  : "What's on your mind today?"}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="mb-10">
              <Link
                href="/new"
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 shadow-sm">
                  <Plus className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                    New journal entry
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Write about your day and let Tappy help
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </Link>
            </div>

            {/* Recent Entries */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Recently viewed
                </h2>
                <Link
                  href="/entries"
                  className="text-sm text-primary hover:underline"
                >
                  View all
                </Link>
              </div>

              {recentEntries.length === 0 ? (
                <div className="text-center py-12 rounded-xl border border-dashed border-border">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-foreground mb-1">No entries yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start journaling to see your entries here
                  </p>
                  <Link
                    href="/new"
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
                  >
                    <Plus className="h-4 w-4" />
                    Write your first entry
                  </Link>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentEntries.map((entry) => (
                    <Link
                      key={entry.id}
                      href={`/entry/${entry.id}`}
                      className="group flex items-center gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-secondary/50"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground truncate">
                            {entry.title || "Untitled"}
                          </p>
                          {entry.actionsTriggered > 0 && (
                            <span className="flex-shrink-0 text-xs text-primary">
                              🦊 {entry.actionsTriggered}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {entry.preview}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-xs text-muted-foreground">{formatDate(entry.date)}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(entry.date)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
