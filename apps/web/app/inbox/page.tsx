"use client";

import { useState } from "react";
import { Check, Clock, AlertCircle, ChevronDown, ChevronRight, X } from "lucide-react";

type InboxItemStatus = "pending" | "completed" | "needs_confirmation";

type InboxItem = {
  id: string;
  title: string;
  message: string;
  action?: string;
  status: InboxItemStatus;
  timestamp: Date;
  journalExcerpt?: string;
};

const mockInboxItems: InboxItem[] = [
  {
    id: "1",
    title: "Found a 5K run for you!",
    message: "Based on your journal entry about wanting to get in shape, I found the San Francisco Bay to Breakers 5K happening next month.",
    action: "Register for $45",
    status: "needs_confirmation",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    journalExcerpt: "I really should lose some weight. Maybe I'll start running...",
  },
  {
    id: "2",
    title: "Gym hours found",
    message: "The closest 24 Hour Fitness to you is open 5am-11pm on weekdays. They have a $29.99/month deal.",
    status: "completed",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: "3",
    title: "Reservation confirmed!",
    message: "I booked a table for 2 at Flour + Water this Saturday at 7:30 PM. Confirmation #FW2847.",
    status: "completed",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
  {
    id: "4",
    title: "Flight prices dropped!",
    message: "Flights from SFO to Tokyo are now $650 roundtrip - that's 40% less than last month.",
    action: "View flights",
    status: "needs_confirmation",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
  },
  {
    id: "5",
    title: "Mom's birthday reminder",
    message: "Your mom's birthday is in 5 days. I found some bestsellers she might like.",
    action: "See gift ideas",
    status: "pending",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
  },
];

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

function formatTimestamp(date: Date) {
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
  const [items, setItems] = useState<InboxItem[]>(mockInboxItems);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleConfirm = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "completed" as const } : item
      )
    );
  };

  const handleDismiss = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (expandedId === id) setExpandedId(null);
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
        {items.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
              <span className="text-2xl">🦊</span>
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
                      <p className="text-sm text-muted-foreground truncate">{item.message}</p>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatTimestamp(item.timestamp)}
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
                        <p className="text-sm text-foreground leading-relaxed">{item.message}</p>

                        {item.journalExcerpt && (
                          <div className="rounded-lg bg-secondary/50 p-3 text-sm">
                            <p className="text-xs text-muted-foreground mb-1">From your journal</p>
                            <p className="italic text-foreground">&ldquo;{item.journalExcerpt}&rdquo;</p>
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
      </div>
    </div>
  );
}
