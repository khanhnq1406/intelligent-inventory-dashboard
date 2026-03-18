import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/lib/providers";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Intelligent Inventory Dashboard",
  description:
    "Real-time vehicle stock overview with aging stock identification and actionable insights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.variable
        )}
      >
        <Providers>
          <Sidebar />
          <MobileNav />
          {/* On mobile: no left margin (sidebar hidden). On md+: ml-16 for icon sidebar */}
          <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 md:ml-16">
            <div className="mx-auto max-w-7xl px-4 py-4 pt-16 sm:px-6 sm:py-6 md:pt-6">
              {children}
            </div>
          </main>
        </Providers>
      </body>
    </html>
  );
}
