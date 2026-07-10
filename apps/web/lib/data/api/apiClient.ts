import { DataError } from "@/lib/data/errors";

export type RequestOptions = { headers?: Record<string, string>; signal?: AbortSignal };
export type AuthTokenProvider = () => Promise<string | null>;
const REQUEST_TIMEOUT_MS = 20_000;
const GET_CACHE_MS = 45_000;
const DEV_API_DIAGNOSTICS = process.env.NODE_ENV === "development";

let authTokenProvider: AuthTokenProvider | null = null;
let providerWaiters: Array<(provider: AuthTokenProvider) => void> = [];
const getCache = new Map<string, { expiresAt: number; value: Promise<unknown> }>();
const requestCounts = new Map<string, { count: number; firstSeenAt: number }>();

export function setAuthTokenProvider(provider: AuthTokenProvider | null) {
  authTokenProvider = provider;
  getCache.clear();
  if (provider) {
    for (const resolve of providerWaiters) resolve(provider);
    providerWaiters = [];
  }
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const waitStartedAt = now();
  const provider = authTokenProvider ?? await new Promise<AuthTokenProvider>((resolve) => {
    providerWaiters.push(resolve);
  });
  logTiming("auth.provider", waitStartedAt);
  const tokenStartedAt = now();
  const token = await provider();
  logTiming("auth.clerkToken", tokenStartedAt);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

class ApiClient {
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  post<T, TBody = unknown>(path: string, body: TBody, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: "POST", body: JSON.stringify(body) });
  }

  patch<T, TBody = unknown>(path: string, body: TBody, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: "PATCH", body: JSON.stringify(body) });
  }

  delete<T = void>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: "DELETE" });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
    if (!baseUrl) {
      throw new DataError("CONFIGURATION_ERROR", "API mode requires NEXT_PUBLIC_API_BASE_URL.");
    }

    const method = init.method ?? "GET";
    const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    if (method === "GET" && !init.signal) {
      const cached = getCache.get(url);
      if (cached && cached.expiresAt > Date.now()) {
        debugApi("cache hit", { method, path });
        return cached.value as Promise<T>;
      }
      const value = this.requestWithAuth<T>(url, init);
      getCache.set(url, { value, expiresAt: Date.now() + GET_CACHE_MS });
      value.catch(() => getCache.delete(url));
      return value;
    }

    const result = await this.requestWithAuth<T>(url, init);
    if (method !== "GET") getCache.clear();
    return result;
  }

  private async requestWithAuth<T>(url: string, init: RequestInit): Promise<T> {
    const headers = new Headers(init.headers);
    for (const [key, value] of Object.entries(await getAuthHeaders())) headers.set(key, value);
    if (init.body) headers.set("Content-Type", "application/json");
    return this.fetchJson<T>(url, init, headers);
  }

  private async fetchJson<T>(url: string, init: RequestInit, headers: Headers): Promise<T> {
    let response: Response;
    const method = init.method ?? "GET";
    const startedAt = now();
    noteRequest(method, url);
    const timeoutController = init.signal ? null : new AbortController();
    const timeoutId = timeoutController
      ? globalThis.setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS)
      : null;
    try {
      response = await fetch(url, {
        ...init,
        headers,
        cache: "no-store",
        signal: init.signal ?? timeoutController?.signal,
      });
    } catch (error) {
      const aborted = error instanceof DOMException && error.name === "AbortError";
      throw new DataError(
        aborted ? "NETWORK_ERROR" : "NETWORK_ERROR",
        aborted
          ? "Starting cloud workspace took longer than expected. Try again in a moment."
          : "OfferOS could not reach your workspace. Check your connection and try again.",
        { cause: error },
      );
    } finally {
      if (timeoutId) globalThis.clearTimeout(timeoutId);
    }

    const payload = await parseResponse(response);
    logTiming(`api.${method}.${new URL(url).pathname}.${response.status}`, startedAt);
    if (!response.ok) throw apiResponseError(response.status, payload, { method, url });
    return payload as T;
  }
}

export const apiClient = new ApiClient();

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    if (response.ok) throw new DataError("API_ERROR", "The API returned an unreadable response.");
    return { message: text };
  }
}

function apiResponseError(status: number, payload: unknown, request: { method: string; url: string }) {
  const serverMessage = extractMessage(payload);
  if (status === 401) return new DataError("UNAUTHORIZED", "Your session expired. Sign in again to continue.");
  if (status === 403) return new DataError("FORBIDDEN", serverMessage || "Your account does not have access to this workspace data.");
  if (status === 404) {
    const notFoundMessage = "OfferOS could not find the workspace summary endpoint. Retry after the latest backend deployment is live.";
    const diagnostic = DEV_API_DIAGNOSTICS ? ` (${request.method} ${request.url})` : "";
    return new DataError("NOT_FOUND", `${serverMessage === "Not Found" ? notFoundMessage : serverMessage || notFoundMessage}${diagnostic}`);
  }
  if (status === 422) return new DataError("VALIDATION_ERROR", serverMessage || "Some submitted fields are invalid.");
  return new DataError("API_ERROR", serverMessage || "The OfferOS API could not complete this request.");
}

function extractMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const value = payload as Record<string, unknown>;
  if (typeof value.message === "string") return value.message;
  if (value.error && typeof value.error === "object") {
    const message = (value.error as Record<string, unknown>).message;
    if (typeof message === "string") return message;
  }
  if (typeof value.detail === "string") return value.detail;
  if (value.detail && typeof value.detail === "object") {
    const message = (value.detail as Record<string, unknown>).message;
    if (typeof message === "string") return message;
  }
  return null;
}

function now() {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

function logTiming(label: string, startedAt: number) {
  if (!DEV_API_DIAGNOSTICS) return;
  debugApi(label, { durationMs: Math.round(now() - startedAt) });
}

function noteRequest(method: string, url: string) {
  if (!DEV_API_DIAGNOSTICS) return;
  const pathname = new URL(url).pathname;
  const key = `${method} ${pathname}`;
  const current = requestCounts.get(key);
  const timestamp = Date.now();
  if (!current || timestamp - current.firstSeenAt > 10_000) {
    requestCounts.set(key, { count: 1, firstSeenAt: timestamp });
    return;
  }
  current.count += 1;
  if (current.count > 1) debugApi("duplicate request", { key, count: current.count });
}

function debugApi(message: string, details: Record<string, unknown>) {
  if (!DEV_API_DIAGNOSTICS) return;
  console.debug("[OfferOS API]", message, details);
}
