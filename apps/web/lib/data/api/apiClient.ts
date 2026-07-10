import { DataError } from "@/lib/data/errors";

export type RequestOptions = {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
  skipAuth?: boolean;
  skipWakeup?: boolean;
};
export type AuthTokenProvider = () => Promise<string | null>;
const WARM_REQUEST_TIMEOUT_MS = 20_000;
const WAKEUP_TIMEOUT_MS = 60_000;
const FIRST_WORKSPACE_TIMEOUT_MS = 45_000;
const GET_CACHE_MS = 45_000;
const RETRY_DELAY_MS = 650;
const DEV_API_DIAGNOSTICS = process.env.NODE_ENV === "development";

let authTokenProvider: AuthTokenProvider | null = null;
let providerWaiters: Array<(provider: AuthTokenProvider) => void> = [];
const getCache = new Map<string, { expiresAt: number; value: Promise<unknown> }>();
const requestCounts = new Map<string, { count: number; firstSeenAt: number }>();
let wakeupPromise: Promise<void> | null = null;
let wakeupComplete = false;
let firstWorkspaceRequestComplete = false;

export function setAuthTokenProvider(provider: AuthTokenProvider | null) {
  authTokenProvider = provider;
  getCache.clear();
  resetWakeup();
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
    const requestOptions = init as RequestInit & RequestOptions;
    const url = isAbsoluteUrl(path) ? path : `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    if (method === "GET" && !init.signal) {
      const cached = getCache.get(url);
      if (cached && cached.expiresAt > Date.now()) {
        debugApi("cache hit", { method, path });
        return cached.value as Promise<T>;
      }
      const value = this.requestWithWakeupAndAuth<T>(baseUrl, url, requestOptions);
      getCache.set(url, { value, expiresAt: Date.now() + GET_CACHE_MS });
      value.catch(() => getCache.delete(url));
      return value;
    }

    const result = await this.requestWithWakeupAndAuth<T>(baseUrl, url, requestOptions);
    if (method !== "GET") getCache.clear();
    return result;
  }

  private async requestWithWakeupAndAuth<T>(
    baseUrl: string,
    url: string,
    init: RequestInit & RequestOptions,
  ): Promise<T> {
    if (!init.skipAuth && !init.skipWakeup) await ensureBackendAwake(baseUrl);
    const headers = new Headers(init.headers);
    if (!init.skipAuth) {
      for (const [key, value] of Object.entries(await getAuthHeaders())) headers.set(key, value);
    }
    if (init.body) headers.set("Content-Type", "application/json");
    const timeoutMs = init.timeoutMs ?? (!init.skipAuth && !firstWorkspaceRequestComplete ? FIRST_WORKSPACE_TIMEOUT_MS : WARM_REQUEST_TIMEOUT_MS);
    try {
      const result = await this.fetchJsonWithRetry<T>(url, init, headers, timeoutMs);
      if (!init.skipAuth) firstWorkspaceRequestComplete = true;
      return result;
    } catch (error) {
      if (!init.skipAuth && error instanceof DataError && error.code === "NETWORK_ERROR") resetWakeup();
      throw error;
    }
  }

  private async fetchJsonWithRetry<T>(
    url: string,
    init: RequestInit,
    headers: Headers,
    timeoutMs: number,
  ): Promise<T> {
    const method = init.method ?? "GET";
    try {
      return await this.fetchJson<T>(url, init, headers, timeoutMs, 0);
    } catch (error) {
      if (method !== "GET" || init.signal || !isRetryableNetworkError(error)) throw error;
      debugApi("retrying request", { method, path: new URL(url).pathname });
      await delay(RETRY_DELAY_MS);
      return this.fetchJson<T>(url, init, headers, timeoutMs, 1);
    }
  }

  private async fetchJson<T>(
    url: string,
    init: RequestInit,
    headers: Headers,
    timeoutMs: number,
    attempt: number,
  ): Promise<T> {
    let response: Response;
    const method = init.method ?? "GET";
    const startedAt = now();
    noteRequest(method, url);
    const timeoutController = init.signal ? null : new AbortController();
    const timeoutId = timeoutController
      ? globalThis.setTimeout(() => timeoutController.abort(), timeoutMs)
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
        "NETWORK_ERROR",
        aborted
          ? "Your cloud workspace took longer than expected."
          : "OfferOS could not reach your workspace. Check your connection and try again.",
        { cause: error },
      );
    } finally {
      if (timeoutId) globalThis.clearTimeout(timeoutId);
    }

    const payload = await parseResponse(response);
    logTiming(`api.${method}.${new URL(url).pathname}.${response.status}`, startedAt, { attempt });
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
  if (status === 401) return new DataError("UNAUTHORIZED", "Your session needs to be refreshed.");
  if (status === 403) return new DataError("FORBIDDEN", "Your session needs to be refreshed.");
  if (status === 404) {
    const notFoundMessage = "The workspace endpoint is unavailable.";
    const diagnostic = DEV_API_DIAGNOSTICS ? ` (${request.method} ${request.url})` : "";
    return new DataError("NOT_FOUND", `${serverMessage === "Not Found" ? notFoundMessage : serverMessage || notFoundMessage}${diagnostic}`);
  }
  if (status === 422) return new DataError("VALIDATION_ERROR", serverMessage || "Some submitted fields are invalid.");
  if (status >= 500) return new DataError("API_ERROR", serverMessage || "The workspace encountered a server error.");
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

function logTiming(label: string, startedAt: number, details: Record<string, unknown> = {}) {
  if (!DEV_API_DIAGNOSTICS) return;
  debugApi(label, { durationMs: Math.round(now() - startedAt), ...details });
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

async function ensureBackendAwake(baseUrl: string): Promise<void> {
  if (wakeupComplete) return;
  if (wakeupPromise) return wakeupPromise;
  const startedAt = now();
  const healthUrl = `${baseUrl}/health`;
  wakeupPromise = apiClient
    .get(healthUrl, {
      skipAuth: true,
      skipWakeup: true,
      timeoutMs: WAKEUP_TIMEOUT_MS,
    })
    .then(() => {
      wakeupComplete = true;
      logTiming("api.healthWakeup", startedAt);
    })
    .catch((error) => {
      resetWakeup();
      throw error;
    });
  return wakeupPromise;
}

function resetWakeup() {
  wakeupPromise = null;
  wakeupComplete = false;
  firstWorkspaceRequestComplete = false;
}

function isRetryableNetworkError(error: unknown) {
  return error instanceof DataError && error.code === "NETWORK_ERROR";
}

function delay(ms: number) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}
