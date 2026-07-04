import { DataError } from "@/lib/data/errors";

type RequestOptions = { headers?: Record<string, string>; signal?: AbortSignal };

class ApiClient {
  get<T>(_path: string, _options?: RequestOptions): Promise<T> { return this.notImplemented(); }
  post<T, TBody = unknown>(_path: string, _body: TBody, _options?: RequestOptions): Promise<T> { return this.notImplemented(); }
  patch<T, TBody = unknown>(_path: string, _body: TBody, _options?: RequestOptions): Promise<T> { return this.notImplemented(); }
  delete<T = void>(_path: string, _options?: RequestOptions): Promise<T> { return this.notImplemented(); }

  private notImplemented<T>(): Promise<T> {
    return Promise.reject(new DataError("NOT_IMPLEMENTED", "REST API access is not enabled yet."));
  }
}

export const apiClient = new ApiClient();
