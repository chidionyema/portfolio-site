import * as React from "react";
import { cn } from "../../lib/utils";

export interface GlassProps extends React.HTMLAttributes<HTMLDivElement> {
  intensity?: "low" | "medium" | "high";
}

export function Glass({ className, intensity = "medium", ...props }: GlassProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/20 shadow-lg",
        intensity === "low" && "bg-white/30 backdrop-blur-sm",
        intensity === "medium" && "bg-white/50 backdrop-blur-md",
        intensity === "high" && "bg-white/70 backdrop-blur-xl",
        className
      )}
      {...props}
    />
  );
}
