import { DataError } from "@/lib/data/errors";

export type RequestOptions = { headers?: Record<string, string>; signal?: AbortSignal };
export type AuthTokenProvider = () => Promise<string | null>;
const REQUEST_TIMEOUT_MS = 20_000;
const GET_CACHE_MS = 1_500;

let authTokenProvider: AuthTokenProvider | null = null;
let providerWaiters: Array<(provider: AuthTokenProvider) => void> = [];
const getCache = new Map<string, { expiresAt: number; value: Promise<unknown> }>();

export function setAuthTokenProvider(provider: AuthTokenProvider | null) {
  authTokenProvider = provider;
  if (provider) {
    for (const resolve of providerWaiters) resolve(provider);
    providerWaiters = [];
  }
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const provider = authTokenProvider ?? await new Promise<AuthTokenProvider>((resolve) => {
    providerWaiters.push(resolve);
  });
  const token = await provider();
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

    const headers = new Headers(init.headers);
    for (const [key, value] of Object.entries(await getAuthHeaders())) headers.set(key, value);
    if (init.body) headers.set("Content-Type", "application/json");

    const method = init.method ?? "GET";
    const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    if (method === "GET" && !init.signal) {
      const cached = getCache.get(url);
      if (cached && cached.expiresAt > Date.now()) return cached.value as Promise<T>;
      const value = this.fetchJson<T>(url, init, headers);
      getCache.set(url, { value, expiresAt: Date.now() + GET_CACHE_MS });
      value.catch(() => getCache.delete(url));
      return value;
    }

    const result = await this.fetchJson<T>(url, init, headers);
    if (method !== "GET") getCache.clear();
    return result;
  }

  private async fetchJson<T>(url: string, init: RequestInit, headers: Headers): Promise<T> {
    let response: Response;
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
    if (!response.ok) throw apiResponseError(response.status, payload);
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

function apiResponseError(status: number, payload: unknown) {
  const serverMessage = extractMessage(payload);
  if (status === 401) return new DataError("UNAUTHORIZED", "Your session expired. Sign in again to continue.");
  if (status === 403) return new DataError("FORBIDDEN", serverMessage || "Your account does not have access to this workspace data.");
  if (status === 404) return new DataError("NOT_FOUND", serverMessage || "The requested record was not found.");
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
