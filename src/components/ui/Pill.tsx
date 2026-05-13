import * as React from "react";
import { cn } from "../../lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const pillVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        status: "bg-surface-warm text-secondary border border-border",
        tag: "bg-accent text-accent-foreground",
        caption: "bg-muted/10 text-muted uppercase tracking-wider",
        success: "bg-success/10 text-success border border-success/20",
        warning: "bg-warning/10 text-warning border border-warning/20",
      }
    },
    defaultVariants: {
      variant: "default",
    }
  }
);

export interface PillProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof pillVariants> {}

export function Pill({ className, variant, ...props }: PillProps) {
  return (
    <div className={cn(pillVariants({ variant, className }))} {...props} />
  );
}
