"use client";

import { useState } from "react";
import { Check, Clock, AlertCircle, Star, Archive, Trash2, MoreHorizontal, RefreshCw } from "lucide-react";

type InboxItemStatus = "pending" | "completed" | "needs_confirmation";

type InboxItem = {
  id: string;
  title: string;
  message: string;
  action?: string;
  status: InboxItemStatus;
  timestamp: Date;
  journalExcerpt?: string;
  starred?: boolean;
  read?: boolean;
};

const mockInboxItems: InboxItem[] = [
  {
    id: "1",
    title: "Found a 5K run for you!",
    message: "Based on your journal entry about wanting to get in shape, I found the San Francisco Bay to Breakers 5K happening next month. It's beginner-friendly and has great reviews!",
    action: "Register for $45",
    status: "needs_confirmation",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    journalExcerpt: "I really should lose some weight. Maybe I'll start running...",
    starred: false,
    read: false,
  },
  {
    id: "2",
    title: "Gym hours found",
    message: "The closest 24 Hour Fitness to you is open 5am-11pm on weekdays. They have a $29.99/month deal for new members.",
    status: "completed",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    journalExcerpt: "I really should lose some weight...",
    starred: true,
    read: true,
  },
  {
    id: "3",
    title: "Reservation confirmed!",
    message: "I booked a table for 2 at Flour + Water this Saturday at 7:30 PM. Confirmation #FW2847.",
    status: "completed",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    journalExcerpt: "Anniversary coming up, should take Sarah somewhere nice...",
    starred: false,
    read: true,
  },
  {
    id: "4",
    title: "Flight prices dropped!",
    message: "Remember when you mentioned wanting to visit Japan? Flights from SFO to Tokyo are now $650 roundtrip - that's 40% less than last month.",
    action: "View flights",
    status: "needs_confirmation",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
    journalExcerpt: "Would love to travel to Japan someday...",
    starred: false,
    read: false,
  },
  {
    id: "5",
    title: "Mom's birthday reminder",
    message: "Your mom's birthday is in 5 days. Based on your notes, she mentioned wanting a new book. I found some bestsellers she might like.",
    action: "See gift ideas",
    status: "pending",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    journalExcerpt: "Need to remember to call mom this weekend...",
    starred: true,
    read: false,
  },
];

type TabType = "all" | "action" | "completed";

function getStatusIcon(status: InboxItemStatus) {
  switch (status) {
    case "needs_confirmation":
      return { icon: AlertCircle, color: "text-amber-500" };
    case "completed":
      return { icon: Check, color: "text-green-500" };
    case "pending":
      return { icon: Clock, color: "text-blue-500" };
  }
}

function formatTimestamp(date: Date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / 1000 / 60 / 60);
  const days = Math.floor(hours / 24);

  if (days === 0) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  if (days === 1) return "Yesterday";
  if (days < 7) return date.toLocaleDateString("en-US", { weekday: "short" });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function InboxPage() {
  const [items, setItems] = useState<InboxItem[]>(mockInboxItems);
  const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<TabType>("all");

  const handleConfirm = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "completed" as const, read: true } : item
      )
    );
    if (selectedItem?.id === id) {
      setSelectedItem({ ...selectedItem, status: "completed", read: true });
    }
  };

  const handleDismiss = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (selectedItem?.id === id) {
      setSelectedItem(null);
    }
  };

  const handleToggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, starred: !item.starred } : item
      )
    );
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectItem = (item: InboxItem) => {
    setSelectedItem(item);
    // Mark as read
    if (!item.read) {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, read: true } : i))
      );
    }
  };

  const handleArchiveSelected = () => {
    setItems((prev) => prev.filter((item) => !selectedIds.has(item.id)));
    setSelectedIds(new Set());
    if (selectedItem && selectedIds.has(selectedItem.id)) {
      setSelectedItem(null);
    }
  };

  const filteredItems = items.filter((item) => {
    if (activeTab === "action") return item.status === "needs_confirmation" || item.status === "pending";
    if (activeTab === "completed") return item.status === "completed";
    return true;
  });

  const unreadCount = items.filter((i) => !i.read).length;
  const actionCount = items.filter((i) => i.status === "needs_confirmation" || i.status === "pending").length;

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: "all", label: "All", count: items.length },
    { id: "action", label: "Needs Action", count: actionCount },
    { id: "completed", label: "Completed" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Gmail-style Header */}
      <header className="sticky top-0 z-30 bg-background border-b border-border">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-base font-semibold text-foreground">Inbox</h1>
            {unreadCount > 0 && (
              <span className="text-sm text-muted-foreground">
                {unreadCount} unread
              </span>
            )}
          </div>
          <button className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-xs ${activeTab === tab.id ? "text-primary" : "text-muted-foreground"}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 px-6 pb-2">
            <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
            <button
              onClick={handleArchiveSelected}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <Archive className="h-4 w-4" />
              Archive
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
        )}
      </header>

      <div className="flex">
        {/* Email List */}
        <div className={`flex-1 ${selectedItem ? "max-w-md border-r border-border" : ""}`}>
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                <span className="text-3xl">🦊</span>
              </div>
              <p className="font-medium text-foreground">
                {activeTab === "all" ? "No messages yet" : `No ${activeTab === "action" ? "pending" : "completed"} items`}
              </p>
              <p className="text-sm text-muted-foreground">
                {activeTab === "all" ? "Tappy will send updates here as they come." : "Check back later."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredItems.map((item) => {
                const status = getStatusIcon(item.status);
                const StatusIcon = status.icon;
                const isSelected = selectedIds.has(item.id);
                const isActive = selectedItem?.id === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    className={`group flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/50 ${
                      isActive ? "bg-primary/5" : ""
                    } ${!item.read ? "bg-primary/[0.02]" : ""}`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={(e) => handleToggleSelect(item.id, e)}
                      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-colors ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background group-hover:border-muted-foreground"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </button>

                    {/* Star */}
                    <button
                      onClick={(e) => handleToggleStar(item.id, e)}
                      className="flex-shrink-0"
                    >
                      <Star
                        className={`h-4 w-4 transition-colors ${
                          item.starred
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/50 hover:text-muted-foreground"
                        }`}
                      />
                    </button>

                    {/* Status Icon */}
                    <StatusIcon className={`h-4 w-4 flex-shrink-0 ${status.color}`} />

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${!item.read ? "font-semibold text-foreground" : "text-foreground"}`}>
                          Tappy
                        </span>
                        <span className={`flex-1 truncate text-sm ${!item.read ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                          {item.title}
                        </span>
                        <span className="flex-shrink-0 text-xs text-muted-foreground">
                          {formatTimestamp(item.timestamp)}
                        </span>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {item.message}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedItem && (
          <div className="flex-1 bg-background">
            <div className="sticky top-14 border-b border-border bg-background px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleStar(selectedItem.id, {} as React.MouseEvent)}
                    className="flex-shrink-0"
                  >
                    <Star
                      className={`h-5 w-5 transition-colors ${
                        items.find(i => i.id === selectedItem.id)?.starred
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    />
                  </button>
                  <h2 className="text-lg font-semibold text-foreground">{selectedItem.title}</h2>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDismiss(selectedItem.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDismiss(selectedItem.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Sender Info */}
              <div className="mb-6 flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-500">
                  <span className="text-lg">🦊</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">Tappy</span>
                    <span className="text-sm text-muted-foreground">
                      {formatTimestamp(selectedItem.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">to me</p>
                </div>
              </div>

              {/* Message Body */}
              <div className="space-y-6">
                <p className="text-foreground leading-relaxed">{selectedItem.message}</p>

                {selectedItem.journalExcerpt && (
                  <div className="rounded-lg border border-border bg-secondary/30 p-4">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">From your journal</p>
                    <p className="text-sm italic text-foreground">&ldquo;{selectedItem.journalExcerpt}&rdquo;</p>
                  </div>
                )}

                {/* Actions */}
                {selectedItem.status === "needs_confirmation" && selectedItem.action && (
                  <div className="flex items-center gap-3 pt-4">
                    <button
                      onClick={() => handleConfirm(selectedItem.id)}
                      className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
                    >
                      <Check className="h-4 w-4" />
                      {selectedItem.action}
                    </button>
                    <button
                      onClick={() => handleDismiss(selectedItem.id)}
                      className="h-9 rounded-lg px-4 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {selectedItem.status === "pending" && (
                  <div className="flex items-center gap-2 pt-4 text-blue-600 dark:text-blue-400">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">Working on this...</span>
                  </div>
                )}

                {selectedItem.status === "completed" && (
                  <div className="flex items-center gap-2 pt-4 text-green-600 dark:text-green-400">
                    <Check className="h-4 w-4" />
                    <span className="text-sm font-medium">Completed</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
