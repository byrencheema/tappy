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

// Planner/Execution Types
export type SkillType = "data_retrieval" | "action" | "analysis" | "interactive";

export type SkillStatus = "pending" | "running" | "completed" | "failed";

export type SkillParameters = {
  query?: string;
  limit?: number;
  [key: string]: unknown; // Allow additional skill-specific parameters
};

export type PlannerResult = {
  should_act: boolean;
  skill_id: string | null;
  skill_name: string | null;
  parameters: SkillParameters | null;
  reason: string;
};

export type SkillExecutionResult = {
  status: SkillStatus;
  skill_id?: string;
  skill_name?: string;
  skill_type?: SkillType;
  output?: unknown;
  error?: string;
  formatted_output?: string;
  metadata?: Record<string, unknown>;
};

export type AgenticStep = {
  type: "planning" | "execution" | "formatting";
  status: SkillStatus;
  title: string;
  message?: string;
  timestamp: string;
};

// Combined Response for POST /journal
export type JournalCreateResponse = {
  entry: JournalEntryResponse;
  plan: PlannerResult;
  execution: SkillExecutionResult | null;
  inbox_item: InboxItemResponse | null;
  agentic_steps?: AgenticStep[];
};
