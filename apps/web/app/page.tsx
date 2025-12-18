"use client";

import { type FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { JournalEditor, readEditorContent, type EditorContent } from "@/components/editor";
import type EditorJS from "@editorjs/editorjs";

const defaultApiBase = "http://localhost:8000";

const apiBase =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultApiBase
    : defaultApiBase;

type PlannerAction = {
  type: string;
  task: string;
  skills: string[];
};

type PlannerResult = {
  should_act: boolean;
  action?: PlannerAction | null;
};

type JournalResponse = {
  plan: PlannerResult;
  execution?: unknown;
};

export default function Home() {
  const [editorInstance, setEditorInstance] = useState<EditorJS | null>(null);
  const [editorReady, setEditorReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<JournalResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apiHint = useMemo(() => apiBase, []);

  const formatEditorContent = (content: EditorContent | null) => {
    if (!content) return "";

    const plainBlocks = content.blocks.map((block) => {
      if (block.type === "header" && typeof block.data?.text === "string") {
        return block.data.text;
      }

      if (block.type === "list" && Array.isArray((block.data as any)?.items)) {
        return (block.data as any).items.join("\n");
      }

      if (typeof (block.data as any)?.text === "string") {
        return (block.data as any).text.replace(/<[^>]*>/g, "");
      }

      return JSON.stringify(block.data);
    });

    return plainBlocks.join("\n\n").trim();
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setResult(null);
    setError(null);

    try {
      const content = await readEditorContent(editorInstance);
      const text = formatEditorContent(content);

      if (!text) {
        throw new Error("Please enter a journal entry before submitting.");
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

      const data = (await response.json()) as JournalResponse;
      setResult(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Journal automation</h1>
        <p className="text-muted-foreground">
          Draft a journal entry, let the planner decide if browser actions are needed, and review the
          execution.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Journal entry</CardTitle>
            <CardDescription>
              Submit a short entry. The planner responds with JSON-only instructions for the browser agent.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="journal-editor">Entry</Label>
                <JournalEditor
                  onReadyChange={(ready) => {
                    setEditorReady(ready);
                  }}
                  onInstanceChange={setEditorInstance}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">
                  API base: <span className="font-medium text-foreground">{apiHint}</span>
                </div>
                <Button disabled={isSubmitting || !editorReady} type="submit">
                  {isSubmitting ? "Submitting..." : "Submit entry"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>
              Planner JSON and the one-step browser agent output are displayed here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}
            {result ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Planner response</h3>
                  <pre className="custom-scroll max-h-64 overflow-auto rounded-md bg-muted/50 p-3 text-sm">
                    {JSON.stringify(result.plan, null, 2)}
                  </pre>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Execution</h3>
                  <pre className="custom-scroll max-h-64 overflow-auto rounded-md bg-muted/50 p-3 text-sm">
                    {JSON.stringify(result.execution ?? "No execution performed", null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Submit an entry to see the planner decision and (if needed) a single browser-use step.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
