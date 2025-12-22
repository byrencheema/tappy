"use client";

import { useState, useEffect } from "react";
import { Check, Clock, AlertCircle, Loader2, ArrowUpRight, Filter } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { inboxApi } from "@/lib/api";
import type { InboxItemResponse, InboxItemStatus } from "@/types/api";

function getStatusInfo(status: InboxItemStatus) {
  switch (status) {
    case "needs_confirmation":
      return { icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-500/10" };
    case "completed":
      return { icon: Check, color: "text-green-500", bg: "bg-green-500/10" };
    case "pending":
      return { icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10" };
  }
}

function formatTimestamp(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / 1000 / 60 / 60);
  const days = Math.floor(hours / 24);

  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFullDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function InboxPage() {
  const [items, setItems] = useState<InboxItemResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<InboxItemStatus | "all">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

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

  const filteredItems = items.filter((item) =>
    statusFilter === "all" ? true : item.status === statusFilter
  );

  const sortedItems = [...filteredItems].sort((a, b) => {
    const aDate = new Date(a.created_at).getTime();
    const bDate = new Date(b.created_at).getTime();
    return sortOrder === "newest" ? bDate - aDate : aDate - bDate;
  });

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

  const handleConfirm = async (id: number) => {
    try {
      const updated = await inboxApi.update(id, { status: "completed" });
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    } catch (err) {
      console.error("Failed to update item:", err);
    }
  };

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
    } catch (err) {
      console.error("Failed to delete item:", err);
    }
  };

  const selectedItem = items.find((item) => item.id === selectedId);
  const unreadCount = items.filter((i) => !i.is_read).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex h-14 items-center gap-3 px-6">
          <h1 className="text-xl font-semibold text-foreground">Inbox</h1>
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-xs font-medium text-white">
              {unreadCount}
            </span>
          )}
        </div>
      </header>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="text-center py-16">
          <p className="text-destructive">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 text-sm text-primary hover:underline">
            Try again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && items.length === 0 && (
        <div className="mx-auto max-w-2xl px-6 py-16">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
              <Check className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-foreground mb-1">All caught up!</h3>
            <p className="text-sm text-muted-foreground">I&apos;ll let you know when I find something.</p>
          </div>
        </div>
      )}

      {/* Content */}
      {!isLoading && !error && items.length > 0 && (
        <div className="flex h-[calc(100vh-3.5rem)] flex-col">
          <div className="flex items-center justify-between border-b border-border/60 bg-background px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Filter className="h-3 w-3" />
              </span>
              {(["all", "needs_confirmation", "pending", "completed"] as const).map((filterKey) => {
                const isActive = statusFilter === filterKey;
                const label =
                  filterKey === "all"
                    ? "All"
                    : filterKey === "needs_confirmation"
                    ? "Needs review"
                    : filterKey === "pending"
                    ? "In progress"
                    : "Done";

                return (
                  <button
                    key={filterKey}
                    onClick={() => setStatusFilter(filterKey)}
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition ${
                      isActive
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : "border-border/80 bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"))}
              className="text-xs text-muted-foreground hover:text-foreground transition"
            >
              Sort: {sortOrder === "newest" ? "Newest → Oldest" : "Oldest → Newest"}
            </button>
          </div>

          <div className="flex flex-1">
          {/* Sidebar */}
          <aside className="w-80 flex-shrink-0 border-r border-border/60 overflow-y-auto bg-background">
            <div className="p-2">
              {sortedItems.map((item) => {
                const isSelected = selectedId === item.id;
                const status = getStatusInfo(item.status);

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectItem(item.id)}
                    className={`group w-full text-left rounded-lg px-3 py-2.5 mb-0.5 transition-all ${
                      isSelected
                        ? "bg-secondary/80"
                        : "hover:bg-secondary/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {!item.is_read && (
                          <div className="h-2 w-2 rounded-full bg-orange-500 flex-shrink-0" />
                        )}
                        <span className={`text-sm text-foreground truncate ${isSelected ? "font-medium" : ""}`}>
                          {item.title}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground flex-shrink-0">
                        {formatTimestamp(item.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {item.message.split("\n")[0].replace(/^[•\-\*]\s*/, "")}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full ${status.color.replace("text-", "bg-")}`} />
                      <span className={`text-[11px] ${status.color}`}>
                        {item.status === "needs_confirmation"
                          ? "Needs review"
                          : item.status === "pending"
                          ? "In progress"
                          : "Done"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            {selectedItem ? (
              <div className="px-6 py-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{formatFullDate(selectedItem.created_at)}</p>
                    <h1 className="text-lg font-semibold text-foreground">{selectedItem.title}</h1>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {selectedItem.status === "needs_confirmation" && selectedItem.action && (
                      <>
                        <button
                          onClick={() => handleConfirm(selectedItem.id)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          <Check className="h-3.5 w-3.5" />
                          {selectedItem.action}
                        </button>
                        <button
                          onClick={() => handleDismiss(selectedItem.id)}
                          className="h-8 rounded-lg px-3 text-sm text-muted-foreground hover:bg-secondary transition-colors"
                        >
                          Dismiss
                        </button>
                      </>
                    )}
                    {selectedItem.status === "pending" && (
                      <div className="flex items-center gap-1.5 text-sm text-blue-500">
                        <Clock className="h-4 w-4" />
                        <span>In progress</span>
                      </div>
                    )}
                    {selectedItem.status === "completed" && (
                      <div className="flex items-center gap-1.5 text-sm text-green-500">
                        <Check className="h-4 w-4" />
                        <span>Done</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* From Tappy */}
                <div className="flex items-center gap-2.5 mb-4">
                  <Image src="/tappy_mascot.png" alt="Tappy" width={32} height={32} className="rounded-full" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Tappy</p>
                  </div>
                </div>

                {/* Message */}
                <div className="rounded-lg bg-secondary/50 p-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {selectedItem.message}
                </div>

                {/* Journal Reference */}
                {selectedItem.journal_excerpt && (
                  <div className="mt-6 rounded-lg border border-border/60 p-4">
                    <p className="text-xs text-muted-foreground mb-1.5">Based on what you wrote:</p>
                    <p className="text-sm italic text-foreground">&ldquo;{selectedItem.journal_excerpt}&rdquo;</p>
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

                {/* Actions */}
                {selectedItem.status === "completed" && (
                  <div className="mt-6 flex items-center justify-between pt-4 border-t border-border/60">
                    <div className="flex items-center gap-1.5 text-sm text-green-500">
                      <Check className="h-4 w-4" />
                      <span>Done</span>
                    </div>
                    <button
                      onClick={() => handleDismiss(selectedItem.id)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Remove from inbox
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Select a message</p>
              </div>
            )}
          </main>
          </div>
        </div>
      )}
    </div>
  );
}
