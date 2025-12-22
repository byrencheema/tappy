/**
 * API client for Tappy backend
 */

import type {
  JournalEntryListItem,
  JournalEntryResponse,
  JournalEntryCreate,
  InboxItemResponse,
  InboxItemUpdate,
} from "@/types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(response.status, text || `Request failed with status ${response.status}`);
  }
  return response.json();
}

// Journal Entry API
export const journalApi = {
  async list(limit = 50, offset = 0): Promise<JournalEntryListItem[]> {
    const response = await fetch(`${API_BASE}/journal?limit=${limit}&offset=${offset}`);
    return handleResponse(response);
  },

  async get(id: number): Promise<JournalEntryResponse> {
    const response = await fetch(`${API_BASE}/journal/${id}`);
    return handleResponse(response);
  },

  async create(data: JournalEntryCreate): Promise<JournalEntryResponse> {
    const response = await fetch(`${API_BASE}/journal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/journal/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const text = await response.text();
      throw new ApiError(response.status, text);
    }
  },
};

// Inbox API
export const inboxApi = {
  async list(limit = 50, offset = 0): Promise<InboxItemResponse[]> {
    const response = await fetch(`${API_BASE}/inbox?limit=${limit}&offset=${offset}`);
    return handleResponse(response);
  },

  async get(id: number): Promise<InboxItemResponse> {
    const response = await fetch(`${API_BASE}/inbox/${id}`);
    return handleResponse(response);
  },

  async update(id: number, data: InboxItemUpdate): Promise<InboxItemResponse> {
    const response = await fetch(`${API_BASE}/inbox/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/inbox/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const text = await response.text();
      throw new ApiError(response.status, text);
    }
  },
};

export { ApiError };
