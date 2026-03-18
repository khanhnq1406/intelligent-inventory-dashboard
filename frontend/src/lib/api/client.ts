const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const TIMEOUT_MS = 30_000;
const RETRY_DELAY_MS = 1_000;

export class ApiError extends Error {
  status: number;
  code: string;
  details?: string;

  constructor(message: string, status: number, code: string, details?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface ErrorResponse {
  code: number;
  message: string;
}

function isRetryableMethod(options?: RequestInit): boolean {
  const method = (options?.method ?? "GET").toUpperCase();
  return method === "GET";
}

async function fetchOnce<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...options?.headers },
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      let errorBody: ErrorResponse | null = null;
      try {
        errorBody = await res.json();
      } catch {
        // Ignore JSON parse failures
      }
      throw new ApiError(
        errorBody?.message ?? `API error: ${res.status}`,
        res.status,
        errorBody ? String(errorBody.code) : "API_ERROR",
        errorBody?.message
      );
    }

    return res.json() as Promise<T>;
  } catch (err) {
    clearTimeout(timeoutId);

    if (err instanceof ApiError) {
      throw err;
    }

    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Request timed out", 0, "TIMEOUT");
    }

    throw new ApiError(
      "Network error — please check your connection",
      0,
      "NETWORK_ERROR"
    );
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  // Eagerly start the retry delay timer so fake timers in tests can advance it
  // before the first request completes. Only start it for idempotent methods.
  const retryDelayPromise = isRetryableMethod(options) ? delay(RETRY_DELAY_MS) : null;

  return fetchOnce<T>(path, options).catch((err: unknown) => {
    if (
      err instanceof ApiError &&
      err.status >= 500 &&
      retryDelayPromise !== null
    ) {
      console.warn(
        `apiFetch: retrying ${path} after 5xx (status ${err.status})`
      );
      return retryDelayPromise.then(() => fetchOnce<T>(path, options));
    }
    throw err;
  });
}
