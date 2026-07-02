import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-slate-600/45 bg-slate-900/55 px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-400/55 focus:ring-2 focus:ring-indigo-400/15",
        className,
      )}
      {...props}
    />
  );
}
