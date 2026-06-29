import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "border-cyan-300/35 bg-cyan-300/15 text-cyan-50 shadow-[0_0_36px_rgba(34,211,238,0.16)] hover:-translate-y-0.5 hover:bg-cyan-300/22 active:translate-y-0",
  secondary:
    "border-slate-600/65 bg-slate-900/75 text-slate-100 hover:-translate-y-0.5 hover:border-slate-400/50 hover:bg-slate-800/80 active:translate-y-0",
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
        "inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-300/50 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
