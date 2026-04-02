import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { cva, type VariantProps } from "class-variance-authority"
import { Check } from "lucide-react"

import { cn } from "../../components/lib/utils"

const checkboxVariants = cva(
  "grid place-content-center peer h-4 w-4 shrink-0 rounded-sm border shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        success:
          "border-success data-[state=checked]:bg-success data-[state=checked]:text-white data-[state=checked]:border-success",

        black:
          "border-black data-[state=checked]:bg-black data-[state=checked]:text-white data-[state=checked]:border-black",

        primary:
          "border-primary data-[state=checked]:bg-primary data-[state=checked]:text-white data-[state=checked]:border-primary",
        
        outline:
          "border-outline data-[state=checked]:bg-outline data-[state=checked]:text-white data-[state=checked]:border-outline",

        gray:
          "border-muted-foreground border-2  data-[state=checked]:bg-muted-foreground data-[state=checked]:text-white data-[state=checked]:border-outline",
      },
    },
    defaultVariants: {
      variant: "success",
    },
  }
);


const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
  & VariantProps<typeof checkboxVariants>
>(({ className, variant, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      checkboxVariants({ variant }),
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("grid place-content-center text-current")}
    >
      <Check className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
