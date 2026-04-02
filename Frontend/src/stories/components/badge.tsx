import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/components/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-[hsl(var(--primary))] text-white",
        success:
          "border-[hsl(var(--success))] bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]",
        secondary:
          "border-[hsl(var(--border))] bg-secondary text-secondary-foreground",
        destructive:
          "border-red-400 bg-red-100 text-red-700",
        outline: 
         "text-foreground",
        warning:
          "border-yellow-400 bg-yellow-100 text-yellow-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
