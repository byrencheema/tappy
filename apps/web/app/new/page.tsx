"use client";

import { type FormEvent, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type EditorJS from "@editorjs/editorjs";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import Link from "next/link";

import { JournalEditor, readEditorContent, type EditorContent } from "@/components/editor";

const defaultApiBase = "http://localhost:8000";

const apiBase =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultApiBase
    : defaultApiBase;

export default function NewEntryPage() {
  const router = useRouter();
  const [editorInstance, setEditorInstance] = useState<EditorJS | null>(null);
  const [editorReady, setEditorReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatEditorContent = useCallback((content: EditorContent | null) => {
    if (!content) return "";

    const plainBlocks = content.blocks.map((block) => {
      if (block.type === "header" && typeof block.data?.text === "string") {
        return block.data.text;
      }

      if (block.type === "list" && Array.isArray((block.data as Record<string, unknown>)?.items)) {
        return ((block.data as Record<string, unknown>).items as string[]).join("\n");
      }

      if (typeof (block.data as Record<string, unknown>)?.text === "string") {
        return ((block.data as Record<string, unknown>).text as string).replace(/<[^>]*>/g, "");
      }

      return JSON.stringify(block.data);
    });

    return plainBlocks.join("\n\n").trim();
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const content = await readEditorContent(editorInstance);
      const text = formatEditorContent(content);

      if (!text) {
        throw new Error("Please write something before submitting.");
      }

      const response = await fetch(`${apiBase}/journal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(details || `Request failed with status ${response.status}`);
      }

      // Navigate back to journal with success
      router.push("/?submitted=true");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = new Date();
  const dateString = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background border-b border-border">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-base font-semibold text-foreground">New Entry</h1>
              <p className="text-xs text-muted-foreground">{dateString}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${editorReady ? "bg-green-500" : "bg-amber-500 animate-pulse"}`} />
            <span>{editorReady ? "Ready" : "Loading..."}</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="mx-auto max-w-2xl px-6 py-8">
        {/* Tappy prompt */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 shadow-sm">
            <span className="text-xl">🦊</span>
          </div>
          <p className="text-muted-foreground">What&apos;s on your mind today?</p>
        </div>

        {/* Editor */}
        <form onSubmit={onSubmit}>
          <div className="editor-container rounded-2xl border border-border bg-card shadow-sm">
            <JournalEditor
              onReadyChange={setEditorReady}
              onInstanceChange={setEditorInstance}
            />
          </div>

          {/* Submit button */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Tappy will read your entry and suggest helpful actions.
            </p>
            <button
              type="submit"
              disabled={isSubmitting || !editorReady}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Submit</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
