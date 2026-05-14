import * as React from "react";
import { cn } from "../../lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const cardVariants = cva(
  "rounded-2xl transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-white/40 backdrop-blur-sm border border-border shadow-sm",
        panel: "bg-surface-warm border border-border-strong",
        "panel-dark": "panel-dark shadow-xl",
        glass: "bg-white/70 backdrop-blur-md border border-white/20 shadow-lg",
      },
      padding: {
        none: "p-0",
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
      }
    },
    defaultVariants: {
      variant: "default",
      padding: "md",
    }
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export function Card({ className, variant, padding, ...props }: CardProps) {
  return (
    <div
      className={cn(cardVariants({ variant, padding, className }))}
      {...props}
    />
  );
}
