import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium shadow-sm transition disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-cyan-700 text-white hover:bg-cyan-800 hover:shadow-cyan-900/20",
        secondary: "border border-slate-300 bg-white/90 text-slate-900 hover:bg-cyan-50 hover:text-cyan-900",
        ghost: "text-slate-700 shadow-none hover:bg-cyan-50 hover:text-cyan-900",
        danger: "bg-red-600 text-white hover:bg-red-700 hover:shadow-red-900/20",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        icon: "h-9 w-9 px-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
