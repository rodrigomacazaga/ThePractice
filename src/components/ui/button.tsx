import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-display font-semibold tracking-tight transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 select-none whitespace-nowrap cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-ink text-paper hover:bg-ink-soft active:scale-[0.98] shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]",
        light:
          "bg-paper text-ink hover:bg-surface active:scale-[0.98]",
        clay: "bg-clay text-paper hover:bg-clay-deep active:scale-[0.98]",
        outline:
          "border border-line-strong bg-transparent text-ink hover:border-ink hover:bg-surface",
        "outline-light":
          "border border-paper/25 bg-transparent text-paper hover:border-paper/60 hover:bg-paper/5",
        ghost: "text-ink-mute hover:text-ink hover:bg-paper-deep",
        danger: "bg-rust text-paper hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3.5 text-xs rounded-lg",
        md: "h-10 px-5 text-sm rounded-xl",
        lg: "h-12 px-7 text-sm rounded-xl",
        xl: "h-14 px-9 text-base rounded-2xl",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export interface ButtonLinkProps
  extends React.ComponentProps<typeof Link>,
    VariantProps<typeof buttonVariants> {}

export function ButtonLink({ className, variant, size, ...props }: ButtonLinkProps) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
