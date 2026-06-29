import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "border-cyan-300/30 bg-cyan-400/15 text-cyan-50 shadow-[0_0_32px_rgba(34,211,238,0.16)] hover:bg-cyan-400/22",
  secondary:
    "border-slate-600/60 bg-slate-900/72 text-slate-100 hover:border-slate-400/50 hover:bg-slate-800/80",
  ghost: "border-transparent bg-transparent text-slate-300 hover:bg-white/5 hover:text-white",
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
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-300/50 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
