import * as React from "react";
import { cn } from "../../lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const headingVariants = cva(
  "font-display tracking-tight text-primary",
  {
    variants: {
      variant: {
        display: "text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-semibold leading-[1.05]",
        hero: "text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-semibold leading-[1.1]",
        section: "text-2xl sm:text-3xl md:text-4xl font-semibold leading-[1.1]",
        panel: "text-xl md:text-2xl font-medium leading-snug",
        caption: "text-sm font-medium uppercase tracking-[0.18em] text-accent",
      }
    },
    defaultVariants: {
      variant: "section",
    }
  }
);

export interface HeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

export function Heading({ className, variant, level = 2, ...props }: HeadingProps) {
  const Tag = "h" + level as any;
  return (
    <Tag
      className={cn(headingVariants({ variant, className }))}
      {...props}
    />
  );
}
