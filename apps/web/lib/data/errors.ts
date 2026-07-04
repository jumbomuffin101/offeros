export type DataErrorCode =
  | "NOT_FOUND"
  | "STORAGE_UNAVAILABLE"
  | "VALIDATION_ERROR"
  | "NOT_IMPLEMENTED"
  | "UNKNOWN";

export class DataError extends Error {
  readonly code: DataErrorCode;
  readonly cause?: unknown;

  constructor(code: DataErrorCode, message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "DataError";
    this.code = code;
    this.cause = options?.cause;
  }
}

export function toDataError(error: unknown, fallbackMessage: string) {
  if (error instanceof DataError) return error;
  return new DataError("UNKNOWN", fallbackMessage, { cause: error });
}
