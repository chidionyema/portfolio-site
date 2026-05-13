import * as React from "react";
import { cn } from "../../lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const sectionVariants = cva(
  "relative w-full overflow-hidden",
  {
    variants: {
      padding: {
        none: "py-0",
        dense: "py-12 lg:py-16",
        relaxed: "py-20 lg:py-24",
        spacious: "py-32 lg:py-40",
      },
      border: {
        none: "",
        top: "border-t border-border",
        bottom: "border-b border-border",
        both: "border-y border-border",
      }
    },
    defaultVariants: {
      padding: "relaxed",
      border: "none",
    }
  }
);

export interface SectionProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof sectionVariants> {}

export function Section({ className, padding, border, ...props }: SectionProps) {
  return (
    <section
      className={cn(sectionVariants({ padding, border, className }))}
      {...props}
    />
  );
}
