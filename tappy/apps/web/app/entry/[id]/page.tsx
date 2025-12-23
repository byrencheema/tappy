"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, Loader2, Calendar, Zap } from "lucide-react";
import { journalApi } from "@/lib/api";
import type { JournalEntryResponse } from "@/types/api";

type EditorBlock = {
  type: string;
  data: Record<string, unknown>;
};

type EditorContent = {
  time?: number;
  blocks: EditorBlock[];
  version?: string;
};

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function sanitizeHtml(html: string): string {
  return html
    .replace(/&nbsp;?/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function renderBlock(block: EditorBlock, index: number) {
  switch (block.type) {
    case "header": {
      const level = (block.data.level as number) || 2;
      const text = block.data.text as string;
      if (level === 1) {
        return (
          <h1 key={index} className="text-3xl font-bold tracking-tight mt-10 mb-4 text-foreground">
            {text}
          </h1>
        );
      }
      if (level === 2) {
        return (
          <h2 key={index} className="text-2xl font-semibold tracking-tight mt-8 mb-3 text-foreground">
            {text}
          </h2>
        );
      }
      return (
        <h3 key={index} className="text-xl font-semibold tracking-tight mt-6 mb-2 text-foreground">
          {text}
        </h3>
      );
    }
    case "paragraph": {
      const text = block.data.text as string;
      if (!text || text.trim() === "") {
        return <div key={index} className="h-6" />;
      }
      return (
        <p
          key={index}
          className="text-base leading-[1.8] mb-4 text-foreground/90"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }}
        />
      );
    }
    case "list": {
      const items = block.data.items as string[];
      const style = block.data.style as string;
      if (style === "ordered") {
        return (
          <ol key={index} className="list-decimal list-outside ml-6 mb-4 space-y-2">
            {items.map((item, i) => (
              <li key={i} className="text-base leading-[1.8] text-foreground/90 pl-2">
                <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(item) }} />
              </li>
            ))}
          </ol>
        );
      }
      return (
        <ul key={index} className="list-disc list-outside ml-6 mb-4 space-y-2">
          {items.map((item, i) => (
            <li key={i} className="text-base leading-[1.8] text-foreground/90 pl-2">
              <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(item) }} />
            </li>
          ))}
        </ul>
      );
    }
    default:
      return null;
  }
}

export default function EntryDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [entry, setEntry] = useState<JournalEntryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function loadEntry() {
      try {
        setIsLoading(true);
        const id = parseInt(params.id as string, 10);
        if (isNaN(id)) {
          throw new Error("Invalid entry ID");
        }
        const data = await journalApi.get(id);
        setEntry(data);
      } catch (err) {
        console.error("Failed to load entry:", err);
        setError("Failed to load entry");
      } finally {
        setIsLoading(false);
      }
    }
    loadEntry();
  }, [params.id]);

  const handleDelete = async () => {
    if (!entry || !confirm("Are you sure you want to delete this entry?")) return;

    try {
      setIsDeleting(true);
      await journalApi.delete(entry.id);
      router.push("/");
    } catch (err) {
      console.error("Failed to delete entry:", err);
      setError("Failed to delete entry");
      setIsDeleting(false);
    }
  };

  const content: EditorContent | null = entry?.content_json
    ? JSON.parse(entry.content_json)
    : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Floating Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-background/80 backdrop-blur-md border-b border-border/50">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Link>

        {entry && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50 px-3 py-1.5 rounded-lg hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            <span>{isDeleting ? "Deleting..." : "Delete"}</span>
          </button>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 pt-16">
        <div className="mx-auto max-w-2xl px-6 py-12">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
                <p className="text-sm text-muted-foreground">Loading entry...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="text-center py-24">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
                <span className="text-2xl">😕</span>
              </div>
              <p className="text-destructive font-medium mb-2">{error}</p>
              <Link href="/" className="text-sm text-primary hover:underline">
                Go back home
              </Link>
            </div>
          )}

          {/* Entry Content */}
          {!isLoading && !error && entry && (
            <article className="animate-in">
              {/* Meta info */}
              <div className="flex items-center gap-4 mb-8">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm font-medium">{formatDate(entry.created_at)}</span>
                  <span className="text-sm">at {formatTime(entry.created_at)}</span>
                </div>
                {entry.actions_triggered > 0 && (
                  <div className="flex items-center gap-1.5 text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                    <Zap className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">
                      {entry.actions_triggered} action{entry.actions_triggered !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>

              {/* Title */}
              <h1 className="text-4xl font-bold tracking-tight text-foreground mb-8 leading-tight">
                {entry.title || "Untitled"}
              </h1>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-border via-border/50 to-transparent mb-10" />

              {/* Rendered Content */}
              <div className="prose-content">
                {content?.blocks.map((block, index) => renderBlock(block, index))}
              </div>

              {/* Fallback to plain text if no blocks */}
              {(!content?.blocks || content.blocks.length === 0) && entry.text && (
                <div className="whitespace-pre-wrap text-base leading-[1.8] text-foreground/90">
                  {entry.text}
                </div>
              )}

              {/* Empty state */}
              {(!content?.blocks || content.blocks.length === 0) && !entry.text && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground italic">This entry has no content.</p>
                </div>
              )}
            </article>
          )}
        </div>
      </main>
    </div>
  );
}
