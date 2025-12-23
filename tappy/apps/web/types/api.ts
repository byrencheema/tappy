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

// Skill Link Type
export type SkillLink = {
  label: string;
  url: string;
  type: "external" | "job" | "video" | "article" | "calendar";
};

// Inbox Item Types
export type InboxItemResponse = {
  id: number;
  title: string;
  message: string;
  journal_entry_id: number | null;
  journal_excerpt: string | null;
  created_at: string;
  is_read: boolean;
  skill_result?: {
    links?: SkillLink[];
  } | null;
};

export type InboxItemUpdate = {
  title?: string;
  message?: string;
};
