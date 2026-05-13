import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

export interface RevealProps extends React.HTMLAttributes<HTMLDivElement> {
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
}

export function Reveal({ 
  children, 
  className, 
  delay = 0, 
  direction = "up",
  ...props 
}: RevealProps) {
  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        y: direction === "up" ? 20 : direction === "down" ? -20 : 0,
        x: direction === "left" ? 20 : direction === "right" ? -20 : 0
      }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ 
        duration: 0.8, 
        delay: delay,
        ease: [0.21, 0.47, 0.32, 0.98]
      }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
