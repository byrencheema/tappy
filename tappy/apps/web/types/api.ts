/**
 * API types matching the FastAPI backend schemas
 */

// Journal Entry Types
export type JournalEntryListItem = {
  id: number;
  title: string | null;
  preview: string;
  created_at: string;
  actions_triggered: number;
};

export type JournalEntryResponse = {
  id: number;
  title: string | null;
  text: string;
  content_json: string;
  created_at: string;
  actions_triggered: number;
};

export type JournalEntryCreate = {
  title?: string;
  text: string;
  content_json: string;
};

// Inbox Item Types
export type InboxItemStatus = "pending" | "completed" | "needs_confirmation";

export type InboxItemResponse = {
  id: number;
  title: string;
  message: string;
  action: string | null;
  status: InboxItemStatus;
  journal_entry_id: number | null;
  journal_excerpt: string | null;
  created_at: string;
  skill_result?: Record<string, unknown> | null;
};

export type InboxItemUpdate = {
  status?: InboxItemStatus;
  title?: string;
  message?: string;
  action?: string;
};
