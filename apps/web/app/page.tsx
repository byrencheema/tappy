"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Loader2 } from "lucide-react";
import Link from "next/link";
import { journalApi } from "@/lib/api";
import type { JournalEntryListItem } from "@/types/api";

function formatTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function getTimeGroup(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const oneWeekAgo = new Date(today);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  if (date > oneWeekAgo) {
    return "Last week";
  }
  return "Older";
}

function groupEntriesByTime(entries: JournalEntryListItem[]): Record<string, JournalEntryListItem[]> {
  const groups: Record<string, JournalEntryListItem[]> = {
    "Today": [],
    "Yesterday": [],
    "Last week": [],
    "Older": []
  };

  entries.forEach(entry => {
    const group = getTimeGroup(entry.created_at);
    groups[group].push(entry);
  });

  return groups;
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntryListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadEntries() {
      try {
        setIsLoading(true);
        const data = await journalApi.list();
        setEntries(data);
      } catch (err) {
        console.error("Failed to load entries:", err);
        setError("Failed to load entries");
      } finally {
        setIsLoading(false);
      }
    }
    loadEntries();
  }, []);

  const filteredEntries = searchQuery
    ? entries.filter(
        (e) =>
          e.preview.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.title?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  const groupedEntries = !searchQuery ? groupEntriesByTime(entries) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Notion-like Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="mx-auto max-w-5xl px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-foreground">Journal</h1>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-64 rounded-md border border-border/50 bg-background pl-9 pr-4 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-border focus:ring-1 focus:ring-border"
                />
              </div>
              <Link
                href="/new"
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              >
                <Plus className="h-4 w-4" />
                New
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-8 py-8">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="text-center py-16">
            <p className="text-destructive">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 text-sm text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Search Results */}
        {!isLoading && !error && filteredEntries && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {filteredEntries.length} result{filteredEntries.length !== 1 ? "s" : ""}
              </p>
              <button
                onClick={() => setSearchQuery("")}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
            <div className="space-y-1">
              {filteredEntries.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/entry/${entry.id}`}
                  className="group flex flex-col py-3 px-2 rounded-md hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-baseline gap-2">
                    <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {entry.title || "Untitled"}
                    </p>
                    <span className="text-xs text-muted-foreground/70">{formatTime(entry.created_at)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                    {entry.preview}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Chronologically Grouped Entries */}
        {!isLoading && !error && !filteredEntries && groupedEntries && (
          <>
            {entries.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground mb-4">No entries yet</p>
                <Link
                  href="/new"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <Plus className="h-4 w-4" />
                  Create your first entry
                </Link>
              </div>
            ) : (
              <div className="space-y-8">
                {(["Today", "Yesterday", "Last week", "Older"] as const).map((groupName) => {
                  const groupEntries = groupedEntries[groupName];
                  if (groupEntries.length === 0) return null;

                  return (
                    <div key={groupName} className="space-y-1">
                      <h2 className="text-sm font-medium text-muted-foreground mb-3">
                        {groupName}
                      </h2>
                      <div className="space-y-1">
                        {groupEntries.map((entry) => (
                          <Link
                            key={entry.id}
                            href={`/entry/${entry.id}`}
                            className="group flex flex-col py-3 px-2 -mx-2 rounded-md hover:bg-secondary/50 transition-colors"
                          >
                            <div className="flex items-baseline gap-2">
                              <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                                {entry.title || "Untitled"}
                              </p>
                              <span className="text-xs text-muted-foreground/70">{formatTime(entry.created_at)}</span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                              {entry.preview}
                            </p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
