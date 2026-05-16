import * as React from "react";
import { cn } from "../../lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const containerVariants = cva(
  "mx-auto w-full px-4 sm:px-6",
  {
    variants: {
      size: {
        prose: "max-w-2xl",
        wide: "max-w-5xl",
        full: "max-w-screen-2xl",
      }
    },
    defaultVariants: {
      size: "wide",
    }
  }
);

export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {}

export function Container({ className, size, ...props }: ContainerProps) {
  return (
    <div
      className={cn(containerVariants({ size, className }))}
      {...props}
    />
  );
}
