import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <div className="space-y-2">
        <p className="text-8xl font-bold text-zinc-200 dark:text-zinc-700">404</p>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Page not found
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex shrink-0 items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 px-4 h-8 text-sm font-medium text-white transition-all"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
