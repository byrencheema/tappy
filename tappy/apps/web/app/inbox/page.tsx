"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, ArrowUpRight, Search, X, Inbox } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { inboxApi } from "@/lib/api";
import type { InboxItemResponse } from "@/types/api";

type DateSegment = {
  label: string;
  items: InboxItemResponse[];
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

function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function sanitizeText(text: string): string {
  return text.replace(/&nbsp;?/g, " ");
}

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function InboxPage() {
  const [items, setItems] = useState<InboxItemResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadItems() {
      try {
        setIsLoading(true);
        const data = await inboxApi.list();
        setItems(data);
      } catch (err) {
        console.error("Failed to load inbox items:", err);
        setError("Failed to load inbox items");
      } finally {
        setIsLoading(false);
      }
    }
    loadItems();
  }, []);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;

    const query = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.message.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const aDate = new Date(a.created_at).getTime();
      const bDate = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? bDate - aDate : aDate - bDate;
    });
  }, [filteredItems, sortOrder]);

  const segmentedItems = useMemo(() => {
    const segments: Record<string, InboxItemResponse[]> = {};
    const order = ["Today", "Yesterday", "Earlier this week", "Last week", "This month", "Older"];

    sortedItems.forEach((item) => {
      const segment = getDateSegment(item.created_at);
      if (!segments[segment]) segments[segment] = [];
      segments[segment].push(item);
    });

    return order
      .filter((label) => segments[label]?.length > 0)
      .map((label) => ({ label, items: segments[label] }));
  }, [sortedItems]);

  useEffect(() => {
    if (isLoading || error) return;
    if (sortedItems.length === 0) {
      setSelectedId(null);
      return;
    }
    const exists = sortedItems.some((item) => item.id === selectedId);
    if (!exists) {
      setSelectedId(sortedItems[0].id);
    }
  }, [sortedItems, selectedId, isLoading, error]);

  const handleSelectItem = async (id: number) => {
    setSelectedId(id);
    const item = items.find((i) => i.id === id);
    if (item && !item.is_read) {
      try {
        const updated = await inboxApi.markAsRead(id);
        setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
      } catch (err) {
        console.error("Failed to mark item as read:", err);
      }
    }
  };

  const handleDismiss = async (id: number) => {
    try {
      await inboxApi.delete(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setSelectedId(null);
    } catch (err) {
      console.error("Failed to delete item:", err);
    }
  };

  const selectedItem = items.find((item) => item.id === selectedId);
  const unreadCount = items.filter((i) => !i.is_read).length;

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-80 flex-shrink-0 border-r border-border/40 flex flex-col h-screen sticky top-0">
        <div className="p-4 border-b border-border/40">
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-primary uppercase tracking-widest mb-0.5">
              {getTimeBasedGreeting()}
            </p>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-[24px] font-semibold text-foreground tracking-tight">
                Inbox
              </h1>
              {unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                  {unreadCount}
                </span>
              )}
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-lg border border-border/40 bg-card/50 pl-9 pr-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:bg-card focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>
        </div>

        <div className="px-4 py-2 border-b border-border/40 flex items-center justify-end">
          <button
            onClick={() => setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"))}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            {sortOrder === "newest" ? "Newest" : "Oldest"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && !isLoading && (
            <div className="text-center py-16 px-4">
              <p className="text-sm text-destructive">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 text-sm text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {!isLoading && !error && items.length === 0 && (
            <div className="text-center py-16 px-4">
              <div className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-3">
                <Inbox className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">All caught up!</p>
              <p className="text-xs text-muted-foreground">
                I&apos;ll let you know when I find something
              </p>
            </div>
          )}

          {!isLoading && !error && filteredItems.length === 0 && items.length > 0 && (
            <div className="text-center py-16 px-4">
              <p className="text-sm text-muted-foreground mb-2">No items found</p>
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs text-primary hover:underline"
              >
                Clear search
              </button>
            </div>
          )}

          {!isLoading && !error && segmentedItems.length > 0 && (
            <div className="p-2">
              {segmentedItems.map((segment, segmentIndex) => (
                <div key={segment.label} className={segmentIndex > 0 ? "mt-4" : ""}>
                  <h2 className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-1.5 px-2">
                    {segment.label}
                  </h2>
                  <div className="space-y-0.5">
                    {segment.items.map((item) => {
                      const isSelected = selectedId === item.id;

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectItem(item.id)}
                          className={`w-full text-left rounded-lg px-3 py-2.5 transition-all ${
                            isSelected
                              ? "bg-secondary"
                              : "hover:bg-secondary/50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-0.5">
                            <div className="flex items-center gap-2 min-w-0">
                              {!item.is_read && (
                                <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                              )}
                              <span className={`text-sm text-foreground truncate ${isSelected ? "font-medium" : ""}`}>
                                {item.title}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground/50 flex-shrink-0">
                              {formatTime(item.created_at)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground/70 line-clamp-1">
                            {item.message.split("\n")[0].replace(/^[•\-\*]\s*/, "")}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-hidden">
        {selectedItem ? (
          <div
            key={selectedItem.id}
            className="h-full overflow-y-auto animate-in slide-in-from-right-4 duration-200"
          >
            <div className="max-w-2xl mx-auto px-8 py-8">
              <div className="mb-6">
                <p className="text-xs text-muted-foreground mb-1">
                  {formatFullDate(selectedItem.created_at)}
                </p>
                <h1 className="text-xl font-semibold text-foreground tracking-tight">
                  {selectedItem.title}
                </h1>
              </div>

              <div className="flex items-center gap-2.5 mb-6">
                <Image
                  src="/tappy_mascot.png"
                  alt="Tappy"
                  width={36}
                  height={36}
                  className="rounded-full"
                />
                <div>
                  <p className="text-sm font-serif font-medium text-foreground">Tappy</p>
                  <p className="text-xs text-muted-foreground">Your assistant</p>
                </div>
              </div>

              <div className="rounded-xl bg-secondary/50 p-5 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {selectedItem.message}
              </div>

              {selectedItem.journal_excerpt && (
                <div className="mt-6 rounded-xl border border-border/40 p-4">
                  <p className="text-xs text-muted-foreground mb-1.5">
                    Based on what you wrote:
                  </p>
                  <p className="text-sm italic text-foreground">
                    &ldquo;{selectedItem.journal_excerpt}&rdquo;
                  </p>
                </div>
              )}

              {selectedItem.journal_entry_id && (
                <Link
                  href={`/entry/${selectedItem.journal_entry_id}`}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Open journal entry
                </Link>
              )}

              <div className="mt-8 pt-6 border-t border-border/40">
                <button
                  onClick={() => handleDismiss(selectedItem.id)}
                  className="inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Select a message</p>
          </div>
        )}
      </main>
    </div>
  );
}
