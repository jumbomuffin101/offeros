import type { PrepStatus } from "@/lib/types";
import { prepStatuses } from "@/lib/prep-utils";

export function PrepStatusSelect({ value, onChange, label = "Status" }: {
  value: PrepStatus;
  onChange: (status: PrepStatus) => void;
  label?: string;
}) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        className="h-10 rounded-xl border border-slate-700/70 bg-slate-950/80 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/15"
        onChange={(event) => onChange(event.target.value as PrepStatus)}
        value={value}
      >
        {prepStatuses.map((status) => <option key={status}>{status}</option>)}
      </select>
    </label>
  );
}
