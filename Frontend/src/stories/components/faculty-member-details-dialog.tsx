import * as React from "react";

import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "./dialog";
import { Divider } from "./divider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { Textarea } from "./textarea";

export type FacultyMemberStatus = "approved" | "pending" | "rejected";

export type FacultyMemberDetails = {
  requestId?: string;
  employeeId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  college: string;
  department: string;
  facultyType: string;
  phoneNumber?: string;
  email?: string;
  status: FacultyMemberStatus;
};

export type FacultyMemberDetailsDialogProps = {
  trigger: React.ReactNode;
  details: FacultyMemberDetails;
  onSave?: (next: { status: FacultyMemberStatus; remarks: string }) => void;
};

export function FacultyMemberDetailsDialog({
  trigger,
  details,
  onSave,
}: FacultyMemberDetailsDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [status, setStatus] = React.useState<FacultyMemberStatus>(details.status);
  const [remarks, setRemarks] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setStatus(details.status);
    setRemarks("");
  }, [open, details.status]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="left-6 right-6 w-auto max-w-[380px] translate-x-0 rounded-xl p-0 sm:left-[50%] sm:right-auto sm:w-full sm:max-w-lg sm:translate-x-[-50%]">
        <div className="rounded-xl bg-background">
          <div className="px-6 pb-4 pt-8">
            <div className="text-center text-xl font-bold text-primary">
              Faculty Member Details
            </div>

            <div className="mt-5 grid grid-cols-[120px_1fr] gap-x-4 gap-y-2 text-sm">
              {details.requestId ? (
                <>
                  <div className="font-semibold text-foreground">Request ID</div>
                  <div className="text-muted-foreground">{details.requestId}</div>
                </>
              ) : null}

              <div className="font-semibold text-foreground">Employee ID</div>
              <div className="text-muted-foreground">{details.employeeId}</div>

              <div className="font-semibold text-foreground">First Name</div>
              <div className="text-muted-foreground">{details.firstName}</div>

              {details.middleName ? (
                <>
                  <div className="font-semibold text-foreground">Middle Name</div>
                  <div className="text-muted-foreground">{details.middleName}</div>
                </>
              ) : null}

              <div className="font-semibold text-foreground">Last Name</div>
              <div className="text-muted-foreground">{details.lastName}</div>

              <div className="font-semibold text-foreground">College</div>
              <div className="text-muted-foreground">{details.college}</div>

              <div className="font-semibold text-foreground">Department</div>
              <div className="text-muted-foreground">{details.department}</div>

              <div className="font-semibold text-foreground">Faculty Type</div>
              <div className="text-muted-foreground">{details.facultyType}</div>

              {details.phoneNumber ? (
                <>
                  <div className="font-semibold text-foreground">Phone Number</div>
                  <div className="text-muted-foreground">{details.phoneNumber}</div>
                </>
              ) : null}

              {details.email ? (
                <>
                  <div className="font-semibold text-foreground">XU Email</div>
                  <div className="text-muted-foreground">{details.email}</div>
                </>
              ) : null}
            </div>
          </div>

          <Divider color="border-[hsl(var(--gray-border))]" />

          <div className="px-6 py-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-semibold text-foreground">Status</div>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as FacultyMemberStatus)}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold text-foreground">Remarks</div>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter optional remarks..."
                  className="min-h-[88px]"
                />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="cancel"
                className="h-11 w-full "
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-11 w-full rounded-md"
                onClick={() => {
                  onSave?.({ status, remarks });
                  setOpen(false);
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
