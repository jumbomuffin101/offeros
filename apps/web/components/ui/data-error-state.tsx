import { AlertTriangle, RefreshCw } from "lucide-react";
import type { DataError } from "@/lib/data/errors";
import { Button } from "@/components/ui/button";

export function DataErrorState({ error, onRetry }: { error: DataError; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-rose-300/20 bg-rose-300/[0.055] px-6 py-12 text-center" role="alert">
      <AlertTriangle className="mx-auto size-6 text-rose-200" />
      <h2 className="mt-4 text-lg font-semibold text-white">Workspace data unavailable</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">{error.message}</p>
      <Button className="mt-5" onClick={onRetry} variant="secondary">
        <RefreshCw className="size-4" /> Retry
      </Button>
    </div>
  );
}
