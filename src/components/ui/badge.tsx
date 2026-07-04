import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full font-display font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-paper-deep text-ink-mute",
        ink: "bg-ink text-paper",
        outline: "border border-line-strong text-ink-mute",
        clay: "bg-clay-soft text-clay-deep",
        sage: "bg-sage-soft text-sage",
        amber: "bg-amber-soft text-amber-warm",
        rust: "bg-rust-soft text-rust",
      },
      size: {
        sm: "px-2.5 py-0.5 text-[11px]",
        md: "px-3 py-1 text-xs",
      },
    },
    defaultVariants: { variant: "default", size: "sm" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}
