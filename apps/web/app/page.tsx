"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Search, Loader2, Zap } from "lucide-react";
import Link from "next/link";
import { journalApi } from "@/lib/api";
import type { JournalEntryListItem } from "@/types/api";
import { Toast } from "@/components/Toast";

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntryListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const previousActionCounts = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    async function loadEntries() {
      try {
        setIsLoading(true);
        const data = await journalApi.list();

        // Check for newly completed actions
        data.forEach((entry) => {
          const prevCount = previousActionCounts.current.get(entry.id) || 0;
          const currentCount = entry.actions_triggered;

          // If actions increased, show toast
          if (currentCount > prevCount && prevCount > 0) {
            setToastMessage(`Action found from your journal entry!`);
          }

          // Update the map
          previousActionCounts.current.set(entry.id, currentCount);
        });

        setEntries(data);
      } catch (err) {
        console.error("Failed to load entries:", err);
        setError("Failed to load entries");
      } finally {
        setIsLoading(false);
      }
    }

    loadEntries();

    // Poll every 3 seconds to check for processing updates
    const interval = setInterval(() => {
      loadEntries();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const filteredEntries = searchQuery
    ? entries.filter(
        (e) =>
          e.preview.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.title?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : entries;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-8">
        {/* Write CTA */}
        <Link
          href="/new"
          className="group mb-8 flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/30 px-4 py-3 transition hover:border-border hover:bg-secondary/50"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
            <Plus className="h-4 w-4" />
          </div>
          <span className="text-sm text-muted-foreground group-hover:text-foreground transition">
            Write something...
          </span>
        </Link>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
          <input
            type="text"
            placeholder="Search entries"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg border-0 bg-secondary/50 pl-9 pr-4 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="text-center py-12">
            <p className="text-sm text-destructive">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 text-sm text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && entries.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">No entries yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Start writing to capture your thoughts
            </p>
          </div>
        )}

        {/* Entries */}
        {!isLoading && !error && filteredEntries.length > 0 && (
          <div className="space-y-1">
            {searchQuery && (
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-xs text-muted-foreground">
                  {filteredEntries.length} result{filteredEntries.length !== 1 ? "s" : ""}
                </p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
            )}
            {filteredEntries.map((entry) => (
              <Link
                key={entry.id}
                href={`/entry/${entry.id}`}
                className="group flex items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-secondary/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {entry.title || "Untitled"}
                    </p>
                    {entry.processing_status === "processing" && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        Processing
                      </span>
                    )}
                    {entry.actions_triggered > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-primary">
                        <Zap className="h-2.5 w-2.5" />
                        {entry.actions_triggered}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {entry.preview}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">
                  {formatRelativeDate(entry.created_at)}
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* No search results */}
        {!isLoading && !error && searchQuery && filteredEntries.length === 0 && entries.length > 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">No entries found</p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-2 text-xs text-primary hover:underline"
            >
              Clear search
            </button>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
