import { apiFetch, ApiError } from "@/lib/api/client";

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.useFakeTimers();

describe("apiFetch", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  describe("ApiError class", () => {
    it("has status, code, and details properties", () => {
      const err = new ApiError("Test", 404, "NOT_FOUND", "Not found detail");
      expect(err.status).toBe(404);
      expect(err.code).toBe("NOT_FOUND");
      expect(err.details).toBe("Not found detail");
      expect(err instanceof Error).toBe(true);
    });
  });

  describe("successful requests", () => {
    it("returns parsed JSON on 200", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "1", name: "test" }),
      });

      const result = await apiFetch<{ id: string; name: string }>("/api/v1/test");
      expect(result).toEqual({ id: "1", name: "test" });
    });
  });

  describe("4xx errors", () => {
    it("throws ApiError with status and code for 404", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ code: 404, message: "Not found" }),
      });

      await expect(apiFetch("/api/v1/missing")).rejects.toMatchObject({
        status: 404,
        details: "Not found",
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("does NOT retry on 4xx", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ code: 400, message: "Bad request" }),
      });

      await expect(apiFetch("/api/v1/bad")).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("5xx errors and retry", () => {
    it("retries once on 5xx GET and succeeds on second attempt", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          json: async () => ({ code: 503, message: "Service unavailable" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: "ok" }),
        });

      const promise = apiFetch<{ data: string }>("/api/v1/retry-test");
      vi.advanceTimersByTime(1100);
      const result = await promise;

      expect(result).toEqual({ data: "ok" });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("throws ApiError after exhausting 1 retry on 5xx", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ code: 500, message: "Internal error" }),
      });

      const promise = apiFetch("/api/v1/fail");
      vi.advanceTimersByTime(1100);

      await expect(promise).rejects.toMatchObject({ status: 500 });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("does NOT retry POST on 5xx", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ code: 500, message: "Server error" }),
      });

      await expect(
        apiFetch("/api/v1/vehicles", { method: "POST" })
      ).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("network errors", () => {
    it("wraps network error as ApiError with status 0", async () => {
      mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

      await expect(apiFetch("/api/v1/test")).rejects.toMatchObject({
        status: 0,
        code: "NETWORK_ERROR",
      });
    });
  });
});
