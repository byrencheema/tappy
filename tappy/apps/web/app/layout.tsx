import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Lora } from "next/font/google";

import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { NotificationProvider } from "@/components/notification-provider";
import { Sidebar } from "@/components/sidebar";
import { InboxProvider } from "@/lib/inbox-context";

const lora = Lora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Tappy",
  description: "The world's first personal journal that takes action. Write about your life, Tappy makes it happen.",
  icons: {
    icon: "/tappy_mascot.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={lora.variable}>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <InboxProvider>
            <NotificationProvider>
              <div className="flex min-h-screen bg-background text-foreground">
                <Sidebar />
                <main className="flex-1 pl-60">
                  {children}
                </main>
              </div>
            </NotificationProvider>
          </InboxProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
