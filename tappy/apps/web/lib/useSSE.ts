"use client";

import { useEffect, useRef, useCallback } from "react";
import type { InboxItemResponse } from "@/types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type SSECallback = (item: InboxItemResponse) => void;

export function useSSE(onInboxItem: SSECallback) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(onInboxItem);

  callbackRef.current = onInboxItem;

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`${API_BASE}/events`);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener("inbox-item", (event) => {
      try {
        const data = JSON.parse(event.data) as InboxItemResponse;
        callbackRef.current(data);
      } catch (err) {
        console.error("Failed to parse SSE event:", err);
      }
    });

    eventSource.onerror = () => {
      eventSource.close();
      eventSourceRef.current = null;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connect]);
}
