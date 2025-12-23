"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Loader2, Zap } from "lucide-react";
import Link from "next/link";
import { journalApi } from "@/lib/api";
import type { JournalEntryListItem } from "@/types/api";
import { MiniCalendar } from "@/components/mini-calendar";

type DateSegment = {
  label: string;
  entries: JournalEntryListItem[];
};

function getDateSegment(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const entryDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - entryDate.getTime()) / 86400000);
  const dayOfWeek = today.getDay();

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= dayOfWeek && diffDays < 7) return "Earlier this week";
  if (diffDays < 14) return "Last week";
  if (diffDays < 30) return "This month";
  return "Older";
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

function sanitizeText(text: string): string {
  return text.replace(/&nbsp;?/g, " ");
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntryListItem[]>([]);
  const [optimisticEntry, setOptimisticEntry] = useState<JournalEntryListItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    const cachedEntries = localStorage.getItem("journalEntries");
    if (cachedEntries) {
      setEntries(JSON.parse(cachedEntries));
      setIsLoading(false);
    }
    const optimistic = sessionStorage.getItem("optimisticEntry");
    if (optimistic) {
      setOptimisticEntry(JSON.parse(optimistic));
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    async function loadEntries() {
      try {
        const data = await journalApi.list();
        setEntries(data);
        localStorage.setItem("journalEntries", JSON.stringify(data));
        sessionStorage.removeItem("optimisticEntry");
        setOptimisticEntry(null);
      } catch (err) {
        console.error("Failed to load entries:", err);
        if (entries.length === 0) setError("Failed to load entries");
      } finally {
        setIsLoading(false);
      }
    }
    loadEntries();
  }, []);

  const allEntries = optimisticEntry ? [optimisticEntry, ...entries] : entries;

  const entryDates = useMemo(() => {
    const dates = new Set<string>();
    allEntries.forEach((entry) => {
      const date = new Date(entry.created_at);
      dates.add(formatDateKey(date));
    });
    return dates;
  }, [allEntries]);

  const filteredEntries = useMemo(() => {
    let result = allEntries;

    if (selectedDate) {
      const selectedKey = formatDateKey(selectedDate);
      result = result.filter((e) => {
        const entryDate = new Date(e.created_at);
        return formatDateKey(entryDate) === selectedKey;
      });
    }

    if (searchQuery) {
      result = result.filter(
        (e) =>
          e.preview.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return result;
  }, [allEntries, searchQuery, selectedDate]);

  const segmentedEntries = useMemo(() => {
    const segments: Record<string, JournalEntryListItem[]> = {};
    const order = ["Today", "Yesterday", "Earlier this week", "Last week", "This month", "Older"];

    filteredEntries.forEach((entry) => {
      const segment = getDateSegment(entry.created_at);
      if (!segments[segment]) segments[segment] = [];
      segments[segment].push(entry);
    });

    return order
      .filter((label) => segments[label]?.length > 0)
      .map((label) => ({ label, entries: segments[label] }));
  }, [filteredEntries]);

  const handleDateSelect = (date: Date) => {
    if (selectedDate && formatDateKey(selectedDate) === formatDateKey(date)) {
      setSelectedDate(null);
    } else {
      setSelectedDate(date);
    }
  };

  const hasDateFilter = !!selectedDate;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex gap-8">
          <div className="w-72 flex-shrink-0">
            <div className="sticky top-8">
              <div className="mb-8">
                <p className="text-[10px] font-semibold text-primary uppercase tracking-widest mb-0.5">
                  {getTimeBasedGreeting()}
                </p>
                <h1 className="font-serif text-[28px] font-semibold text-foreground tracking-tight">
                  Journal
                </h1>
              </div>

              <div className="mb-6 p-4 rounded-2xl bg-card border border-border/40">
                <MiniCalendar
                  entryDates={entryDates}
                  onDateSelect={handleDateSelect}
                  selectedDate={selectedDate}
                />
              </div>

              <Link
                href="/new"
                className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-md hover:shadow-primary/25 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                New Entry
              </Link>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
                <input
                  type="text"
                  placeholder="Search your entries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border/40 bg-card/50 pl-11 pr-4 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:bg-card focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>

            {hasDateFilter && (
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="hover:text-primary/70"
                  >
                    ×
                  </button>
                </span>
              </div>
            )}

            {isLoading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {error && !isLoading && (
              <div className="text-center py-16">
                <p className="text-sm text-destructive">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-3 text-sm text-primary hover:underline"
                >
                  Try again
                </button>
              </div>
            )}

            {!isLoading && !error && allEntries.length === 0 && (
              <div className="text-center py-16">
                <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No entries yet</p>
                <p className="text-xs text-muted-foreground">
                  Start writing to capture your thoughts
                </p>
              </div>
            )}

            {!isLoading && !error && filteredEntries.length === 0 && allEntries.length > 0 && (
              <div className="text-center py-16">
                <p className="text-sm text-muted-foreground mb-2">No entries found</p>
                {(searchQuery || selectedDate) && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedDate(null);
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Clear {searchQuery && selectedDate ? "filters" : searchQuery ? "search" : "date filter"}
                  </button>
                )}
              </div>
            )}

            {!isLoading && !error && segmentedEntries.length > 0 && (
              <div className="space-y-8">
                {segmentedEntries.map((segment) => (
                  <div key={segment.label}>
                    <h2 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest mb-3 px-1">
                      {segment.label}
                    </h2>
                    <div className="space-y-2">
                      {segment.entries.map((entry) => {
                        const isOptimistic = entry.id < 0;

                        const content = (
                          <div className="flex items-start gap-4 py-3.5 px-4 rounded-xl border border-transparent bg-card/50 transition-all duration-200 group-hover:bg-card group-hover:border-border/50 group-hover:shadow-sm">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2.5 mb-1">
                                <h3 className={`text-[15px] font-semibold tracking-tight ${isOptimistic ? "text-muted-foreground" : "text-foreground"}`}>
                                  {entry.title || "Untitled"}
                                </h3>
                                {isOptimistic && (
                                  <span className="text-[10px] text-muted-foreground/50 italic">saving...</span>
                                )}
                                {!isOptimistic && entry.actions_triggered > 0 && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                                    <Zap className="h-2.5 w-2.5" />
                                    {entry.actions_triggered}
                                  </span>
                                )}
                              </div>
                              <p className="text-[13px] text-muted-foreground/80 line-clamp-2 leading-relaxed">
                                {sanitizeText(entry.preview)}
                              </p>
                            </div>
                            <span className="text-[11px] text-muted-foreground/50 flex-shrink-0 pt-1 font-medium">
                              {formatTime(entry.created_at)}
                            </span>
                          </div>
                        );

                        if (isOptimistic) {
                          return (
                            <div key={entry.id} className="opacity-50">
                              {content}
                            </div>
                          );
                        }

                        return (
                          <Link
                            key={entry.id}
                            href={`/entry/${entry.id}`}
                            className="block group"
                          >
                            {content}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
