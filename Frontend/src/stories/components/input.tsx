import * as React from "react";
import { cn } from "@/components/lib/utils";

type InputSize = "sm" | "md" | "lg" | "mobileLarge";

export interface InputProps
  extends Omit<React.ComponentProps<"input">, "size"> {
  size?: InputSize;
}

const sizeClasses: Record<InputSize, { mobile: string; desktop: string }> = {
  sm: {
    mobile: "h-9 px-3 text-sm",
    desktop: "h-9 px-4 text-sm",
  },
  md: {
    mobile: "h-10 px-4 text-sm",
    desktop: "h-10 px-5 text-base",
  },
  lg: {
    mobile: "h-11 px-5 text-base",
    desktop: "h-12 px-6 text-lg",
  },
  mobileLarge: {
    // Matches button height + width
    mobile: "h-11 px-4 text-sm w-full max-w-[280px]",
    desktop: "h-11 px-4 text-sm w-full max-w-[280px]",
  },
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", size = "md", ...props }, ref) => {
    const sizeClass = sizeClasses[size];

    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "w-full rounded-md border border-[hsl(var(--gray-border))] bg-white-background",
          "text-[hsl(var(--text-black))] placeholder:text-muted-foreground",
          "shadow-sm transition-colors",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          `${sizeClass.mobile} md:${sizeClass.desktop}`,
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
export { Input };
