import * as React from "react";
import { cn } from "../../lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const linkVariants = cva(
  "inline-flex items-center gap-1 transition-colors",
  {
    variants: {
      variant: {
        default: "text-primary hover:text-secondary underline underline-offset-4 decoration-border-strong hover:decoration-secondary",
        cta: "text-primary font-medium hover:text-secondary",
        subtle: "text-muted hover:text-primary",
      }
    },
    defaultVariants: {
      variant: "default",
    }
  }
);

export interface LinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof linkVariants> {
  external?: boolean;
}

export function Link({ className, variant, external, ...props }: LinkProps) {
  const externalProps = external ? { target: "_blank", rel: "noopener noreferrer" } : {};
  return (
    <a
      className={cn(linkVariants({ variant, className }))}
      {...externalProps}
      {...props}
    />
  );
}
