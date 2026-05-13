import * as React from "react";
import { cn } from "../../lib/utils";

export interface ProseProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "base" | "lg";
}

export function Prose({ className, size = "base", ...props }: ProseProps) {
  return (
    <div
      className={cn(
        "prose prose-primary max-w-none",
        size === "sm" && "prose-sm",
        size === "lg" && "prose-lg",
        "prose-headings:font-display prose-headings:tracking-tight",
        "prose-p:leading-relaxed prose-p:text-secondary",
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        className
      )}
      {...props}
    />
  );
}
