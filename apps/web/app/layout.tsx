import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";

import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { Sidebar } from "@/components/sidebar";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Tappy — Your AI Life Assistant",
  description: "The world's first personal journal that takes action. Write about your life, Tappy makes it happen.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <div className="flex min-h-screen bg-background text-foreground">
            <Sidebar />
            <main className="flex-1 pl-60">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
