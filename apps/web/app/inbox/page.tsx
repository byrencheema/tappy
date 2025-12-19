"use client";

import { useState, useEffect } from "react";
import { Check, Clock, AlertCircle, Loader2 } from "lucide-react";
import Image from "next/image";
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

  useEffect(() => {
    async function loadItems() {
      try {
        setIsLoading(true);
        const data = await inboxApi.list();
        setItems(data);
        if (data.length > 0) {
          setSelectedId(data[0].id);
        }
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
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    } catch (err) {
      console.error("Failed to update item:", err);
    }
  };

  const handleDismiss = async (id: number) => {
    try {
      await inboxApi.delete(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (selectedId === id) {
        const currentIndex = items.findIndex((item) => item.id === id);
        const remaining = items.filter((item) => item.id !== id);
        if (remaining.length > 0) {
          const nextIndex = Math.min(currentIndex, remaining.length - 1);
          setSelectedId(remaining[nextIndex].id);
        } else {
          setSelectedId(null);
        }
      }
    } catch (err) {
      console.error("Failed to delete item:", err);
    }
  };

  const selectedItem = items.find((item) => item.id === selectedId);
  const needsAttention = items.filter((i) => i.status === "needs_confirmation" || i.status === "pending").length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border">
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
        <div className="flex h-[calc(100vh-3.5rem)]">
          {/* Sidebar */}
          <aside className="w-72 flex-shrink-0 border-r border-border overflow-y-auto">
            <div className="p-2">
              {items.map((item) => {
                const isSelected = selectedId === item.id;
                const status = getStatusInfo(item.status);

                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full text-left rounded-lg p-3 mb-1 transition-colors ${
                      isSelected ? "bg-secondary" : "hover:bg-secondary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium text-foreground truncate ${isSelected ? "font-semibold" : ""}`}>
                        {item.title}
                      </span>
                      <span className="text-[11px] text-muted-foreground ml-2 flex-shrink-0">
                        {formatTimestamp(item.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {item.message.split("\n")[0].replace(/^[•\-\*]\s*/, "")}
                    </p>
                    {item.status !== "completed" && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${status.color.replace("text-", "bg-")}`} />
                        <span className={`text-[10px] ${status.color}`}>
                          {item.status === "needs_confirmation" ? "Needs review" : "In progress"}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            {selectedItem ? (
              <div className="max-w-2xl mx-auto px-6 py-8">
                {/* From Tappy */}
                <div className="flex items-center gap-3 mb-6">
                  <Image src="/tappy_mascot.png" alt="Tappy" width={40} height={40} className="rounded-full" />
                  <div>
                    <p className="font-medium text-foreground">Tappy</p>
                    <p className="text-xs text-muted-foreground">{formatFullDate(selectedItem.created_at)}</p>
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-2xl font-semibold text-foreground mb-6">{selectedItem.title}</h1>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-border via-border/50 to-transparent mb-6" />

                {/* Message */}
                <div className="prose prose-sm max-w-none">
                  <div className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {selectedItem.message}
                  </div>
                </div>

                {/* Journal Reference */}
                {selectedItem.journal_excerpt && (
                  <div className="mt-8 rounded-xl border border-border bg-secondary/30 p-4">
                    <p className="text-xs text-muted-foreground mb-2">Based on what you wrote:</p>
                    <p className="text-sm italic text-foreground">&ldquo;{selectedItem.journal_excerpt}&rdquo;</p>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-8 flex items-center gap-3">
                  {selectedItem.status === "needs_confirmation" && selectedItem.action && (
                    <>
                      <button
                        onClick={() => handleConfirm(selectedItem.id)}
                        className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        <Check className="h-4 w-4" />
                        {selectedItem.action}
                      </button>
                      <button
                        onClick={() => handleDismiss(selectedItem.id)}
                        className="h-9 rounded-lg px-4 text-sm text-muted-foreground hover:bg-secondary transition-colors"
                      >
                        Dismiss
                      </button>
                    </>
                  )}

                  {selectedItem.status === "pending" && (
                    <div className="flex items-center gap-2 text-sm text-blue-500">
                      <Clock className="h-4 w-4" />
                      <span>I&apos;m working on this...</span>
                    </div>
                  )}

                  {selectedItem.status === "completed" && (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 text-sm text-green-500">
                        <Check className="h-4 w-4" />
                        <span>Done!</span>
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
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Select a message</p>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
