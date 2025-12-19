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
  const isInitializing = useRef(false);
  const [isReady, setIsReady] = useState(false);

  // Store callbacks in refs to avoid dependency issues
  const onReadyChangeRef = useRef(onReadyChange);
  const onInstanceChangeRef = useRef(onInstanceChange);

  useEffect(() => {
    onReadyChangeRef.current = onReadyChange;
    onInstanceChangeRef.current = onInstanceChange;
  }, [onReadyChange, onInstanceChange]);

  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (isInitializing.current || editorRef.current) return;
    isInitializing.current = true;

    let isMounted = true;

    async function loadEditor() {
      const Editor = (await import("@editorjs/editorjs")).default;
      const Header = (await import("@editorjs/header")).default;
      const List = (await import("@editorjs/list")).default;

      if (!isMounted) return;

      const instance = new Editor({
        holder: "journal-editor",
        placeholder: "What's on your mind today?",
        autofocus: true,
        minHeight: 180,
        data: {
          blocks: []
        },
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
          editorRef.current = instance;
          setIsReady(true);
          onReadyChangeRef.current?.(true);
          onInstanceChangeRef.current?.(instance);
        },
      });
    }

    loadEditor();

    return () => {
      isMounted = false;
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
      isInitializing.current = false;
      onInstanceChangeRef.current?.(null);
      setIsReady(false);
      onReadyChangeRef.current?.(false);
    };
  }, []);

  return (
    <div className="relative">
      {!isReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        </div>
      )}

      <div
        id="journal-editor"
        className="min-h-[60vh] focus-within:outline-none"
        aria-busy={!isReady}
        aria-label="Journal entry editor"
      />
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
