import * as React from "react";
import { cn } from "@/components/lib/utils";

export interface DividerProps extends React.HTMLAttributes<HTMLHRElement> {
  orientation?: "horizontal" | "vertical";
  color?: string;
  className?: string;
}

const Divider = React.forwardRef<HTMLHRElement, DividerProps>(
  ({ className, orientation = "horizontal", color, ...props }, ref) => {
    const baseClasses =
      orientation === "horizontal"
        ? "border-t w-full"
        : "border-l h-full";

    const colorClass = color ?? "border-[hsl(var(--border))]";

    return (
      <hr
        ref={ref}
        className={cn(baseClasses, colorClass, className)}
        {...props}
      />
    );
  }
);

Divider.displayName = "Divider";

export { Divider };
