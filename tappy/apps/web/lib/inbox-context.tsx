"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import type { InboxItemResponse } from "@/types/api";
import { inboxApi } from "@/lib/api";

type InboxContextValue = {
  items: InboxItemResponse[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  addItem: (item: InboxItemResponse) => void;
  updateItem: (id: number, item: InboxItemResponse) => void;
  removeItem: (id: number) => void;
  refresh: () => Promise<void>;
};

const InboxContext = createContext<InboxContextValue | null>(null);

export function InboxProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InboxItemResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = items.filter((i) => !i.is_read).length;

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await inboxApi.list();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inbox");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addItem = useCallback((item: InboxItemResponse) => {
    setItems((prev) => {
      if (prev.some((i) => i.id === item.id)) {
        return prev;
      }
      return [item, ...prev];
    });
  }, []);

  const updateItem = useCallback((id: number, item: InboxItemResponse) => {
    setItems((prev) => prev.map((i) => (i.id === id ? item : i)));
  }, []);

  const removeItem = useCallback((id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <InboxContext.Provider
      value={{
        items,
        unreadCount,
        isLoading,
        error,
        addItem,
        updateItem,
        removeItem,
        refresh,
      }}
    >
      {children}
    </InboxContext.Provider>
  );
}

export function useInbox() {
  const context = useContext(InboxContext);
  if (!context) {
    throw new Error("useInbox must be used within an InboxProvider");
  }
  return context;
}
