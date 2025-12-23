"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Toaster, toast } from "sonner";
import { useSSE } from "@/lib/useSSE";
import type { InboxItemResponse } from "@/types/api";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const handleInboxItem = useCallback(
    (item: InboxItemResponse) => {
      toast("Tappy found something for you", {
        description: item.title,
        action: {
          label: "View",
          onClick: () => router.push("/inbox"),
        },
        duration: 5000,
      });
    },
    [router]
  );

  useSSE(handleInboxItem);

  return (
    <>
      {children}
      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: {
            background: "hsl(25 12% 11%)",
            color: "hsl(40 20% 94%)",
            border: "1px solid hsl(25 12% 18%)",
            borderRadius: "0.625rem",
          },
        }}
      />
    </>
  );
}
