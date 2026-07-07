import { AlertTriangle, RefreshCw } from "lucide-react";
import type { DataError } from "@/lib/data/errors";
import { Button } from "@/components/ui/button";

export function DataErrorState({ error, onRetry }: { error: DataError; onRetry: () => void }) {
  const needsSignIn = error.code === "UNAUTHORIZED";
  return (
    <div className="rounded-xl border border-rose-300/20 bg-rose-300/[0.055] px-6 py-12 text-center" role="alert">
      <AlertTriangle className="mx-auto size-6 text-rose-200" />
      <h2 className="mt-4 text-lg font-semibold text-white">Workspace data unavailable</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">{error.message}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button onClick={onRetry} variant="secondary">
          <RefreshCw className="size-4" /> Retry
        </Button>
        {needsSignIn ? (
          <Button onClick={() => { window.location.href = "/sign-in"; }} variant="primary">
            Sign in again
          </Button>
        ) : null}
      </div>
    </div>
  );
}
