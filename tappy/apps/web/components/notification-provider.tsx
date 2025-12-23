"use client";

import { useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Toaster, toast } from "sonner";
import { useSSE } from "@/lib/useSSE";
import { useInbox } from "@/lib/inbox-context";
import type { InboxItemResponse } from "@/types/api";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { addItem } = useInbox();

  const handleInboxItem = useCallback(
    (item: InboxItemResponse) => {
      addItem(item);
      toast("Tappy found something for you", {
        description: item.title,
        icon: (
          <Image
            src="/tappy-lightbulb.png"
            alt="Tappy"
            width={40}
            height={40}
            className="rounded"
          />
        ),
        action: {
          label: "View",
          onClick: () => router.push("/inbox"),
        },
        duration: 7500,
      });
    },
    [router, addItem]
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
          actionButtonStyle: {
            background: "hsl(25 12% 18%)",
            color: "hsl(40 20% 94%)",
          },
        }}
      />
    </>
  );
}
