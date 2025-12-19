"use client";

import { type FormEvent, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type EditorJS from "@editorjs/editorjs";
import { ArrowLeft, Check, Calendar } from "lucide-react";
import Link from "next/link";

import { JournalEditor, readEditorContent, type EditorContent } from "@/components/editor";
import { journalApi } from "@/lib/api";

export default function NewEntryPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [editorInstance, setEditorInstance] = useState<EditorJS | null>(null);
  const [editorReady, setEditorReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize title textarea
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = "auto";
      titleRef.current.style.height = titleRef.current.scrollHeight + "px";
    }
  }, [title]);

  // Focus title on mount
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.focus();
    }
  }, []);

  const formatEditorContent = (content: EditorContent | null) => {
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
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Focus the editor
      const editorElement = document.querySelector(".ce-paragraph") as HTMLElement;
      if (editorElement) {
        editorElement.focus();
      }
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const content = await readEditorContent(editorInstance);
      const text = formatEditorContent(content);

      if (!text && !title.trim()) {
        throw new Error("Please write something before saving.");
      }

      // Send title, plain text, and full Editor.js JSON
      await journalApi.create({
        title: title.trim() || undefined,
        text: text || title.trim(),
        content_json: JSON.stringify(content),
      });

      setIsSaved(true);
      setTimeout(() => {
        router.push("/");
      }, 500);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to save entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = new Date();
  const dateString = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Minimal Floating Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-background/80 backdrop-blur-md">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Link>

        <div className="flex items-center gap-4">
          {editorReady && (
            <span className="text-xs text-muted-foreground px-2 py-1 rounded-md bg-secondary/50">
              {isSaved ? "✓ Saved" : "Draft"}
            </span>
          )}
          <button
            type="submit"
            form="journal-form"
            disabled={isSubmitting || !editorReady}
            className="inline-flex h-8 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSaved ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Saved</span>
              </>
            ) : isSubmitting ? (
              <span>Saving...</span>
            ) : (
              <span>Save</span>
            )}
          </button>
        </div>
      </header>

      {/* Main Editor Area */}
      <main className="flex-1 pt-16">
        <form id="journal-form" onSubmit={onSubmit} className="flex-1 flex flex-col">
          <div className="mx-auto w-full max-w-2xl px-6 py-12">
            {/* Date Badge */}
            <div className="flex items-center gap-2 mb-8 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">{dateString}</span>
            </div>

            {/* Title Input - Notion style */}
            <div className="mb-6">
              <textarea
                ref={titleRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                placeholder="Untitled"
                rows={1}
                className="w-full resize-none overflow-hidden bg-transparent text-4xl font-bold tracking-tight text-foreground placeholder:text-muted-foreground/40 focus:outline-none leading-tight"
                style={{ minHeight: "1.2em" }}
              />
            </div>

            {/* Subtle divider */}
            <div className="h-px bg-gradient-to-r from-border via-border/50 to-transparent mb-8" />

            {/* Editor */}
            <div className="journal-editor-wrapper notion-style">
              <JournalEditor
                onReadyChange={setEditorReady}
                onInstanceChange={setEditorInstance}
              />
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}
