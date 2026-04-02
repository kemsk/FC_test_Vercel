import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
 
import { cn } from "../../components/lib/utils"
 
import { Button } from "./button"
 
const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "text-destructive [&>svg]:text-destructive",
        deactivate:
          "text-red-600 [&>svg]:text-red-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)
 
const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & 
  VariantProps<typeof alertVariants> & 
  { 
    title?: string; 
    description?: string; 
    onCancel?: () => void;
    onConfirm?: () => void;
    showButtons?: boolean;
  }
>(({ className, variant, title, description, onCancel, onConfirm, showButtons = true, children, ...props }, ref) => {
  // Editable title and description - change these values here!
  const alertTitle = title || "Confirm Status Change";
  const alertDescription = description || "Are you sure you want to deactivate this timeline?";
 
  return (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <AlertTitle>{alertTitle}</AlertTitle>
      <AlertDescription>{alertDescription}</AlertDescription>
      {showButtons && title && description && (
        <div className="flex gap-3 justify-end mt-4">
          <button
            onClick={onCancel || (() => console.log("Cancel clicked"))}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm || (() => console.log("Confirm clicked"))}
            className={`px-4 py-2 rounded ${
              variant === "destructive"
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            Confirm
          </button>
        </div>
      )}
      {!title && !description && children}
    </div>
  )
})
Alert.displayName = "Alert"
 
const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"
 
const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"
 
export { Alert, AlertTitle, AlertDescription }
 
export const DeactivateAlert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    onDelete?: () => void;
    onCancel?: () => void;
  }
>(({ className, onDelete, onCancel, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant: "deactivate" }), className)}
    {...props}
  >
    <div className=" items-center gap-4 mb-3">
      <div className="p-4 flex items-center justify-center">
      <img src="/RedAlertIcon.png" width="50" height="50" />
      </div>
      <div className="mb-4 text-xl text-center text-black font-bold">
        You are about to <span className="text-destructive"> DEACTIVATE</span>  "General Safety Guidelines"
      </div>
    </div>
    <div className="mb-4 text-lg text-center text-black font-bold">
      Do you wish to continue?
    </div>
 
    <div className="flex flex-col gap-3 justify-end">
      <Button variant="destructive" onClick={onDelete || (() => console.log("Deactivate confirmed"))} className="w-full font-bold">
        DEACTIVATE
      </Button>
      <Button variant="cancel" onClick={onCancel || (() => console.log("Cancel Deactivate"))} className="w-full">
        CANCEL
      </Button>
    </div>
  </div>
))
 
export const ActivateAlert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    onDelete?: () => void;
    onCancel?: () => void;
  }
>(({ className, onDelete, onCancel, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant: "deactivate" }), className)}
    {...props}
  >
    <div className=" items-center gap-4 mb-3">
      <div className="p-4 flex items-center justify-center">
      <img src="/PrimaryAlertIcon.png" width="50" height="50" />
      </div>
      <div className="mb-4 text-xl text-center text-black font-bold">
        You are about to <span className="text-primary"> ACTIVATE</span>  "General Safety Guidelines"
      </div>
    </div>
    <div className="mb-4 text-lg text-center text-black font-bold">
      Do you wish to continue?
    </div>
 
    <div className="flex flex-col gap-3 justify-end">
      <Button variant="default" onClick={onDelete || (() => console.log("Activate confirmed"))} className="w-full font-bold">
        ACTIVATE
      </Button>
      <Button variant="cancel" onClick={onCancel || (() => console.log("Cancel Activate"))} className="w-full">
        CANCEL
      </Button>
    </div>
  </div>
))
 
export const ArchiveAlert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    onDelete?: () => void;
    onCancel?: () => void;
  }
>(({ className, onDelete, onCancel, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant: "deactivate" }), className)}
    {...props}
  >
    <div className=" items-center gap-4 mb-3">
      <div className="p-4 flex items-center justify-center">
      <img src="/PrimaryAlertIcon.png" width="50" height="50" />
      </div>
      <div className="mb-4 text-xl text-center text-black font-bold">
        You are about to <span className="text-primary"> ARCHIVE</span>  "General Safety Guidelines"
      </div>
    </div>
    <div className="mb-4 text-lg text-center text-black font-bold">
      Do you wish to continue?
    </div>
 
    <div className="flex flex-col gap-3 justify-end">
      <Button variant="default" onClick={() => console.log("Activate confirmed")} className="w-full font-bold">
        ARCHIVE
      </Button>
      <Button variant="cancel" onClick={() => console.log("Cancel Activate")} className="w-full">
        CANCEL
      </Button>
    </div>
  </div>
))
 
export const DeleteAlert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    itemName?: string;
    onDelete?: () => void;
    onCancel?: () => void;
  }
>(({ className, itemName = "General Safety Guidelines", onDelete, onCancel, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant: "deactivate" }), className)}
    {...props}
  >
    <div className=" items-center gap-4 mb-3">
      <div className="p-4 flex items-center justify-center">
      <img src="/RedAlertIcon.png" width="50" height="50" />
      </div>
      <div className="mb-4 text-xl text-center text-black font-bold">
        You are about to <span className="text-destructive"> DELETE</span>  "{itemName}"
      </div>
    </div>
    <div className="mb-4 text-lg text-center text-black font-bold">
      Do you wish to continue?
    </div>
 
    <div className="flex flex-col gap-3 justify-end">
      <Button variant="destructive" onClick={onDelete} className="w-full font-bold">
        DELETE
      </Button>
      <Button variant="cancel" onClick={onCancel} className="w-full">
        CANCEL
      </Button>
    </div>
  </div>
))