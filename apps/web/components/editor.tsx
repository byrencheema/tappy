"use client";

import { useEffect, useRef, useState } from "react";
import type EditorJS from "@editorjs/editorjs";
import { Loader2 } from "lucide-react";

export type EditorProps = {
  onReadyChange?: (ready: boolean) => void;
  onInstanceChange?: (instance: EditorJS | null) => void;
};

export type EditorContent = {
  time: number;
  blocks: Array<{ type: string; data: Record<string, unknown> }>;
  version?: string;
};

export function JournalEditor({ onReadyChange, onInstanceChange }: EditorProps) {
  const editorRef = useRef<EditorJS | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadEditor() {
      const Editor = (await import("@editorjs/editorjs")).default;
      const Header = (await import("@editorjs/header")).default;
      const List = (await import("@editorjs/list")).default;

      const instance = new Editor({
        holder: "journal-editor",
        placeholder: "What's on your mind today?",
        autofocus: true,
        minHeight: 180,
        tools: {
          header: {
            class: Header,
            inlineToolbar: ["link"],
            config: {
              placeholder: "Heading",
              levels: [1, 2, 3],
              defaultLevel: 2,
            },
            shortcut: "CMD+SHIFT+H",
          },
          list: {
            class: List,
            inlineToolbar: true,
            config: {
              defaultStyle: "unordered",
            },
          },
        },
        onReady() {
          if (!isMounted) return;
          setIsReady(true);
          onReadyChange?.(true);
          onInstanceChange?.(instance);
        },
      });

      editorRef.current = instance;
    }

    loadEditor();

    return () => {
      isMounted = false;
      void editorRef.current?.destroy?.();
      editorRef.current = null;
      onInstanceChange?.(null);
      setIsReady(false);
      onReadyChange?.(false);
    };
  }, [onInstanceChange, onReadyChange]);

  return (
    <div className="relative">
      {!isReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading editor...</span>
          </div>
        </div>
      )}

      <div
        id="journal-editor"
        className="min-h-[200px] px-4 py-4"
        aria-busy={!isReady}
        aria-label="Journal entry editor"
      />

      <div className="flex items-center gap-3 border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
        <span>
          <kbd className="rounded bg-muted px-1 py-0.5 font-mono">/</kbd> commands
        </span>
        <span>
          <kbd className="rounded bg-muted px-1 py-0.5 font-mono">Cmd+Shift+H</kbd> heading
        </span>
      </div>
    </div>
  );
}

export async function readEditorContent(
  editor: EditorJS | null
): Promise<EditorContent | null> {
  if (!editor) return null;
  const saved = await editor.save();
  return saved as EditorContent;
}
