import * as React from "react";
import { cn } from "../../lib/utils";

export interface CodeProps extends React.HTMLAttributes<HTMLElement> {
  language?: string;
  inline?: boolean;
}

export function Code({ className, language, inline = true, ...props }: CodeProps) {
  if (inline) {
    return (
      <code
        className={cn(
          "rounded bg-muted/10 px-[0.3rem] py-[0.2rem] font-mono text-sm font-medium",
          className
        )}
        {...props}
      />
    );
  }

  return (
    <pre className={cn("overflow-x-auto rounded-lg bg-primary p-4", className)}>
      <code
        className={cn("font-mono text-sm text-base-inverse", language && "language-" + language)}
        {...props}
      />
    </pre>
  );
}
