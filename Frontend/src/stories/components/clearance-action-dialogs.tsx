import * as React from "react";
import { AlertCircle } from "lucide-react";

import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "./dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTrigger,
} from "./alert-dialog";
import { Textarea } from "./textarea";


export type ApproveConfirmDialogProps = {
  count: number;
  trigger: React.ReactNode;
  onApprove?: () => void;
};

export function ApproveConfirmDialog({
  count,
  trigger,
  onApprove,
}: ApproveConfirmDialogProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="left-6 right-6 w-auto max-w-[320px] translate-x-0 rounded-xl p-6 sm:left-[50%] sm:right-auto sm:w-full sm:max-w-sm sm:translate-x-[-50%]">
        <div className="flex flex-col items-center text-center">
          <div className="grid place-content-center p-2.0">
            <img src="/PrimaryAlertIcon.png" alt="delete-alert-icon" 
            className="h-16 w-16 object-contain"/>
          </div>

          <div className="mt-4 text-base font-bold text-foreground">
            You are about to <span className="text-primary">APPROVE</span> {count} clearance(s).
            <div className="mt-1">Do you wish to continue?</div>
          </div>

          <div className="mt-6 grid w-full gap-3">
            <Button
              type="button"
              className="h-11 w-full rounded-md"
              onClick={() => {
                onApprove?.();
                setOpen(false);
              }}
            >
              Approve
            </Button>
            <Button
              type="button"
              variant="cancel"
              className="h-11 w-full"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type RejectAlertDialogProps = {
  count: number;
  trigger: React.ReactNode;
  onReject?: (reason: string) => void;
};

export function RejectAlertDialog({ count, trigger, onReject }: RejectAlertDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="left-6 right-6 w-auto max-w-[320px] translate-x-0 rounded-xl p-6 sm:left-[50%] sm:right-auto sm:w-full sm:max-w-sm sm:translate-x-[-50%]">
        <div className="flex flex-col items-center text-center">
          <div className="grid place-content-center p-2.5">
            <img src="/RedAlertIcon.png" alt="delete-alert-icon" 
            className="h-16 w-16 object-contain"/>
          </div>

          <div className="mt-2 text-lg font-bold text-foreground">
            You are about to <span className="text-destructive">REJECT</span> {count} clearance(s).
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Please provide a reason for rejection
          </div>

          <div className="mt-4 w-full">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for rejection"
              className="min-h-[96px]"
            />
          </div>

          <div className="mt-6 grid w-full gap-3">
            <Button
              type="button"
              variant="destructive"
              className="h-11 w-full rounded-md"
              onClick={() => {
                onReject?.(reason);
                setReason("");
                setOpen(false);
              }}
            >
              Reject
            </Button>

            <Button
              type="button"
              variant="cancel"
              className="h-11 w-full"
              onClick={() => {
                setReason("");
                setOpen(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
