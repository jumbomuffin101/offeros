export type DataErrorCode =
  | "NOT_FOUND"
  | "STORAGE_UNAVAILABLE"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NETWORK_ERROR"
  | "API_ERROR"
  | "CONFIGURATION_ERROR"
  | "RATE_LIMITED"
  | "NOT_IMPLEMENTED"
  | "UNKNOWN";

export class DataError extends Error {
  readonly code: DataErrorCode;
  readonly cause?: unknown;
  readonly requestId?: string;
  readonly details?: Record<string, unknown>;

  constructor(code: DataErrorCode, message: string, options?: { cause?: unknown; requestId?: string; details?: Record<string, unknown> }) {
    super(message);
    this.name = "DataError";
    this.code = code;
    this.cause = options?.cause;
    this.requestId = options?.requestId;
    this.details = options?.details;
  }
}

export function toDataError(error: unknown, fallbackMessage: string) {
  if (error instanceof DataError) return error;
  return new DataError("UNKNOWN", fallbackMessage, { cause: error });
}
