"use client";

import { type FormEvent, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type EditorJS from "@editorjs/editorjs";
import { ArrowLeft, Check } from "lucide-react";
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
  const [isSaved, setIsSaved] = useState(false);

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

      setIsSaved(true);
      setTimeout(() => {
        router.push("/?submitted=true");
      }, 500);
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
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Minimal Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Link>

        <div className="flex items-center gap-3">
          {editorReady && (
            <span className="text-xs text-muted-foreground">
              {isSaved ? "Saved" : "Draft"}
            </span>
          )}
        </div>
      </header>

      {/* Full Page Editor */}
      <main className="flex-1 flex flex-col">
        <form onSubmit={onSubmit} className="flex-1 flex flex-col">
          <div className="flex-1 mx-auto w-full max-w-2xl px-6">
            {/* Date */}
            <div className="pt-8 pb-6">
              <p className="text-sm text-muted-foreground">{dateString}</p>
            </div>

            {/* Editor */}
            <div className="journal-editor-wrapper">
              <JournalEditor
                onReadyChange={setEditorReady}
                onInstanceChange={setEditorInstance}
              />
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="flex-shrink-0 border-t border-border bg-background/80 backdrop-blur-sm">
            <div className="mx-auto max-w-2xl px-6 py-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Tappy will read your entry and help you take action.
              </p>
              <button
                type="submit"
                disabled={isSubmitting || !editorReady}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSaved ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Saved</span>
                  </>
                ) : isSubmitting ? (
                  <span>Saving...</span>
                ) : (
                  <span>Save Entry</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
