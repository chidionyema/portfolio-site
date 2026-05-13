import * as React from "react";
import { cn } from "../../lib/utils";

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: "row" | "column";
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;
  align?: "start" | "center" | "end" | "baseline" | "stretch";
  justify?: "start" | "center" | "end" | "between";
}

export function Stack({ 
  className, 
  direction = "column", 
  gap = 4, 
  align, 
  justify, 
  ...props 
}: StackProps) {
  return (
    <div
      className={cn(
        "flex",
        direction === "row" ? "flex-row" : "flex-col",
        gap === 1 && "gap-1",
        gap === 2 && "gap-2",
        gap === 3 && "gap-3",
        gap === 4 && "gap-4",
        gap === 5 && "gap-5",
        gap === 6 && "gap-6",
        gap === 8 && "gap-8",
        gap === 10 && "gap-10",
        gap === 12 && "gap-12",
        align === "start" && "items-start",
        align === "center" && "items-center",
        align === "end" && "items-end",
        align === "baseline" && "items-baseline",
        align === "stretch" && "items-stretch",
        justify === "start" && "justify-start",
        justify === "center" && "justify-center",
        justify === "end" && "justify-end",
        justify === "between" && "justify-between",
        className
      )}
      {...props}
    />
  );
}
