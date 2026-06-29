import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div className={cn("glass-card rounded-3xl", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div className={cn("border-b border-white/10 px-6 py-5", className)} {...props}>
      {children}
    </div>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div className={cn("p-6", className)} {...props}>
      {children}
    </div>
  );
}
