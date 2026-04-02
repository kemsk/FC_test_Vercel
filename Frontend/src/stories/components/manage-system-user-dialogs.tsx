import * as React from "react";

import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "./dialog";
import { Input } from "./input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { Checkbox } from "./checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./alert-dialog";

export type ApproverType = "College" | "Office";
export type SystemAdminOffice = "OVPHE" | "CISO";

export type ManageSystemUserBasePayload = {
  firstName: string;
  middleName?: string;
  lastName: string;
  universityId: string;
  email: string;
  isActive: boolean;
};

export type ManageSystemApproverPayload = ManageSystemUserBasePayload & {
  approverType: ApproverType;
  college?: string;
  department?: string;
  office?: string;
};

export type ManageSystemAdminPayload = ManageSystemUserBasePayload & {
  systemAdminOffice: SystemAdminOffice;
};

type RadioOption<T extends string> = {
  value: T;
  label: string;
};

function RadioRow<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (next: T) => void;
  options: RadioOption<T>[];
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-foreground">{label}</div>
      <div className="flex items-center gap-6">
        {options.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="radio"
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function FooterButtons({
  cancelLabel = "Cancel",
  submitLabel,
  onCancel,
  onSubmit,
  submitVariant = "default",
}: {
  cancelLabel?: string;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: () => void;
  submitVariant?: "default" | "destructive" | "secondary" | "outline" | "ghost" | "link" | "icon" | "back";
}) {
  return (
    <div className="border-t border-[hsl(var(--gray-border))] px-6 py-4">
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="cancel"
          className="h-11 w-full "
          onClick={onCancel}
        >
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant={submitVariant}
          className="h-11 w-full rounded-md"
          onClick={onSubmit}
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

export type ManageSystemApproverDialogProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  title: string;
  submitLabel: string;
  initialValues?: Partial<ManageSystemApproverPayload>;
  onSubmit?: (payload: ManageSystemApproverPayload) => void;
  colleges?: string[];
  departments?: string[];
  offices?: string[];
  collegeDepartmentsMap?: Record<string, string[]>;
};

export function ManageSystemApproverDialog({
  open,
  onOpenChange,
  trigger,
  title,
  submitLabel,
  initialValues,
  onSubmit,
  colleges = [],
  departments = [],
  offices = [],
  collegeDepartmentsMap = {},
}: ManageSystemApproverDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = typeof open === "boolean";
  const effectiveOpen = isControlled ? open : internalOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const [firstName, setFirstName] = React.useState("");
  const [middleName, setMiddleName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [universityId, setUniversityId] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [approverType, setApproverType] = React.useState<ApproverType>("College");
  const [college, setCollege] = React.useState<string>("");
  const [department, setDepartment] = React.useState<string>("");
  const [office, setOffice] = React.useState<string>("");
  const [isActive, setIsActive] = React.useState(false);

  React.useEffect(() => {
    if (!effectiveOpen) return;
    setFirstName(initialValues?.firstName ?? "");
    setMiddleName(initialValues?.middleName ?? "");
    setLastName(initialValues?.lastName ?? "");
    setUniversityId(initialValues?.universityId ?? "");
    setEmail(initialValues?.email ?? "");
    setApproverType(initialValues?.approverType ?? "College");
    setCollege(initialValues?.college ?? "");
    setDepartment(initialValues?.department ?? "");
    setOffice(initialValues?.office ?? "");
    setIsActive(Boolean(initialValues?.isActive));
  }, [effectiveOpen, initialValues]);

  React.useEffect(() => {
    if (approverType === "College") {
      setOffice("");
    } else {
      setCollege("");
      setDepartment("");
    }
  }, [approverType]);

  React.useEffect(() => {
    // Reset department when college changes (only for College approver type)
    if (approverType === "College") {
      setDepartment("");
    }
  }, [college, approverType]);

  const filteredDepartments = React.useMemo(() => {
    // Only show departments for the selected college when approverType is "College"
    if (approverType !== "College" || !college) return [];
    return collegeDepartmentsMap[college] || [];
  }, [college, approverType, collegeDepartmentsMap]);

  return (
    <Dialog open={effectiveOpen} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}

      <DialogContent className="w-[420px] max-w-[calc(100vw-3rem)] rounded-xl p-0">
        <div className="rounded-xl bg-background">
          <div className="px-6 pb-4 pt-6">
            <div className="text-center text-base font-bold text-foreground">{title}</div>

            <div className="mt-5 space-y-3">
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-foreground">First Name</div>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} size="sm" />
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-foreground">Middle Name (Optional)</div>
                <Input value={middleName} onChange={(e) => setMiddleName(e.target.value)} size="sm" />
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-foreground">Last Name</div>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} size="sm" />
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-foreground">University ID</div>
                <Input
                  value={universityId}
                  onChange={(e) => setUniversityId(e.target.value.replace(/\D/g, ""))}
                  size="sm"
                  placeholder="Numbers only"
                />
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-foreground">Email (@XU.EDU.PH)</div>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} size="sm" placeholder="username@xu.edu.ph" disabled={Boolean(initialValues)} />
                <div className="text-[10px] text-muted-foreground">Only @xu.edu.ph email address is allowed</div>
              </div>

              <RadioRow
                label="Approver Type"
                value={approverType}
                onChange={setApproverType}
                options={[
                  { value: "College", label: "College" },
                  { value: "Office", label: "Office" },
                ]}
              />

              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-foreground">Select College</div>
                <Select value={college} onValueChange={setCollege} disabled={approverType !== "College"}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Choose from dropdown" />
                  </SelectTrigger>
                  <SelectContent>
                    {colleges.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-foreground">Select Department</div>
                <Select value={department} onValueChange={setDepartment} disabled={approverType !== "College"}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Choose from dropdown" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredDepartments.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-foreground">Select Office</div>
                <Select value={office} onValueChange={setOffice} disabled={approverType !== "Office"}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Choose from dropdown" />
                  </SelectTrigger>
                  <SelectContent>
                    {offices.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <label className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(Boolean(v))} />
                <span>Set as Active</span>
              </label>
            </div>
          </div>

          <FooterButtons
            submitLabel={submitLabel}
            onCancel={() => setOpen(false)}
            onSubmit={() => {
              onSubmit?.({
                firstName,
                middleName: middleName.trim() ? middleName : undefined,
                lastName,
                universityId,
                email,
                approverType,
                college: approverType === "College" ? college : undefined,
                department: approverType === "College" ? department : undefined,
                office: approverType === "Office" ? office : undefined,
                isActive,
              });
              setOpen(false);
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type ManageSystemAdminDialogProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  title: string;
  submitLabel: string;
  initialValues?: Partial<ManageSystemAdminPayload>;
  onSubmit?: (payload: ManageSystemAdminPayload) => void;
};

export function ManageSystemAdminDialog({
  open,
  onOpenChange,
  trigger,
  title,
  submitLabel,
  initialValues,
  onSubmit,
}: ManageSystemAdminDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = typeof open === "boolean";
  const effectiveOpen = isControlled ? open : internalOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const [firstName, setFirstName] = React.useState("");
  const [middleName, setMiddleName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [universityId, setUniversityId] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [systemAdminOffice, setSystemAdminOffice] = React.useState<SystemAdminOffice>("OVPHE");
  const [isActive, setIsActive] = React.useState(false);

  React.useEffect(() => {
    if (!effectiveOpen) return;
    setFirstName(initialValues?.firstName ?? "");
    setMiddleName(initialValues?.middleName ?? "");
    setLastName(initialValues?.lastName ?? "");
    setUniversityId(initialValues?.universityId ?? "");
    setEmail(initialValues?.email ?? "");
    setSystemAdminOffice(initialValues?.systemAdminOffice ?? "OVPHE");
    setIsActive(Boolean(initialValues?.isActive));
  }, [effectiveOpen, initialValues]);

  return (
    <Dialog open={effectiveOpen} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}

      <DialogContent className="w-[420px] max-w-[calc(100vw-3rem)] rounded-xl p-0">
        <div className="rounded-xl bg-background">
          <div className="px-6 pb-4 pt-6">
            <div className="text-center text-base font-bold text-foreground">{title}</div>

            <div className="mt-5 space-y-3">
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-foreground">First Name</div>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} size="sm" />
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-foreground">Middle Name (Optional)</div>
                <Input value={middleName} onChange={(e) => setMiddleName(e.target.value)} size="sm" />
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-foreground">Last Name</div>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} size="sm" />
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-foreground">University ID</div>
                <Input
                  value={universityId}
                  onChange={(e) => setUniversityId(e.target.value.replace(/\D/g, ""))}
                  size="sm"
                  placeholder="Numbers only"
                />
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-foreground">Email (@XU.EDU.PH)</div>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} size="sm" placeholder="username@xu.edu.ph" disabled={Boolean(initialValues)} />
                <div className="text-[10px] text-muted-foreground">Only @xu.edu.ph email address is allowed</div>
              </div>

              <RadioRow
                label="System Admin Office"
                value={systemAdminOffice}
                onChange={setSystemAdminOffice}
                options={[
                  { value: "OVPHE", label: "OVPHE" },
                  { value: "CISO", label: "CISO" },
                ]}
              />

              <label className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(Boolean(v))} />
                <span>Set as Active</span>
              </label>
            </div>
          </div>

          <FooterButtons
            submitLabel={submitLabel}
            onCancel={() => setOpen(false)}
            onSubmit={() => {
              onSubmit?.({
                firstName,
                middleName: middleName.trim() ? middleName : undefined,
                lastName,
                universityId,
                email,
                systemAdminOffice,
                isActive,
              });
              setOpen(false);
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type RemoveSystemUserDialogProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  userName: string;
  userEmail: string;
  adminEmail: string;
  onRemove?: () => void;
};

export function RemoveSystemUserDialog({
  open,
  onOpenChange,
  userName,
  userEmail,
  adminEmail,
  onRemove,
}: RemoveSystemUserDialogProps) {
  const [step, setStep] = React.useState<1 | 2>(1);
  const [confirmEmail, setConfirmEmail] = React.useState("");

  React.useEffect(() => {
    if (!open) {
      setStep(1);
      setConfirmEmail("");
    }
  }, [open]);

  return (
    <AlertDialog
      open={Boolean(open)}
      onOpenChange={(next) => {
        onOpenChange?.(next);
      }}
    >
      {step === 1 ? (
        <AlertDialogContent className="w-[420px] max-w-[calc(100vw-3rem)] rounded-xl p-0">
          <div className="rounded-xl bg-background">
            <AlertDialogHeader className="px-6 pb-4 pt-7 gap-3">
              <div className="mx-auto flex h-10 w-10 items-center justify-center ">
                <img src="/RedAlertIcon.png"></img>
              </div>
              <AlertDialogTitle className="mt-3 mb-2 text-center text-lg font-bold text-foreground">
                You are about to <span className="text-red-500">REMOVE </span>
                <span>&ldquo;{userName}&rdquo; as a user.</span>
                <br />
              </AlertDialogTitle>
              <AlertDialogDescription className="">
                <span className="text-sm text-black font-semibold">Do you wish to continue?</span>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter className="border-t border-[hsl(var(--gray-border))] px-6 py-4">
              <div className="grid w-full grid-cols-1 gap-1">
                <AlertDialogAction
                  className="h-11 w-full rounded-md bg-red-500 text-white hover:bg-red-500/90"
                  onClick={(e) => {
                    e.preventDefault();
                    setStep(2);
                  }}
                >
                  Remove User
                </AlertDialogAction>
                <AlertDialogCancel className="h-11 w-full rounded-md" onClick={() => onOpenChange?.(false)}>
                  Cancel
                </AlertDialogCancel>
              </div>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      ) : (
        <AlertDialogContent className="w-[420px] max-w-[calc(100vw-3rem)] rounded-xl p-0">
          <div className="rounded-xl bg-background">
            <AlertDialogHeader className="px-6 pb-4 pt-6">
              <AlertDialogTitle className="text-center text-base font-bold text-foreground">
                Input your XU Email to confirm
              </AlertDialogTitle>
              <div className="mt-4">
                <Input
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  size="sm"
                  placeholder="example@xu.edu.ph"
                />
              </div>
            </AlertDialogHeader>

            <AlertDialogFooter className="border-t border-[hsl(var(--gray-border))] px-6 py-4">
              <div className="grid w-full grid-cols-1 gap-3">
                <AlertDialogAction
                  className="h-11 w-full rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={(e) => {
                    e.preventDefault();
                    if (confirmEmail.trim().toLowerCase() === adminEmail.trim().toLowerCase()) {
                      onRemove?.();
                      onOpenChange?.(false);
                    } else {
                      alert("Email does not match the logged-in admin's email. Please try again.");
                    }
                  }}
                >
                  Confirm
                </AlertDialogAction>
                <AlertDialogCancel className="h-11 w-full rounded-md" onClick={() => onOpenChange?.(false)}>
                  Cancel
                </AlertDialogCancel>
              </div>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      )}
    </AlertDialog>
  );
}
