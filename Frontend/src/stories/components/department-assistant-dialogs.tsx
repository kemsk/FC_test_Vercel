import * as React from "react";

import { Button } from "./button";
import { Dialog, DialogContent, DialogTrigger } from "./dialog";
import { Input } from "./input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { Checkbox } from "./checkbox";

type RadioOption<T extends string> = {
  value: T;
  label: string;
  disabled?: boolean;
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
          <label 
            key={opt.value} 
            className={`flex items-center gap-2 text-sm ${
              opt.disabled ? "text-muted-foreground opacity-50" : "text-muted-foreground"
            }`}
          >
            <input
              type="radio"
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              disabled={opt.disabled}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export type DepartmentAssistantPayload = {
  firstName: string;
  middleName?: string;
  lastName: string;
  universityId: string;
  college?: string;
  department?: string;
  office?: string;
  email: string;
  isActive: boolean;
  approverType?: "College" | "Office";
  supervisorApproverId?: string;
};

export type AddDepartmentAssistantDialogProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  onCreate?: (payload: DepartmentAssistantPayload) => void;
  colleges?: string[];
  departments?: string[];
  collegeDepartmentsMap?: Record<string, string[]>;
  emailHelpText?: string;
  // NEW: mode and admin‑specific props
  mode?: "assistant" | "admin";
  offices?: string[];
  // For admin mode: pre-filtered departments and offices based on approver level
  adminDepartments?: string[];
  adminOffices?: string[];
  // Approver type restrictions
  allowedApproverType?: "College" | "Office" | "both";
  approverEmail?: string;
  // Approver level for restricting options
  approverLevel?: "dean" | "chair" | "office";
};

export function AddDepartmentAssistantDialog({
  open,
  onOpenChange,
  trigger,
  onCreate,
  colleges = [],
  collegeDepartmentsMap = {},
  emailHelpText = "Only @xu.edu.ph email address are allowed",
  mode = "assistant",
  offices = [],
  adminDepartments = [],
  adminOffices = [],
  allowedApproverType = "both",
  approverEmail = "",
  approverLevel,
}: AddDepartmentAssistantDialogProps) {
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
  const [college, setCollege] = React.useState<string>("");
  const [department, setDepartment] = React.useState<string>("");
  const [office, setOffice] = React.useState<string>("");
  const [email, setEmail] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  // Admin mode state
  const [departmentOrOffice, setDepartmentOrOffice] = React.useState("");
  const [termsAccepted, setTermsAccepted] = React.useState(false);
  // Assistant mode approver type
  const [approverType, setApproverType] = React.useState<"College" | "Office">("College");

  React.useEffect(() => {
    if (!effectiveOpen) return;
    setFirstName("");
    setMiddleName("");
    setLastName("");
    setUniversityId("");
    setCollege("");
    setDepartment("");
    setOffice("");
    setEmail("");
    setIsActive(true);
    setDepartmentOrOffice("");
    setTermsAccepted(false);
    // Set default approver type based on restrictions
    if (allowedApproverType === "College") {
      setApproverType("College");
    } else if (allowedApproverType === "Office") {
      setApproverType("Office");
    } else {
      setApproverType("College");
    }
  }, [effectiveOpen, allowedApproverType]);

  React.useEffect(() => {
    // Reset department when college changes
    setDepartment("");
  }, [college]);

  const filteredDepartments = React.useMemo(() => {
    // Only show departments for the selected college
    if (!college) return [];
    return collegeDepartmentsMap[college] || [];
  }, [college, collegeDepartmentsMap]);

  React.useEffect(() => {
    if (mode !== "assistant" || approverType !== "College") return;
    if (colleges.length === 1 && !college) {
      setCollege(colleges[0]);
    }
  }, [mode, approverType, colleges, college]);

  React.useEffect(() => {
    if (mode !== "assistant" || approverType !== "College") return;
    if (filteredDepartments.length === 1 && !department) {
      setDepartment(filteredDepartments[0]);
    }
  }, [mode, approverType, filteredDepartments, department]);

  React.useEffect(() => {
    // Reset dependent fields when approver type changes
    if (approverType === "College") {
      setOffice("");
    } else {
      setCollege("");
      setDepartment("");
    }
  }, [approverType]);

  return (
    <Dialog open={effectiveOpen} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="left-6 right-6 w-auto max-w-[420px] translate-x-0 rounded-xl p-0 sm:left-[50%] sm:right-auto sm:w-full sm:max-w-lg sm:translate-x-[-50%]">
        <div className="rounded-xl bg-background">
          <div className="px-6 pb-4 pt-6">
            <div className="text-center text-base font-bold text-foreground">{mode === "admin" ? "Add Admin" : "Add Assistant"}</div>

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
                />
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-foreground">Email (@XU.EDU.PH)</div>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} size="sm" />
                <div className="text-muted-foreground text-sm">{emailHelpText}</div>
              </div>

              {/* Show approver type selection for assistant mode - always show like CISO */}
              {mode === "assistant" && (
                <RadioRow
                  label="Approver Type"
                  value={approverType}
                  onChange={(value) => setApproverType(value as "College" | "Office")}
                  options={[
                    { 
                      value: "College", 
                      label: "College",
                      disabled: approverLevel === "office"
                    }, 
                    { 
                      value: "Office", 
                      label: "Office",
                      disabled: approverLevel === "dean" || approverLevel === "chair"
                    }
                  ]}
                />
              )}

              {/* Department or Office dropdown - shown for both admin and assistant modes */}
              {mode === "admin" ? (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-foreground">Department or Office</div>
                  <Select value={departmentOrOffice} onValueChange={setDepartmentOrOffice}>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Choose from dropdown" />
                    </SelectTrigger>
                    <SelectContent>
                      {adminDepartments.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                      {adminOffices.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <>
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
                </>
              )}

              
              {mode === "admin" && (
                <div className="flex items-start space-x-2 pt-2">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked: boolean | "indeterminate") => setTermsAccepted(checked === true)}
                  />
                  <div className="flex-1 text-xs text-foreground">
                    <label htmlFor="terms" className="block">
                      <span className="font-semibold">I understand</span>{" "}
                      <span>
                        that creating this user means they have access to the following features:
                      </span>
                    </label>
                    <ul className="mt-1 list-disc pl-5 space-y-0.5 text-[11px]">
                      <li>Set Requirements</li>
                      <li>Approve and Reject Clearance Requests</li>
                      <li>Create Departmental Requirements</li>
                      <li>Create Approver Assistant</li>
                      <li>See Activity Logs</li>
                    </ul>
                  </div>
                </div>
              )}

            </div>
          </div>

          <div className="border-t border-[hsl(var(--gray-border))] px-6 py-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="cancel"
                className="h-11 w-full"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-11 w-full rounded-md"
                onClick={() => {
                  if (mode === "admin" && !termsAccepted) {
                    alert("You must accept the terms and agreements to continue.");
                    return;
                  }
                  if (mode === "admin") {
                    // For admin mode, derive assistantType and set department/office appropriately
                    const selected = departmentOrOffice;
                    const isOffice = adminOffices.includes(selected);
                    onCreate?.({
                      firstName,
                      middleName: middleName.trim() ? middleName : undefined,
                      lastName,
                      universityId,
                      college,
                      department: isOffice ? undefined : (selected ?? undefined),
                      office: isOffice ? selected : undefined,
                      email,
                      isActive,
                    });
                  } else {
                    // For assistant mode, handle approver type logic
                    const payload: DepartmentAssistantPayload = {
                      firstName,
                      middleName: middleName.trim() ? middleName : undefined,
                      lastName,
                      universityId,
                      email,
                      isActive,
                      approverType,
                    };

                    // Set college/department/office based on approver type
                    if (approverType === "College") {
                      payload.college = college;
                      payload.department = department;
                    } else if (approverType === "Office") {
                      payload.office = office;
                      // For Office approvers, college/department are optional for the student assistant
                      if (college) payload.college = college;
                      if (department) payload.department = department;
                      // Link to supervisor approver ID if available
                      if (approverEmail) {
                        payload.supervisorApproverId = approverEmail;
                      }
                    }

                    onCreate?.(payload);
                  }
                  setOpen(false);
                }}
              >
                {mode === "admin" ? "Create" : "Add"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type EditDepartmentAssistantDialogProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  initialValues?: Partial<DepartmentAssistantPayload>;
  onSave?: (payload: DepartmentAssistantPayload) => void;
  colleges?: string[];
  departments?: string[];
  collegeDepartmentsMap?: Record<string, string[]>;
  emailDisabled?: boolean;
  emailHelpText?: string;
};

export function EditDepartmentAssistantDialog({
  open,
  onOpenChange,
  trigger,
  initialValues,
  onSave,
  colleges = [],
  collegeDepartmentsMap = {},
  emailDisabled = false,
  emailHelpText = "Only @xu.edu.ph email address is allowed",
}: EditDepartmentAssistantDialogProps) {
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
  const [college, setCollege] = React.useState<string>("");
  const [department, setDepartment] = React.useState<string>("");
  const [email, setEmail] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);

  React.useEffect(() => {
    if (!effectiveOpen) return;
    setFirstName(initialValues?.firstName ?? "");
    setMiddleName(initialValues?.middleName ?? "");
    setLastName(initialValues?.lastName ?? "");
    setUniversityId(initialValues?.universityId ?? "");
    setCollege(initialValues?.college ?? "");
    setDepartment(initialValues?.department ?? "");
    setEmail(initialValues?.email ?? "");
    setIsActive(initialValues?.isActive ?? true);
  }, [effectiveOpen, initialValues]);

  React.useEffect(() => {
    // Reset department when college changes
    setDepartment("");
  }, [college]);

  const filteredDepartments = React.useMemo(() => {
    // Only show departments for the selected college
    if (!college) return [];
    const base = collegeDepartmentsMap[college] || [];
    if (initialValues?.department && !base.includes(initialValues.department)) {
      return [...base, initialValues.department];
    }
    return base;
  }, [college, collegeDepartmentsMap, initialValues?.department]);

  return (
    <Dialog open={effectiveOpen} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="w-[420px] max-w-[calc(100vw-3rem)] rounded-xl p-0">
        <div className="rounded-xl bg-background">
          <div className="px-6 pb-4 pt-6">
            <div className="text-center text-base font-bold text-foreground">Edit Assistant</div>

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
                <div className="text-xs font-semibold text-foreground">Email (@MY.XU.EDU.PH)</div>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  size="sm"
                  placeholder="username@my.xu.edu.ph"
                  disabled={emailDisabled}
                />
                <div className="text-[10px] text-muted-foreground">{emailHelpText}</div>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-foreground">College</div>
                <Select value={college} onValueChange={setCollege}>
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
                <div className="text-xs font-semibold text-foreground">Department</div>
                <Select value={department} onValueChange={setDepartment}>
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

              <label className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox variant="primary" checked={isActive} onCheckedChange={(v: boolean) => setIsActive(v)} />
                <span>Set as Active</span>
              </label>
            </div>
          </div>

          <div className="border-t border-[hsl(var(--gray-border))] px-6 py-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="cancel"
                className="h-11 w-full"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-11 w-full rounded-md"
                onClick={() => {
                  onSave?.({
                    firstName,
                    middleName: middleName.trim() ? middleName : undefined,
                    lastName,
                    universityId,
                    college,
                    department,
                    email,
                    isActive,
                  });
                  setOpen(false);
                }}
              >
                Update
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
