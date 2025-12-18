"use client";

import { useEffect, useRef, useState } from "react";
import type EditorJS from "@editorjs/editorjs";

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
        placeholder: "Describe what you want to research or automate...",
        autofocus: true,
        tools: {
          header: {
            class: Header,
            inlineToolbar: ["link"],
            shortcut: "CMD+SHIFT+H",
          },
          list: {
            class: List,
            inlineToolbar: true,
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
    <div
      id="journal-editor"
      className="min-h-[220px] rounded-md border border-input bg-background px-3 py-3 shadow-sm transition focus-within:border-ring"
      aria-busy={!isReady}
      aria-label="Journal entry rich text editor"
    />
  );
}

export async function readEditorContent(
  editor: EditorJS | null
): Promise<EditorContent | null> {
  if (!editor) return null;
  const saved = await editor.save();
  return saved as EditorContent;
}
