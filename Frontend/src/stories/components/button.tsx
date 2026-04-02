import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, } from "class-variance-authority"

import { cn } from "../../components/lib/utils"

/* Sizes */

type ButtonSize = "sm" | "default" | "lg" | "icon" | "mobileLarge" | "mobileXL" | "back"
type IconButtonSize = "sm" | "default" | "lg"

const buttonSizeClasses: Record<ButtonSize, { mobile: string; desktop: string }> = {
  sm: { mobile: "h-8 px-3 text-xs", desktop: "h-9 px-4 text-sm" },
  default: { mobile: "h-9 px-4 text-sm", desktop: "h-10 px-5 text-base" },
  lg: { mobile: "h-10 px-8 text-base", desktop: "h-12 px-10 text-lg" },
  icon: { mobile: "h-9 w-9", desktop: "h-9 w-9" },
  mobileLarge: {
    mobile:
      "w-full max-w-[280px] h-11 rounded-md text-sm font-semibold flex items-center justify-center",
    desktop:
      "w-full max-w-[320px] h-12 rounded-md text-base font-semibold flex items-center justify-center",
  },
  mobileXL: {
    mobile: "",
    desktop: "",
  },
  back: { mobile: "h-9 px-4 text-sm w-fit", desktop: "h-10 px-4 text-base w-fit" },
}

const iconButtonSizeClasses: Record<IconButtonSize, { mobile: string; desktop: string }> = {
  sm: { mobile: "h-8 w-8", desktop: "h-9 w-9" },
  default: { mobile: "h-9 w-9", desktop: "h-10 w-10" },
  lg: { mobile: "h-10 w-10", desktop: "h-12 w-12" },
}

/* Variants */

const buttonVariants = cva(
  "gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        back:
          "border border-btn-outline-border bg-gray-300 text-black shadow-sm hover:bg-accent hover:text-accent-foreground",
        outline:
          "border border-btn-outline-border bg-transparent text-white shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        action:
          "border border-btn-outline-border bg-[hsl(var(--btn-ghost-bg))] text-[hsl(var(--btn-ghost-text))] shadow hover:bg-muted disabled:bg-[hsl(var(--btn-ghost-bg))] disabled:text-[hsl(var(--btn-ghost-text))] disabled:hover:bg-[hsl(var(--btn-ghost-bg))]",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        icon: "bg-transparent text-foreground",
        cancel: "bg-gray-200 text-black border border-gray-700 hover:bg-gray-500 hover:text-white",
        white:"bg-white text-primary hover:bg-secondary hover:text-white",
        primaryoutline:"border border-primary text-primary hover:bg-primary hover:text-white",
      },
      alignment: {
        center: "justify-center",
        left: "justify-start",
      },
      size: {
        sm: "",
        default: "",
        lg: "",
        icon: "",
        mobileLarge: "",
        mobileXL: "w-full max-w-[320px] min-h-12 pl-6 pr-6 py-3 flex items-start",
        back: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      alignment: "center",
    },
  }
)

/* Types */

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: "default" | "destructive" | "link" | "outline" | "secondary" | "ghost" | "icon" | "cancel" | "white" | "back" | "action" | "primaryoutline"
  size?: "sm" | "default" | "lg" | "icon" | "mobileLarge" | "mobileXL" | "back"
  alignment?: "center" | "left"
}

/* Component */

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size = "default", alignment, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    const isIconButton = variant === "icon"

    const sizeClass = isIconButton
      ? iconButtonSizeClasses[size as IconButtonSize]
      : buttonSizeClasses[size || "default"]

    return (
      <Comp
        ref={ref}
        className={cn(
          buttonVariants({ variant, size, alignment }),
          sizeClass && `${sizeClass.mobile} md:${sizeClass.desktop}`,
          isIconButton && "p-0 [&_svg]:size-5",
          className
        )}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"

export { Button, buttonVariants }
