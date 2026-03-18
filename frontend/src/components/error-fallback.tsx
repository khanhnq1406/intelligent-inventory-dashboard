"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function ErrorFallback({ error, reset }: ErrorFallbackProps) {
  useEffect(() => {
    console.error("Error boundary caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-950">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Something went wrong
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
          An unexpected error occurred. Please try again or return to the dashboard.
        </p>
      </div>
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Button onClick={reset} className="bg-blue-600 hover:bg-blue-700 text-white">
          Try Again
        </Button>
        <Link
          href="/"
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white px-2.5 h-8 text-sm font-medium transition-all hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
