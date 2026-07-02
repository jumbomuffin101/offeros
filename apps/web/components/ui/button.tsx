import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "border-indigo-400/35 bg-indigo-500/80 text-indigo-50 shadow-sm hover:bg-indigo-400/85 active:bg-indigo-500/90",
  secondary:
    "border-slate-600/50 bg-slate-800/60 text-slate-100 shadow-sm hover:border-slate-500/60 hover:bg-slate-700/65 active:bg-slate-800",
  ghost:
    "border-transparent bg-transparent text-slate-300 hover:bg-white/[0.07] hover:text-white active:bg-white/10",
};

export function Button({
  className,
  variant = "secondary",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
