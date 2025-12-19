"use client";

import { useState, useEffect } from "react";
import { Check, Clock, AlertCircle, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { inboxApi } from "@/lib/api";
import type { InboxItemResponse, InboxItemStatus } from "@/types/api";

function getStatusStyle(status: InboxItemStatus) {
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

export default function InboxPage() {
  const [items, setItems] = useState<InboxItemResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

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

  const handleConfirm = async (id: number) => {
    try {
      const updated = await inboxApi.update(id, { status: "completed" });
      setItems((prev) =>
        prev.map((item) => (item.id === id ? updated : item))
      );
    } catch (err) {
      console.error("Failed to update item:", err);
    }
  };

  const handleDismiss = async (id: number) => {
    try {
      await inboxApi.delete(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch (err) {
      console.error("Failed to delete item:", err);
    }
  };

  const needsAttention = items.filter((i) => i.status === "needs_confirmation" || i.status === "pending").length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background border-b border-border">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-foreground">Inbox</h1>
            {needsAttention > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-medium text-primary-foreground">
                {needsAttention}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-2xl px-6 py-6">
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

        {/* Content */}
        {!isLoading && !error && (
          <>
            {items.length === 0 ? (
              <div className="text-center py-16">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
                  <Check className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-foreground mb-1">All caught up!</h3>
                <p className="text-sm text-muted-foreground">Tappy will notify you when there&apos;s something new.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => {
                  const status = getStatusStyle(item.status);
                  const StatusIcon = status.icon;
                  const isExpanded = expandedId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border bg-card overflow-hidden"
                    >
                      {/* Row */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="w-full flex items-center gap-3 p-4 text-left hover:bg-secondary/30 transition-colors"
                      >
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${status.bg}`}>
                          <StatusIcon className={`h-4 w-4 ${status.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{item.title}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {item.message.split('\n')[0].replace(/^[•\-\*]\s*/, '')}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatTimestamp(item.created_at)}
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                      </button>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-0 border-t border-border">
                          <div className="pt-4 space-y-4">
                            {/* Message with preserved formatting */}
                            <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-mono bg-secondary/30 rounded-lg p-3">
                              {item.message}
                            </div>

                            {item.journal_excerpt && (
                              <div className="rounded-lg bg-secondary/50 p-3 text-sm">
                                <p className="text-xs text-muted-foreground mb-1">From your journal</p>
                                <p className="italic text-foreground">&ldquo;{item.journal_excerpt}&rdquo;</p>
                              </div>
                            )}

                            {item.status === "needs_confirmation" && item.action && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleConfirm(item.id)}
                                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  {item.action}
                                </button>
                                <button
                                  onClick={() => handleDismiss(item.id)}
                                  className="h-8 rounded-lg px-3 text-sm text-muted-foreground hover:bg-secondary"
                                >
                                  Dismiss
                                </button>
                              </div>
                            )}

                            {item.status === "pending" && (
                              <div className="flex items-center gap-2 text-sm text-blue-500">
                                <Clock className="h-4 w-4" />
                                <span>Working on this...</span>
                              </div>
                            )}

                            {item.status === "completed" && (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-green-500">
                                  <Check className="h-4 w-4" />
                                  <span>Completed</span>
                                </div>
                                <button
                                  onClick={() => handleDismiss(item.id)}
                                  className="text-xs text-muted-foreground hover:text-foreground"
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
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
