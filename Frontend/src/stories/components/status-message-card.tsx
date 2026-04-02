import { Check, X } from "lucide-react";

import { cn } from "../../components/lib/utils";
import { Button } from "./button";
import { Card, CardContent, CardFooter } from "./card";

type StatusMessageVariant = "success" | "error";

export type StatusMessageCardProps = {
  variant: StatusMessageVariant;
  message: string;
  title?: string;
  continueLabel?: string;
  continueDisabled?: boolean;
  onContinue?: () => void;
  className?: string;
};

export function StatusMessageCard({
  variant,
  message,
  title,
  continueLabel = "Continue",
  continueDisabled = false,
  onContinue,
  className,
}: StatusMessageCardProps) {
  const isSuccess = variant === "success";

  const Icon = isSuccess ? Check : X;
  const resolvedTitle = title ?? (isSuccess ? "Success" : "Error");

  return (
    <Card
      className={cn(
        "w-full max-w-[340px] overflow-hidden rounded-lg bg-white text-black shadow-md",
        className
      )}
    >
      <CardContent className="flex flex-col items-center px-6 pt-8 pb-6">
        <div
          className={cn(
            "flex h-20 w-20 items-center justify-center rounded-full",
            isSuccess ? "bg-green-600" : "bg-red-500"
          )}
        >
          <Icon className="h-10 w-10 text-white" />
        </div>

        <div className="mt-5 text-center">
          <div className="text-xl font-semibold">{resolvedTitle}</div>
          <div className="mt-2 text-sm text-muted-foreground">{message}</div>
        </div>
      </CardContent>

      <CardFooter className="px-6 pb-6 pt-0">
        <Button
          type="button"
          className="w-full"
          variant="default"
          disabled={continueDisabled}
          onClick={onContinue}
        >
          {continueLabel}
        </Button>
      </CardFooter>
    </Card>
  );
}

export type SuccessMessageCardProps = Omit<StatusMessageCardProps, "variant">;

export function SuccessMessageCard(props: SuccessMessageCardProps) {
  return <StatusMessageCard {...props} variant="success" />;
}

export type ErrorMessageCardProps = Omit<StatusMessageCardProps, "variant">;

export function ErrorMessageCard(props: ErrorMessageCardProps) {
  return <StatusMessageCard {...props} variant="error" />;
}

export function SuccessNoButtonCard({
  variant,
  message,
  title,
  className,
}: StatusMessageCardProps) {
  const isSuccess = variant === "success";

  const Icon = isSuccess ? Check : X;
  const resolvedTitle = title ?? (isSuccess ? "Success" : "Error");

  return (
    <Card
      className={cn(
        "w-full max-w-[340px] overflow-hidden rounded-lg bg-white text-black shadow-md",
        className
      )}
    >
      <CardContent className="flex flex-col items-center px-6 pt-8 pb-6">
        <div
          className={cn(
            "flex h-20 w-20 items-center justify-center rounded-full",
            isSuccess ? "bg-green-600" : "bg-red-500"
          )}
        >
          <Icon className="h-10 w-10 text-white" />
        </div>

        <div className="mt-5 text-center">
          <div className="text-xl font-semibold">{resolvedTitle}</div>
          <div className="mt-2 text-sm text-muted-foreground">{message}</div>
        </div>
      </CardContent>
    </Card>
  );
}