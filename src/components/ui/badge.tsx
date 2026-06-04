import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none",
        {
          "border-transparent bg-white text-black": variant === "default",
          "border-transparent bg-[#1a1a1a] text-foreground": variant === "secondary",
          "border-transparent bg-red-600 text-white": variant === "destructive",
          "border-[#2a2a2a] text-foreground": variant === "outline",
          "border-transparent bg-green-700 text-white": variant === "success",
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };
