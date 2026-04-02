import * as React from "react";

import { Check, ChevronLeft, ChevronRight, Download, Eye, Pencil, Plus, Trash2, Upload, X, ArrowBigLeft, ArrowBigRight, UserCheck, UserMinus, UserPlus } from "lucide-react";

import { Link } from "react-router-dom";
import { cn } from "../../components/lib/utils";
import { Badge } from "./badge";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { ApproveConfirmDialog, RejectAlertDialog } from "./clearance-action-dialogs";
import { AddRequirementDialog, type AddRequirementPayload } from "./add-requirement-dialog";
import { Divider } from "./divider";
import { DeactivateAlert, ActivateAlert, DeleteAlert } from "./alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";

import { CommentDialog } from "./dialog";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./card";
import { RadioGroup, RadioGroupItem } from "./radio-group";
import { InputGroup, InputGroupInput, InputGroupWithAddon } from "./input-group";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

export function GuidelinesToggle({
  checked = false,
  onChange,
}: {
  checked?: boolean;
  onChange: (next: boolean) => void;
}) {
  const [isChecked, setIsChecked] = React.useState(checked);
  const [showAlert, setShowAlert] = React.useState(false);
  const [alertType, setAlertType] = React.useState<'activate' | 'deactivate'>('deactivate');

  const handleToggle = () => {
    if (isChecked) {
      // If currently active, show deactivation alert
      setAlertType('deactivate');
      setShowAlert(true);
    } else {
      // If currently inactive, show activation alert
      setAlertType('activate');
      setShowAlert(true);
    }
  };

  const confirmToggle = () => {
    setShowAlert(false);
    const newValue = alertType === 'activate' ? true : false;
    setIsChecked(newValue);
    onChange(newValue);
  };

  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={isChecked}
        className={
          isChecked
            ? "relative h-6 w-12 rounded-full bg-success pointer-events-auto z-10 cursor-pointer"
            : "relative h-6 w-12 rounded-full bg-muted-foreground/30 pointer-events-auto z-10 cursor-pointer"
        }
        onClick={handleToggle}
        onMouseDown={(e) => {
          console.log("Mouse down on toggle");
        }}
      >
        <span
          className={
            isChecked
              ? "absolute left-[26px] top-1 h-4 w-4 rounded-full bg-white pointer-events-none"
              : "absolute left-1 top-1 h-4 w-4 rounded-full bg-white pointer-events-none"
          }
        />
      </button>

      {showAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            {alertType === 'activate' ? (
              <ActivateAlert 
                onDelete={confirmToggle}
                onCancel={() => setShowAlert(false)}
              />
            ) : (
              <DeactivateAlert 
                onDelete={confirmToggle}
                onCancel={() => setShowAlert(false)}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

type DashboardBadgeVariant = "default" | "success" | "warning" | "muted";

function getBadgeVariant(variant: DashboardBadgeVariant | undefined) {

  if (variant === "warning") return "warning" as const;

  if (variant === "muted") return "secondary" as const;

  return "default" as const;

}



export type WelcomeCardProps = {

  name: string;

  className?: string;

};



export function WelcomeCard({ name, className }: WelcomeCardProps) {

  return (

    <Card className={cn("overflow-hidden border-0 shadow-none", className)}>

      <CardHeader className="bg-primary text-primary-foreground text-center py-2.5">

        <CardDescription className="text-base leading-none text-primary-foreground/80">

          Welcome

        </CardDescription>

        <CardTitle className="text-xl font-bold leading-tight">{name}!</CardTitle>

      </CardHeader>

    </Card>

  );

}



export type ActionNavCardProps = {

  icon: React.ReactNode;

  title: string;

  description: string;

  to?: string;

  onClick?: () => void;

  className?: string;

};



export function ActionNavCard({

  icon,

  title,

  description,

  to,

  onClick,

  className,

}: ActionNavCardProps) {

  const content = (

    <Card className={cn("rounded-xl border bg-white shadow-sm", className)}>

      <CardContent className="flex items-center gap-4 p-4">

        <div className="text-primary ">{icon}</div>



        <div className="min-w-0 flex-1">

          <div className="text-sm font-bold text-primary">{title}</div>

          <div className="mt-1 text-xs text-primary">{description}</div>

        </div>



        <ChevronRight className="h-5 w-5 text-primary" />

      </CardContent>

    </Card>

  );



  if (to) {

    return (

      <Link to={to} className="block">

        {content}

      </Link>

    );

  }



  return (

    <button type="button" className="block w-full text-left" onClick={onClick}>

      {content}

    </button>

  );

}



export type RequirementListItem = {

  title: string;  
  description: string;
  physicalSubmission?: boolean;
  lastUpdated?: string;
  submissionDeadline?: string;

};



export type StudentAssistantItem = {

  id: string;

  name: string;

  college: string;

  department: string;

  email: string;

  isActive?: boolean;

  /**
   * Optional university ID used in edit dialogs.
   * The Approver Assistants page prefers this over the internal id.
   */
  universityId?: string;

  /**
   * Optional assistant type used to distinguish student assistants
   * from admin-type assistants in the Approver Assistants page.
   * Examples: "student_assistant", "college_admin", "dept_chair".
   */
  assistantType?: string;

};



export type StudentAssistantsCardProps = {

  items: StudentAssistantItem[];

  className?: string;

  onAddUser?: () => void;

  onCreateUser?: (payload: {

    firstName: string;

    middleName?: string;

    lastName: string;

    schoolId: string;

    college: string;

    department: string;

    email: string;

  }) => void;

  onEditUser?: (item: StudentAssistantItem) => void;

  onRemove?: (id: string) => void;

  /**
   * Optional controlled mode for the header dropdown.
   * If not provided, the card manages its own internal mode state.
   */
  mode?: "assistants" | "admins";

  onModeChange?: (mode: "assistants" | "admins") => void;

};

export function StudentAssistantsCard({
  items,
  className,
  onAddUser,
  onEditUser,
  onRemove,
  mode,
  onModeChange,
}: StudentAssistantsCardProps) {
  const [internalMode, setInternalMode] = React.useState<"assistants" | "admins">("assistants");

  const effectiveMode = mode ?? internalMode;

  const setMode = (next: "assistants" | "admins") => {
    if (!mode) {
      setInternalMode(next);
    }
    onModeChange?.(next);
  };

  const addLabel = effectiveMode === "admins" ? "Add Admin" : "Add Assistant";

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-0">
        <div className="flex">
          <Divider orientation="vertical" className="h-auto self-stretch" />

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3 border-b px-5 py-5">
              <Select
                value={effectiveMode}
                onValueChange={(v) => setMode(v as "assistants" | "admins")}
              >
                <SelectTrigger variant="primaryoutline" className="w-max">
                  <div className="flex items-center gap-2">
                    <img 
                      src={effectiveMode === "admins" ? "/PrimaryAdminIcon.png" : "/PrimaryWaveHandIcon.png"} 
                      alt={effectiveMode === "admins" ? "admins" : "assistants"} 
                      className="h-4 w-4" 
                    />
                    <SelectValue placeholder="Assistants" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assistants">Assistants</SelectItem>
                  <SelectItem value="admins">Admins</SelectItem>
                </SelectContent>
              </Select>

              <Button type="button" className="h-8 rounded-md px-3 text-sm font-bold" onClick={onAddUser}>
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />{addLabel}
                </div>
              </Button>
            </div>

            <Divider color="border-[hsl(var(--gray-border))]" />

            <div>
              {items.map((item, idx) => (
                <React.Fragment key={item.id}>
                  <div className="flex items-start gap-4 px-4 py-5">
                    <div className="min-w-0 flex-1 px-2 py-2">
                      <div className="flex items-center justify-start w-full">
                        <Badge variant={item.isActive ? "success" : "destructive"}>
                          {item.isActive ? "ACTIVE" : "INACTIVE"}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between w-full pt-4">
                        <span className="text-2xl font-bold text-gray-900">{item.name}</span>
                      </div>

                      <div className="mt-4 grid grid-cols-[95px_1fr] gap-x-5 gap-y-1 text-sm">
                        <div className="font-bold text-gray-900">College</div>
                        <div className="text-gray-900">{item.college}</div>
                        <div className="font-bold text-gray-900">Department</div>
                        <div className="text-gray-900">{item.department}</div>
                        <div className="font-bold text-gray-900">Email</div>
                        <div className="text-gray-900">{item.email}</div>
                      </div>

                      <div className="flex items-center gap-2 mt-4 w-full">
                        <Button
                          type="button"
                          variant="action"
                          className="h-9 rounded-md px-6 text-sm font-bold flex-1"
                          onClick={() => onEditUser?.(item)}
                        >
                          EDIT
                        </Button>

                        <Button
                          type="button"
                          variant="destructive"
                          className="h-9 rounded-md px-6 text-sm font-bold flex-1"
                          onClick={() => onRemove?.(item.id)}
                        >
                          REMOVE
                        </Button>
                      </div>
                    </div>
                  </div>

                  {idx < items.length - 1 ? (
                    <Divider color="border-[hsl(var(--gray-border))]" />
                  ) : null}
                </React.Fragment>
              ))}
            </div>
          </div>

          <Divider orientation="vertical" className="h-auto self-stretch" />
        </div>
      </CardContent>
    </Card>
  );
}

export type RequirementEditCardProps = {
  title?: string;
  description?: string;
  physicalSubmission?: boolean;
  Recipients?: string;
  className?: string;
  LastUpdated?: string;
  CreatedBy?: string;
  ClearanceTimeline?: string;
  onEdit?: () => void;
  onDelete?: () => void;
};

export function RequirementEditCard({
  title,
  description,
  physicalSubmission = false,
  Recipients,
  LastUpdated,
  CreatedBy,
  ClearanceTimeline,
  onEdit,
  onDelete,
}: RequirementEditCardProps) {
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow">
      <div className="pt-6 pb-4 pl-4 pr-4">
        <div
          className={cn(
            "text-xl font-bold text-primary text-center",
            physicalSubmission ? "mt-1" : "mt-0"
          )}
        >
          {title}
        </div>

        <div className="flex items-center justify-left gap-2 mt-3">
          {physicalSubmission ? (
            <Badge variant="warning" className="mb-2">
              PHYSICAL SUBMISSION
            </Badge>
          ) : null}
        </div>
      </div>

      <Divider className="bg-foreground w-full" />

      <div className="pt-6 pb-4 pl-6 pr-6">
        <div>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-md font-bold text-gray-900">Recipients</div>
            <div className="text-sm text-gray-900 text-left break-words">{Recipients}</div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="text-md font-bold text-gray-900 pt-1">Description</div>
            <div className="text-sm text-gray-900 text-left break-words">{description}</div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="text-md font-bold text-gray-900">Last Updated</div>
            <div className="text-sm text-gray-900 text-left break-words">{LastUpdated}</div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="text-md font-bold text-gray-900">Created By</div>
            <div className="text-sm text-gray-900 text-left break-words">{CreatedBy}</div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 pb-3">
            <div className="text-md font-bold text-gray-900">Clearance Timeline</div>
            <div className="text-sm text-gray-900 text-left break-words">{ClearanceTimeline}</div>
          </div>
        </div>
      </div>

      <Divider className="bg-foreground w-full" />

      <div className="mt-4 pt-2 pb-5 flex items-center justify-center gap-3">
        <Button 
          variant="default" 
          className="h-max w-max rounded-xl px-7 text-base font-semibold p-3"
          onClick={() => onEdit?.()}
        >
          <div className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Edit
          </div>
        </Button>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="destructive"
              className="h-max w-max rounded-xl px-7 text-base font-semibold p-3"
            >
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Delete
              </div>
            </Button>
          </AlertDialogTrigger>

          <AlertDialogContent className="max-w-md">
            <DeleteAlert
              itemName={title}
              onDelete={() => {
                onDelete?.();
                setDeleteOpen(false);
              }}
              onCancel={() => setDeleteOpen(false)}
            />
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export type RequirementListCardProps = {
  title: string;
  Recipients: string;
  description: string;
  physicalSubmission?: boolean;
  submissionDeadline?: string;
  className?: string;
  LastUpdated?: string;
  CreatedBy?: string;
  onEdit?: () => void;
  ClearanceTimeline?: string;
  onDelete?: () => void;
};

export function RequirementListCard({
  title,
  description,
  physicalSubmission = false,
  Recipients,
  LastUpdated,
  CreatedBy,
  ClearanceTimeline,
  onEdit,
  onDelete,
}: RequirementListCardProps) {
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow">
      <div className="pt-6 pb-4 pl-4 pr-4">
        <div
          className={cn(
            "text-xl font-bold text-primary text-center",
            physicalSubmission ? "mt-1" : "mt-0"
          )}
        >
          {title}
        </div>

        <div className="flex items-center justify-left gap-2 mt-3">
          {physicalSubmission ? (
            <Badge variant="warning" className="mb-2">
              PHYSICAL SUBMISSION
            </Badge>
          ) : null}
        </div>
      </div>

      <Divider className="bg-foreground w-full" />

      <div className="pt-6 pb-4 pl-6 pr-6">
        <div>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-md font-bold text-gray-900">Recipients</div>
            <div className="text-sm text-gray-900 text-left break-words">{Recipients}</div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="text-md font-bold text-gray-900 pt-1">Description</div>
            <div className="text-sm text-gray-900 text-left break-words">{description}</div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="text-md font-bold text-gray-900">Last Updated</div>
            <div className="text-sm text-gray-900 text-left break-words">{LastUpdated}</div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="text-md font-bold text-gray-900">Created By</div>
            <div className="text-sm text-gray-900 text-left break-words">{CreatedBy}</div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 pb-3">
            <div className="text-md font-bold text-gray-900">Clearance Timeline</div>
            <div className="text-sm text-gray-900 text-left break-words">{ClearanceTimeline}</div>
          </div>
        </div>
      </div>

    </div>
  );
}

export type ClearanceRequestItem = {
  id: string;
  name: string;
  requestId: string;
  employeeId: string;
  college: string;
  department: string;
  facultyType: string;
  status: ClearanceRequestStatus;
};

export type ClearanceRequestStatus = "pending" | "approved" | "rejected";

export type ClearanceRequestsCardProps = {
  items: ClearanceRequestItem[];
  className?: string;
  getItemHref?: (item: ClearanceRequestItem) => string;
};

function getClearanceStatusBadgeVariant(status: ClearanceRequestStatus) {
  if (status === "approved") return "success" as const;
  if (status === "rejected") return "destructive" as const;
  return "warning" as const;
}

export function ClearanceRequestsCard({
  items,
  className,
  getItemHref,
}: ClearanceRequestsCardProps) {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set());
  const [loading, setLoading] = React.useState(false);

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    
    setLoading(true);
    try {
      const response = await fetch("/admin/xu-faculty-clearance/api/approver/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken") || "",
        },
        body: JSON.stringify({
          request_ids: Array.from(selectedIds),
          action: "approve",
          remarks: "",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || errorData.message || `Failed to approve: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("Bulk approve successful:", result);
      
      // Refresh the page to show updated status
      window.location.reload();
    } catch (err) {
      console.error("Error approving:", err);
      alert(err instanceof Error ? err.message : "Failed to approve requests");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkReject = async (reason: string) => {
    if (selectedIds.size === 0) return;
    
    setLoading(true);
    try {
      const response = await fetch("/admin/xu-faculty-clearance/api/approver/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken") || "",
        },
        body: JSON.stringify({
          request_ids: Array.from(selectedIds),
          action: "reject",
          remarks: reason,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || errorData.message || `Failed to reject: ${response.statusText}`;
        if (errorData.detail) {
          throw new Error(`Failed to reject: ${errorData.detail}`);
        } else if (errorData.message) {
          throw new Error(`Failed to reject: ${errorData.message}`);
        } else {
          throw new Error(`Failed to reject: ${response.statusText}`);
        }
      }

      const result = await response.json();
      console.log("Bulk reject successful:", result);
      
      // Refresh the page to show updated status
      window.location.reload();
    } catch (err) {
      console.error("Error rejecting:", err);
      alert(err instanceof Error ? err.message : "Failed to reject requests");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get CSRF token
  function getCookie(name: string): string {
    let cookieValue = "";
    if (document.cookie && document.cookie !== "") {
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + "=")) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-0">
        <div className="flex">
          <Divider orientation="vertical" className="h-auto self-stretch " />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 border-b px-4 py-4">
              <Checkbox
                variant="primary"
                checked={selectedIds.size === items.length}
                onCheckedChange={(v) => {
                  if (v) {
                    setSelectedIds(new Set(items.map((i) => i.id)));
                  } else {
                    setSelectedIds(new Set());
                  }
                }}
              />

              <div className="text-sm font-bold text-primary">Select All</div>
              {selectedIds.size > 0 ? (
                <div className="ml-auto flex items-center gap-2">
                  <RejectAlertDialog
                    count={selectedIds.size}
                    trigger={
                      <Button
                        type="button"
                        variant="destructive"
                        className="h-7 rounded-md px-3 text-sm font-semibold"
                        disabled={loading}
                      >
                        Reject
                      </Button>
                    }
                    onReject={handleBulkReject}
                  />
                  <ApproveConfirmDialog
                    count={selectedIds.size}
                    trigger={
                      <Button
                        type="button"
                        className="h-7 rounded-l bg-[hsl(var(--success))] px-2 text-sm font-semibold text-white hover:bg-[hsl(var(--success))]/90"
                        disabled={loading}
                      >
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4" /> Approve
                        </div>
                      </Button>
                    }
                    onApprove={handleBulkApprove}
                  />
                </div>
              ) : null}
            </div>

            <Divider color="border-[hsl(var(--gray-border))]" />

            <div>
              {items.map((item, idx) => (
                <React.Fragment key={item.id}>
                  <div className="flex gap-3 px-4 py-6">
                    <div className="pt-1">
                      <Checkbox
                        variant="primary"
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={() => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(item.id)) next.delete(item.id);
                            else next.add(item.id);
                            return next;
                          });
                        }}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          {getItemHref ? (
                            <Link
                              to={getItemHref(item)}
                              className="truncate text-left text-2xl font-bold text-primary"
                            >
                              {item.name}
                            </Link>
                          ) : (
                            <div className="truncate text-left text-2xl font-bold text-primary">
                              {item.name}
                            </div>
                          )}
                        </div>

                        <div className="shrink-0">
                          <Badge
                            variant={getClearanceStatusBadgeVariant(item.status)}
                            className="px-3 py-1 text-xs font-bold"
                          >
                            {item.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-[88px_1fr] gap-x-3 gap-y-1 text-sm">
                        <div className="font-bold text-gray-900">Request ID</div>
                        <div className="text-gray-900">{item.requestId}</div>
                        <div className="font-bold text-gray-900">Employee ID</div>
                        <div className="text-gray-900">{item.employeeId}</div>

                        <div className="font-bold text-gray-900">College</div>
                        <div className="text-gray-900">{item.college}</div>

                        <div className="font-bold text-gray-900">Department</div>
                        <div className="text-gray-900">{item.department}</div>

                        <div className="font-bold text-gray-900">Faculty Type</div>
                        <div className="text-gray-900">{item.facultyType}</div>
                      </div>
                    </div>
                  </div>

                  {idx < items.length - 1 ? (
                    <Divider color="border-[hsl(var(--gray-border))]" />
                  ) : null}
                </React.Fragment>
              ))}
            </div>
          </div>
          <Divider orientation="vertical" className="h-auto self-stretch" />
        </div>
      </CardContent>
    </Card>
  );
}

export type RequestCardProps = {
  requestId?: string;
  employeeId?: string;
  name?: string;
  college?: string;
  department?: string;
  facultyType?: string;
  SchoolID?: string;
  FullName?: string;
  SchoolEmail?: string;
  status?: "pending" | "approved" | "rejected";
  className?: string;
  onApprove?: () => void;
  onReject?: () => void;
  onViewDetails?: () => void;
};

export function RequestCard({
  requestId,
  employeeId,
  SchoolID,
  FullName,
  name,
  college,
  department,
  facultyType,
  SchoolEmail,
  className,
  onApprove,
  onReject,
  onViewDetails,
}: RequestCardProps) {
  const getStatusVariant = (status: string) => {
    if (status === "approved") return "success" as const;
    if (status === "rejected") return "destructive" as const;
    return "warning" as const;
  };

  const getStatusText = (status: string) => {
    return status.toUpperCase();
  };

  return (
    <Card className={cn("overflow-hidden border-muted-foreground/20", className)}>
      <CardContent className="p-0">
        <div className="flex">
          <Divider orientation="vertical" className="h-auto self-stretch" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3 px-4 py-6 bg-primary">
              <div className="min-w-0 flex-1 text-white font-bold text-center text-2xl">
                {name}
              </div>
            </div>

            <div className=" grid grid-cols-[100px_1fr] gap-x-3 gap-y-2 text-sm p-6">
              <div className="font-bold text-gray-900">School ID</div>
              <div className="text-gray-900">{SchoolID}</div>
              
              <div className="font-bold text-gray-900">Full Name</div>
              <div className="text-gray-900">{FullName}</div>
              
              <div className="font-bold text-gray-900">College</div>
              <div className="text-gray-900">{college}</div>
              
              <div className="font-bold text-gray-900">Department</div>
              <div className="text-gray-900">{department}</div>
              
              <div className="font-bold text-gray-900">Faculty Type</div>
              <div className="text-gray-900">{facultyType}</div>
              
              <div className="font-bold text-gray-900">School Email</div>
              <div className="text-gray-900">{SchoolEmail}</div>
            </div>
          </div>
          <Divider orientation="vertical" className="h-auto self-stretch" />
        </div>
      </CardContent>
    </Card>
  );
}

export type RequirementApprovalCardProps = {
  requirementName?: string;
  submissionNotes?: string;
  className?: string;
  onApprove?: () => void;
  onReject?: () => void;
};

export function RequirementApprovalCard({
  requirementName = "Library Clearance",
  submissionNotes = "Submit library clearance form with signature",
  onApprove,
  onReject,
}: RequirementApprovalCardProps) {
  return (
    <div className="rounded-xl border bg-card text-card-foreground border-muted-foreground/20">
        <div className="space-y-4 p-6">
          <div>
            <div className="text-xl text-center text-gray-900 font-bold mt-1">{requirementName}</div>
          </div>
          
          <div>
            <div className="text-md font-bold text-gray-900">Submission Notes</div>
            <div className="text-sm text-gray-900 mt-3 p-3 border border-foreground rounded-md pb-">{submissionNotes}</div>
          </div>
          
          <div>
            <div className="text-md font-bold text-gray-900"></div>
            <div className="text-sm text-gray-900 mt-1"></div>
          </div>
        </div>

        <Divider className="bg-foreground "></Divider>

        <div className="p-6 ">
          <div className="flex items-center gap-3">
            <div className="text-md font-bold text-gray-900">Status</div>

            <div className="ml-auto">
              <div className="flex items-center gap-2">
                
                <input type="radio" name="status" value="approved" id="approved" className="h-4 w-4 text-blue-600" />
                <label htmlFor="approved" className="text-sm text-gray-900">Approved</label>
                
                <input type="radio" name="status" value="rejected" id="rejected" className="h-4 w-4 text-blsck bg-black" />
                <label htmlFor="rejected" className="text-sm text-gray-900">Rejected</label>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <div className="mt-2">
              <InputGroupWithAddon 
                placeholder="Enter remarks or comments..."
                className="text-md"
              />
            </div>
          </div>

          <div className="flex items-center mt-6 gap-3">
            <Button
              type="button"
              variant="back"
              className="h-8 rounded-md px-4 text-sm font-bold flex-1"
            >
              <div className="flex items-center justify-center gap-2">
                Cancel 
              </div>
            </Button>
            <Button
              type="button"
              variant="default"
              className="h-8 rounded-md px-4 text-sm font-bold flex-1"
            >
              <div className="flex items-center justify-center gap-2">
                Save
              </div>
            </Button>
          </div>
        </div>
      </div>
  );
}

export type ExportArchiveClearanceStatus = "complete" | "incomplete";

export type ExportArchiveClearanceItem = {
  id: string;
  name: string;
  requestId: string;
  universityId: string;
  college: string;
  department: string;
  facultyType: string;
  missingSignatures: string;
  status: ExportArchiveClearanceStatus;
};

export type ExportArchiveClearanceCardProps = {
  items: ExportArchiveClearanceItem[];
  className?: string;
  exportLabel?: string;
  onExport?: (items: ExportArchiveClearanceItem[]) => void;
};


function getExportArchiveClearanceBadgeVariant(status: ExportArchiveClearanceStatus) {
  if (status === "complete") return "success" as const;
  return "destructive" as const;
}

export function ExportArchiveClearanceCard({
  items,
  className,
  exportLabel = "Export Results",
  onExport,

}: ExportArchiveClearanceCardProps) {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set());
  const selectedItems = React.useMemo(
    () => items.filter((i) => selectedIds.has(i.id)),
    [items, selectedIds]
  );

  return (
    <Card className={cn("overflow-hidden border-muted-foreground/20 shadow-sm", className)}>
      <CardContent className="p-0">
        <div className="flex">

          <Divider orientation="vertical" className="h-auto self-stretch " />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 border-b px-4 py-4">
              <Checkbox
                variant="primary"
                checked={items.length > 0 && selectedIds.size === items.length}
                onCheckedChange={(v) => {
                  if (v) setSelectedIds(new Set(items.map((i) => i.id)));
                  else setSelectedIds(new Set());
                }}
              />
              <div className="text-sm font-bold text-primary">
                Select All
              </div>
              <Button
                type="button"
                variant="default"
                className="ml-auto h-10 rounded-md px-4 text-sm font-bold"
                onClick={() => onExport?.(selectedItems)}
                disabled={selectedItems.length === 0}
              >
                <Plus className="h-5 w-5" />
                {exportLabel}
              </Button>
            </div>

            <Divider color="border-[hsl(var(--gray-border))]" />

            <div>
              {items.map((item, idx) => (
                <React.Fragment key={item.id}>
                  <div className="flex gap-3 px-4 py-6">
                    <div className="pt-1">
                      <Checkbox
                        variant="primary"
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={() => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(item.id)) next.delete(item.id);
                            else next.add(item.id);
                            return next;
                          });
                        }}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-left text-base font-bold text-primary">
                            {item.name}  
                          </div>
                        </div>

                        <div className="shrink-0">
                          <Badge
                            variant={getExportArchiveClearanceBadgeVariant(item.status)}
                            className="px-3 py-1 text-xs font-bold"
                          >
                            {item.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-[110px_1fr] gap-x-3 gap-y-1 text-sm">
                        <div className="font-bold text-gray-900">
                          Request ID
                        </div>
                        <div className="text-gray-900">
                          {item.requestId}
                        </div>
                        <div className="font-bold text-gray-900">
                          University ID
                        </div>
                        <div className="text-gray-900">
                          {item.universityId}
                        </div>
                        <div className="font-bold text-gray-900">
                          College
                        </div>
                        <div className="text-gray-900">
                          {item.college}
                        </div>
                        <div className="font-bold text-gray-900">
                          Department
                        </div>
                        <div className="text-gray-900">
                          {item.department}
                        </div>
                        <div className="font-bold text-gray-900">
                          Faculty Type
                        </div>
                        <div className="text-gray-900">
                          {item.facultyType}
                        </div>
                        <div className="font-bold text-gray-900">
                          Missing Signatures
                        </div>
                        <div className="text-gray-900">
                          {item.missingSignatures}
                        </div>
                      </div>
                    </div>
                  </div>

                  {idx < items.length - 1 ? (
                    <Divider color="border-[hsl(var(--gray-border))]" />
                  ) : null}
                </React.Fragment>
              ))}
            </div>
          </div>
          <Divider orientation="vertical" className="h-auto self-stretch" />
        </div>
      </CardContent>
    </Card>

  );
};





export type RequirementsListCardProps = {

  items: RequirementListItem[];
  className?: string;
  lastUpdated?: string;
  onClose?: () => void;
  headerActionHref?: string;
  headerActionImgSrc?: string;
  headerActionImgAlt?: string;
  onViewItem?: (item: RequirementListItem) => void;
  onAddRequirement?: () => void;
  addDisabled?: boolean;

};



export function RequirementsListCard({

  items,
  className,
  onClose,
  headerActionHref,
  headerActionImgSrc,
  headerActionImgAlt = "Open",
  lastUpdated,
  onViewItem,
  onAddRequirement,
  addDisabled = true,

}: RequirementsListCardProps) {
  const [collapsedTitles, setCollapsedTitles] = React.useState<Set<string>>(() => new Set());

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="relative bg-primary py-3">
        <CardTitle className="text-center text-base font-bold text-primary-foreground">
          Requirements List
        </CardTitle>
        {headerActionHref && headerActionImgSrc ? (
          <Button
            asChild
            variant="icon"
            size="icon"
            className="absolute right-3 top-[40%] -translate-y-1/2 text-primary-foreground"
          >
            <Link to={headerActionHref}>
              <img
                src={headerActionImgSrc}
                alt={headerActionImgAlt}
                className="h-6 w-6 object-contain"
              />
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant="icon"
            size="icon"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-foreground"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <div className="p-4">
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.title}
                className="flex items-start justify-between gap-3 rounded-md bg-muted"
              >
                <div className="w-full">
                  <div className="flex items-center justify-between gap-3  p-4">
                    <div className="text-lg font-bold text-gray-900 mt-2">{item.title}</div>
                    <Button
                      type="button"
                      variant="icon"
                      className="mt-0.5 text-primary"
                    >
                      {headerActionHref ? (
                        <Link to={headerActionHref}>
                          <img src="BlackChevronIcon.png" className="h-5" />
                        </Link>
                      ) : (
                        <img src="BlackChevronIcon.png" className="h-5" />
                      )}
                    </Button>
                  </div>
                  
                  <Divider className="bg-black mt-2"></Divider>

                    <div className=" p-4">
                      {item.physicalSubmission ? (
                        <div className="mt-2 ml-0">
                          <Badge variant="warning">PHYSICAL SUBMISSION</Badge>
                        </div>
                      ) : null}
                      <div className="mt-4 text-md text-gray-900">{item.description}</div>
                      <div className="mt-7 text-sm text-muted-foreground italic">{item.lastUpdated}</div>
                    </div>
                  
                </div>
              </div>
            ))}

          </div>

        </div>


      </CardContent>
    </Card>
  );
}



export type AnnouncementItem = {

  title: string;

  description: string;

  timestamp: string;

  imageSrc?: string;

  imageAlt?: string;

  pinned?: boolean;

  enabled?: boolean;

  headerActionHref?: string;

  headerActionImgSrc?: string;

  headerActionImgAlt?: string;

};



export type AnnouncementsCardProps = {

  items: AnnouncementItem[];

  className?: string;

  headerActionHref?: string;

  headerActionImgSrc?: string;

  headerActionImgAlt?: string;

  showHeaderChevron?: boolean;

};



export function AnnouncementsCard({

  items,
  className,
  headerActionHref,
  headerActionImgSrc,
  headerActionImgAlt,
  showHeaderChevron = true,

}: AnnouncementsCardProps) {

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="bg-[hsl(var(--yellow))] py-3 shadow-sm">

        <CardTitle className="relative flex items-center justify-center text-base font-bold text-gray-900">

          <div className="text-center font-bold">Announcements</div>
          {headerActionImgSrc && headerActionImgAlt ? (
            headerActionHref ? (
              <Button
                asChild
                variant="icon"
                size="icon"
                className="absolute right-[-8px] top-1/2 -translate-y-1/2"
              >
                <Link to={headerActionHref}>
                  <img
                    src={headerActionImgSrc}
                    alt={headerActionImgAlt}
                    className="h-6 w-6 object-contain"
                  />
                </Link>
              </Button>

            ) : (

              <div className="absolute right-0 top-1/2 -translate-y-1/2">
                <img
                  src={headerActionImgSrc}
                  alt={headerActionImgAlt}
                  className="h-6 w-6 object-contain"
                />
              </div>
            )
          ) : showHeaderChevron ? (
            <div className="absolute right-1 top-1/2 -translate-y-1/2">

              <ChevronRight className="h-5 w-5 text-gray-900" />

            </div>
          ) : null}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4">
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.title} className="rounded-md bg-foregroundLight p-4">
              <div className="flex items-start gap-3">
                {item.pinned ? (

                  <img src="/BlackBookmarkIcon.png" alt="Pin" className="mt-0.5 h-4 w-4 text-gray-900" />

                ) : null}
                <div className="min-w-0">
                  {item.imageSrc ? (
                    <img
                      src={item.imageSrc}
                      alt={item.imageAlt ?? "Announcement"}
                      className="mb-3 h-32 w-full rounded-md object-cover"
                    />
                  ) : null}
                  {item.pinned ? (
                    <div className="text-xs font-bold text-muted-foreground">PINNED</div>
                  ) : null}

                  <div className="text-sm font-bold text-gray-900 mt-2">{item.title}</div>

                  <div className="mt-1 text-sm text-muted-foreground">{item.description}</div>
                  <div className="mt-3 text-xs text-muted-foreground">{item.timestamp}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}





export type NotificationItemStatus = "approved" | "rejected" | "submitted";



export type NotificationItem = {

  title: string;

  status?: NotificationItemStatus;

  description?: string;

  details: string[];

  timestamp: string;

  is_read?: boolean;

};



export type NotificationsCardProps = {

  items: NotificationItem[];

  className?: string;



  pageSize?: number;

  showMarkAsReadButton?: boolean;

  readAll?: boolean;

  onReadAllChange?: (readAll: boolean) => void;

};



function statusText(status: NotificationItemStatus) {

  if (status === "approved") return "APPROVED";

  if (status === "rejected") return "REJECTED";

  return "SUBMITTED";

}



export function NotificationsCard({

  items,

  className,

  pageSize = 10,

  showMarkAsReadButton = true,

  readAll: readAllProp,

  onReadAllChange,

}: NotificationsCardProps) {

  const [page, setPage] = React.useState(1);

  const [readAllUncontrolled, setReadAllUncontrolled] = React.useState(false);



  const readAll = readAllProp ?? readAllUncontrolled;

  const setReadAll = (next: boolean) => {

    if (readAllProp === undefined) setReadAllUncontrolled(next);

    onReadAllChange?.(next);

  };



  React.useEffect(() => {

    setPage(1);

    setReadAll(false);

  }, [items]);



  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  const safePage = Math.min(Math.max(1, page), totalPages);

  const start = (safePage - 1) * pageSize;

  const pagedItems = items.slice(start, start + pageSize);



  React.useEffect(() => {

    if (page !== safePage) setPage(safePage);

  }, [page, safePage]);



  return (

    <Card className={className}>

      <CardContent className="p-0">

        {showMarkAsReadButton ? (

          <div className="flex items-center justify-end px-6 pt-4">

            <Button

              className="h-8 px-3 text-xs"

              variant="default"

              type="button"

              onClick={() => setReadAll(true)}

            >

              Mark as Read

            </Button>

          </div>

        ) : null}



        {pagedItems.map((item, index) => (

          <div key={`${item.title}-${start + index}`}>

            <div className="px-6 py-4">

              <div className="flex items-start justify-between gap-3">

                <div className="min-w-0">

                  <div className="text-base font-bold text-gray-900">{item.title}</div>

                  <div className="mt-1 text-sm text-gray-900">

                    {item.description?.trim()

                      ? item.description

                      : item.status

                        ? (

                            <>

                              Your submission has been <span className="font-bold">{statusText(item.status)}.</span>

                            </>

                          )

                        : null}

                  </div>

                </div>



                {!readAll && !item.is_read ? (

                  <div className="mt-1 h-4 w-4 shrink-0 rounded-full bg-red-500" />

                ) : null}

              </div>



              {item.details.length ? (

                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-900">

                  {item.details.map((d) => (

                    <li key={d}>{d}</li>

                  ))}

                </ul>

              ) : null}

              <div className="mt-3 text-xs italic text-muted-foreground">{item.timestamp}</div>

            </div>

            {index < pagedItems.length - 1 ? (
              <div className="h-px w-full bg-[hsl(var(--gray-border))]" />
            ) : null}

          </div>

        ))}

        <div className="px-6 pb-4">

          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">

            <span>Page</span>

            <button

              type="button"

              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-gray-900 disabled:opacity-50"

              onClick={() => setPage((p) => Math.max(1, p - 1))}

              disabled={safePage <= 1}

            >

              <ChevronLeft className="h-4 w-4" />

            </button>



            <select

              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-gray-900"

              value={safePage}

              onChange={(e) => setPage(Number(e.target.value))}

            >

              {Array.from({ length: totalPages }).map((_, i) => (

                <option key={i + 1} value={i + 1}>

                  {i + 1}

                </option>

              ))}

            </select>



            <button

              type="button"

              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-gray-900 disabled:opacity-50"

              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}

              disabled={safePage >= totalPages}

            >

              <ChevronRight className="h-4 w-4" />

            </button>



            <span>of {totalPages}</span>

          </div>

        </div>

      </CardContent>

    </Card>

  );

}


export type ActivityLogVariant =
  | "approved_clearance"
  | "rejected_clearance"
  | "create_request"
  | "edited_requirements"
  | "created_requirements"
  | "deleted_requirements"
  | "added_assistant_approver"
  | "updated_assistant_approver"
  | "removed_assistant_approver"
  | "user_logout"
  | "user_login"
  | "exported_clearance_results"
  | "created_guideline"
  | "edited_guideline"
  | "enabled_guideline"
  | "disabled_guideline"
  | "delete_guideline"
  | "set_guideline_status_active"
  | "set_guideline_status_inactive"
  | "archived_guideline"
  | "created_announcement"
  | "set_announcement_status_active"
  | "set_announcement_status_inactive"
  | "edited_announcement"
  | "created_timeline"
  | "edited_timeline"
  | "set_timeline_status_active"
  | "set_timeline_status_inactive"
  | "created_college"
  | "edited_college"
  | "deleted_college"
  | "created_department"
  | "edited_department"
  | "deleted_department"
  | "created_office"
  | "edited_office"
  | "deleted_office"
  | "added_to_approver_flow"
  | "edited_approver_flow"
  | "removed_from_approver_flow"
  | "created_approver"
  | "edited_approver"
  | "removed_approver"
  | "uploaded_faculty_data_dump"
  | "removed_faculty_data_dump";



export type ActivityLogItem = {

  id: string;
  dateLabel: string;
  timeLabel: string;
  variant: ActivityLogVariant;
  event_type?: string;  // Add event_type from backend API
  title?: string;
  description?: string;
  actorFirstName?: string;
  actorLastName?: string;
  actorRole?: string;
  facultyFirstName?: string;
  facultyLastName?: string;
  facultyCollege?: string;
  facultyDepartment?: string;
  universityId?: string;
  requestId?: string;
  details: string[];
  schoolYear?: string;
  semester?: string;
  guidelineTitle?: string;
  announcementTitle?: string;
  requirementTitle?: string;
  collegeName?: string;
  departmentName?: string;
  approverDepartment?: string;
  approverFlowField?: string;
  approverFirstName?: string;
  approverLastName?: string;
  assistantApproverFirstName?: string;
  assistantApproverLastName?: string;

};



export type ActivityLogsCardProps = {
  items: ActivityLogItem[];
  className?: string;
};



function getActivityIcon(variant: ActivityLogVariant) {

  if (variant === "approved_clearance") {

    return (

      <div className="flex flex-shrink-0 h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-success p-0.2">

        <Check strokeWidth={4} className="h-3 w-3 text-white transform translate-y-[0.5px]" />

      </div>

    );

  }

  if (variant === "archived_guideline") {

    return (

      <div className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-success p-0.2">

        <Check strokeWidth={4} className="h-3 w-3 text-white transform translate-y-[0.5px]" />

      </div>

    );

  }

  if (variant === "rejected_clearance" || variant === "set_guideline_status_inactive" || variant === "set_announcement_status_inactive" || variant === "set_timeline_status_inactive" || variant === "disabled_guideline" || variant === "delete_guideline") { 

    return (

      <div className="flex flex-shrink-0 h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-[hsl(var(--destructive))] p-0.5">

        <X strokeWidth={4} className="h-3 w-3 text-white transform " />

      </div>

    );

  }

  if (variant === "create_request" || variant === "created_requirements" || variant === "created_guideline" || variant === "created_announcement" || variant === "created_timeline" || variant === "created_college" || variant === "created_department" || variant === "added_to_approver_flow" || variant === "enabled_guideline") {

    return (

      <div className="flex flex-shrink-0 h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-primary p-0.5">

        <Plus strokeWidth={4} className="h-3 w-3  text-white transform" />

      </div>

    );

  }

  if (variant === "edited_requirements" || variant === "edited_approver_flow" || variant === "edited_guideline" || variant === "edited_announcement" || variant === "edited_college" || variant === "edited_department" || variant === "edited_office" || variant === "edited_approver" || variant === "edited_timeline") {

    return (

      <div className="flex flex-shrink-0 h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-primary p-0.5">

        <Pencil strokeWidth={4} className="h-3 w-3 text-white" />

      </div>

    );

  }

  if (variant === "updated_assistant_approver") {

    return (

      <div className="flex flex-shrink-0 h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-primary p-0.5">

        <UserCheck strokeWidth={4} className="h-3 w-3 text-white" />

      </div>

    );

  }

  if (variant === "removed_assistant_approver" || variant === "removed_approver") {

    return (

      <div className="flex flex-shrink-0 h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-[hsl(var(--destructive))] p-0.5">

        <UserMinus strokeWidth={4} className="h-3 w-3 text-white" />

      </div>

    );

  }

  if (variant === "created_approver" || variant === "added_assistant_approver") {

    return (

      <div className="flex flex-shrink-0 h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-[#1f2b88] p-0.5">

        <UserPlus strokeWidth={2.5} className="h-4 w-4 text-white" />

      </div>

    );

  }

  if (variant === "user_logout") {

    return (

      <div className="flex flex-shrink-0 h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-primary p-0.5">

          <ArrowBigLeft strokeWidth={4} className="h-3 w-3 text-white" />

      </div>

    );

  }

  if (variant === "user_login") {

    return (

      <div className="flex flex-shrink-0 h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-primary p-0.5">

          <ArrowBigRight strokeWidth={4} className="h-3 w-3 text-white" />

      </div>

    );

  }

  if (variant === "exported_clearance_results") {

    return (

      <div className="flex flex-shrink-0 h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-primary p-0.5">

        <Download strokeWidth={4} className="h-3 w-3 text-white" />

      </div>

    );

  }

  if (variant === "set_timeline_status_active" || variant === "set_guideline_status_active" || variant === "set_announcement_status_active") {

    return (

      <div className="flex flex-shrink-0 h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-success p-0.2">
        <Check strokeWidth={4} className="h-3 w-3 text-white transform translate-y-[0.5px]" />
      </div>

    );

  }





  if (variant === "deleted_college" || variant === "deleted_department" || variant === "removed_from_approver_flow" || variant === "removed_faculty_data_dump" || variant === "deleted_requirements" || variant === "deleted_office") {

    return (

      <div className="flex flex-shrink-0 h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-[hsl(var(--destructive))] p-0.5">

        <Trash2 strokeWidth={3} className="h-3 w-3 text-white" />

      </div>

    );

  }



  if (variant === "uploaded_faculty_data_dump") {

    return (

      <div className="flex flex-shrink-0 h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-[#1f2b88] p-0.5">

        <Download strokeWidth={4} className="h-3 w-3 text-white" />

      </div>

    );

  }



  return (

    <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full">

      <img src="/PrimaryCirclePlusIcon.png" className="h-full w-full object-cover" />

    </div>

  );

}







function formatActivityLogText(item: ActivityLogItem) {

  const actorName = [item.actorFirstName, item.actorLastName].filter(Boolean).join(" ").trim();

  const facultyName = [item.facultyFirstName, item.facultyLastName].filter(Boolean).join(" ").trim();

  const facultyCollegeDepartment = [item.facultyCollege, item.facultyDepartment]

    .filter(Boolean)

    .join(" - ")

    .trim();



  const assistantApproverName = [item.assistantApproverFirstName, item.assistantApproverLastName]

    .filter(Boolean)

    .join(" ")

    .trim();



  const userName = actorName || facultyName;

  const requirementTitle = item.requirementTitle?.trim();

  const requirementTail = requirementTitle ? `: ${requirementTitle}` : "";

  const deptOffice = item.approverDepartment?.trim();

  const deptTail = deptOffice ? ` for ${deptOffice}.` : ".";

  const guidelineTitle = item.guidelineTitle?.trim();

  const guidelineTail = guidelineTitle ? `: **${guidelineTitle}**.` : ".";

  const announcementTitle = item.announcementTitle?.trim();

  const schoolYear = item.schoolYear?.trim();

  const semester = item.semester?.trim();

  const collegeName = item.collegeName?.trim();

  const departmentName = item.departmentName?.trim();

  const approverFlowField = item.approverFlowField?.trim();





  if (item.variant === "exported_clearance_results") {

    const title = "Exported Clearance Results";

    const firstName = item.actorFirstName?.trim() || userName;

    const schoolYearTail = schoolYear ? ` for ${schoolYear}` : "";

    const semesterTail = semester ? ` for ${semester}.` : ".";

    const description = `User ${firstName} exported clearance results${schoolYearTail}${semesterTail}`;

    return { title, description };

  }



  if (item.variant === "created_guideline") {

    const title = "Created Guideline";

    const description = `User ${userName} created ${guidelineTail}`;

    return { title, description };

  }



  if (item.variant === "edited_guideline") {

    const title = "Edited Guideline";

    const description = `User ${userName} edited ${guidelineTail}`;

    return { title, description };

  }



  if (item.variant === "enabled_guideline") {

    const title = "Enabled Guideline";

    const description = `User ${userName} enabled ${guidelineTail}`;

    return { title, description };

  }



  if (item.variant === "disabled_guideline") {

    const title = "Disabled Guideline";

    const description = `User ${userName} disabled ${guidelineTail}`;

    return { title, description };

  }



  if (item.variant === "delete_guideline") {

    const title = "Deleted Guideline";

    const description = `User ${userName} deleted ${guidelineTail}`;

    return { title, description };

  }



  if (item.variant === "set_guideline_status_active") {

    const title = "Set Guideline Status to \"Active\"";

    const description = `User ${userName} set ${guidelineTitle || ""} status to Active.`;

    return { title, description };

  }



  if (item.variant === "set_guideline_status_inactive") {

    const title = "Set Guideline Status to \"Inactive\"";

    const description = `User ${userName} set ${guidelineTitle || ""} status to Inactive.`;

    return { title, description };

  }



  if (item.variant === "archived_guideline") {

    const title = "Archived Guideline";

    const description = `User ${userName} archived ${guidelineTail}`;

    return { title, description };

  }



  if (item.variant === "created_announcement") {

    const title = "Created Announcement";

    const description = `User ${userName} created announcement${announcementTitle ? `: ${announcementTitle}.` : "."}`;

    return { title, description };

  }



  if (item.variant === "edited_announcement") {

    const title = "Edited Announcement";

    const description = `User ${userName} edited announcement${announcementTitle ? `: ${announcementTitle}.` : "."}`;

    return { title, description };

  }



  



  if (item.variant === "set_announcement_status_active") {

    const title = "Set Announcement Status to \"Active\"";

    const description = `User ${userName} set announcement, ${announcementTitle || ""} status to Active.`;

    return { title, description };

  }



  if (item.variant === "set_announcement_status_inactive") {

    const title = "Set Announcement Status to \"Inactive\"";

    const description = `User ${userName} set announcement, ${announcementTitle || ""} status to Inactive.`;

    return { title, description };

  }



  if (item.variant === "created_timeline") {

    const title = "Created Timeline";

    const timelineLabel = [schoolYear, semester].filter(Boolean).join(" ").trim();

    const labelTail = timelineLabel ? `: ${timelineLabel}.` : ".";

    const description = `User ${userName} created timeline${labelTail}`;

    return { title, description };

  }



  if (item.variant === "edited_timeline") {

    const title = "Edited Timeline";

    const timelineLabel = [schoolYear, semester].filter(Boolean).join(" ").trim();

    const labelTail = timelineLabel ? `: ${timelineLabel}.` : ".";

    const description = `User ${userName} edited timeline${labelTail}`;

    return { title, description };

  }



  if (item.variant === "set_timeline_status_active") {

    const title = "Set Timeline Status to \"Active\"";

    const timelineLabel = [schoolYear, semester].filter(Boolean).join(" ").trim();

    const labelTail = timelineLabel ? ` ${timelineLabel}` : "";

    const description = `User ${userName} set timeline,${labelTail} status to Active.`;

    return { title, description };

  }



  if (item.variant === "set_timeline_status_inactive") {

    const title = "Set Timeline Status to \"Inactive\"";

    const timelineLabel = [schoolYear, semester].filter(Boolean).join(" ").trim();

    const labelTail = timelineLabel ? ` ${timelineLabel}` : "";

    const description = `User ${userName} set timeline,${labelTail} status to Inactive, clearance timeline is archived.`;

    return { title, description };

  }



  if (item.variant === "created_college") {

    const title = "Created College";

    const collegeTail = collegeName ? `: ${collegeName}.` : ".";

    const description = `User ${userName} created college${collegeTail}`;

    return { title, description };

  }



  if (item.variant === "edited_college") {

    const title = "Edited College";

    const collegeTail = collegeName ? `: ${collegeName}.` : ".";

    const description = `User ${userName} edited college${collegeTail}`;

    return { title, description };

  }



  if (item.variant === "deleted_college") {

    const title = "Deleted College";
    const collegeTail = collegeName ? `: ${collegeName}.` : ".";
    const description = `User ${userName} deleted college${collegeTail}`;
    return { title, description };

  }



  if (item.variant === "created_department") {

    const title = "Created Department";

    const deptTail = departmentName ? `: ${departmentName}` : "";

    const collegeTail = collegeName ? ` for ${collegeName}.` : ".";

    const description = `User ${userName} created department${deptTail}${collegeTail}`;

    return { title, description };

  }



  if (item.variant === "edited_department") {

    const title = "Edited Department";

    const deptTail = departmentName ? `: ${departmentName}` : "";

    const collegeTail = collegeName ? ` for ${collegeName}.` : ".";

    const description = `User ${userName} edited department${deptTail}${collegeTail}`;

    return { title, description };

  }



  if (item.variant === "deleted_department") {

    const title = "Deleted Department";

    const deptTail = departmentName ? `: ${departmentName}` : "";

    const collegeTail = collegeName ? ` for ${collegeName}.` : ".";

    const description = `User ${userName} deleted department${deptTail}${collegeTail}`;

    return { title, description };

  }



  if (item.variant === "user_logout") {
    const title = "User Logout";
    const firstName = item.actorFirstName?.trim() || userName;
    const roleTail = item.actorRole?.trim() ? ` as ${item.actorRole.trim()}` : "";
    const inTail = deptOffice ? ` in ${deptOffice}.` : ".";
    const description = `User ${firstName} logged out${roleTail}${inTail}`;
    return { title, description };
  }

  if (item.variant === "user_login") {
    const title = "User Login";
    const firstName = item.actorFirstName?.trim() || userName;
    const roleTail = item.actorRole?.trim() ? ` as ${item.actorRole.trim()}` : "";
    const inTail = deptOffice ? ` in ${deptOffice}.` : ".";
    const description = `User ${firstName} logged in${roleTail}${inTail}`;
    return { title, description };
  }



  if (item.variant === "updated_assistant_approver" ) {

    const title = "Updated Assistant Approver";

    const assistantTail = assistantApproverName ? ` ${assistantApproverName}` : "";

    const description = `User ${userName} updated assistant approver${assistantTail}${deptTail}`;

    return { title, description };

  }



  if (item.variant === "removed_assistant_approver") {

    const title = "Removed Assistant Approver";

    const assistantTail = assistantApproverName ? ` ${assistantApproverName}` : "";

    const description = `User ${userName} removed assistant approver${assistantTail}${deptTail}`;

    return { title, description };

  }



  if (item.variant === "added_assistant_approver") {

    const title = "Added Assistant Approver";

    const assistantTail = assistantApproverName ? ` ${assistantApproverName}` : "";

    const description = `User ${userName} created assistant approver${assistantTail}${deptTail}`;

    return { title, description };

  }



  if (item.variant === "deleted_requirements") {

    const title = "Deleted Requirements";

    const description = `User ${userName} deleted requirement${requirementTail}${deptTail}`;

    return { title, description };

  }



  if (item.variant === "created_requirements") {

    const title = "Created Requirements";

    const description = `User ${userName} created requirement${requirementTail}${deptTail}`;

    return { title, description };

  }



  if (item.variant === "edited_requirements") {

    const title = "Edited Requirements";

    const description = `User ${userName} edited requirement${requirementTail}${deptTail}`;

    return { title, description };

  }



  if (item.variant === "create_request") {

    const title = "Create Request";

    const description = `Faculty Member ${facultyName || actorName} from ${facultyCollegeDepartment}, requested for clearance.`;

    return { title, description };

  }



  if (item.variant === "approved_clearance") {

    const title = "Approved Clearance";

    const description = `User ${actorName} of Department/Office ${item.approverDepartment || ""}, approved clearance for faculty member ${facultyName}.`;

    return { title, description };

  }

  return {
    title: item.title ?? String(item.variant ?? ""),
    description: item.description ?? "",
  };

}

export function ActivityLogsCard({ items, className }: ActivityLogsCardProps): React.ReactElement {
  const parseDateParts = React.useCallback((dateLabel: string) => {
    const today = new Date();

    const shortMonths = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

    if (dateLabel === "Today") {
      return {
        year: String(today.getFullYear()),
        monthIndex: today.getMonth(),
        monthShort: shortMonths[today.getMonth()],
        day: String(today.getDate()).padStart(2, "0"),
        key: `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`,
      };
    }

    const mmddyyyy = /^\d{2}\/\d{2}\/\d{4}$/.test(dateLabel);
    if (mmddyyyy) {
      const [mm, dd, yyyy] = dateLabel.split("/");
      const monthIndex = Math.max(0, Math.min(11, Number(mm) - 1));
      const dayNum = Number(dd);
      return {
        year: yyyy,
        monthIndex,
        monthShort: shortMonths[monthIndex],
        day: String(dayNum).padStart(2, "0"),
        key: `${yyyy}-${monthIndex}-${dayNum}`,
      };
    }

    return {
      year: "",
      monthIndex: 0,
      monthShort: "",
      day: "",
      key: dateLabel,
    };
  }, []);

  const getItemTimestamp = React.useCallback(
    (item: ActivityLogItem): number => {
      try {
        const createdAt = String((item as any).created_at ?? "").trim();
        if (createdAt) {
          const ms = Date.parse(createdAt);
          if (!Number.isNaN(ms)) return ms;
        }
      } catch {
      }

      try {
        const d = parseDateParts(item.dateLabel);
        const yearNum = Number(d.year);
        if (!yearNum) return 0;

        let hour = 0;
        let minute = 0;
        const t = (item.timeLabel || "").trim();
        if (t) {
          const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
          if (m) {
            hour = Number(m[1]);
            minute = Number(m[2]);
            const ampm = (m[3] || "").toUpperCase();
            if (ampm === "PM" && hour < 12) hour += 12;
            if (ampm === "AM" && hour === 12) hour = 0;
          }
        }

        return new Date(yearNum, d.monthIndex, Number(d.day) || 1, hour, minute).getTime();
      } catch {
        return 0;
      }
    },
    [parseDateParts]
  );

  const normalizedItems = React.useMemo(() => {
    return (items ?? []).map((it) => {
      const evt = String((it as any).event_type ?? "").trim();
      if (evt === "created_guideline") {
        return { ...it, variant: "created_guideline" as any };
      }

      if (it.variant) return it;
      if (!evt) return it;
      return { ...it, variant: evt as any };
    });
  }, [items]);

  const yearGroups = React.useMemo(() => {
    const yearMap: Map<string, Map<string, {
      key: string;
      year: string;
      monthShort: string;
      day: string;
      items: ActivityLogItem[];
      sortKey: number;
    }>> = new Map();

    for (const item of normalizedItems) {
      const ts = getItemTimestamp(item);
      const dateObj = ts ? new Date(ts) : null;

      const parsed = parseDateParts(item.dateLabel);
      const year = dateObj ? String(dateObj.getFullYear()) : parsed.year || "";
      const monthShort = dateObj
        ? ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][dateObj.getMonth()]
        : parsed.monthShort;
      const day = dateObj ? String(dateObj.getDate()).padStart(2, "0") : parsed.day;
      const monthIndex = dateObj ? dateObj.getMonth() : parsed.monthIndex || 0;

      const dateKey = dateObj ? `${year}-${monthIndex}-${dateObj.getDate()}` : parsed.key;
      const sortKey = ts || 0;

      let datesMap = yearMap.get(year);
      if (!datesMap) {
        datesMap = new Map();
        yearMap.set(year, datesMap);
      }

      let d = datesMap.get(dateKey);
      if (!d) {
        d = {
          key: dateKey,
          year,
          monthShort,
          day,
          items: [item],
          sortKey,
        };
        datesMap.set(dateKey, d);
      } else {
        d.items.push(item);
        if (sortKey > d.sortKey) d.sortKey = sortKey;
      }
    }

    const yearEntries = Array.from(yearMap.entries()).sort((a, b) => {
      const an = Number(a[0]) || 0;
      const bn = Number(b[0]) || 0;
      return bn - an;
    });

    return yearEntries.map(([year, datesMap]) => {
      const dates = Array.from(datesMap.values())
        .sort((a, b) => b.sortKey - a.sortKey)
        .map(({ sortKey, ...rest }) => rest);
      return { year, dates };
    });
  }, [getItemTimestamp, normalizedItems, parseDateParts]);

  return (
    <div className={cn("space-y-6", className)}>

      {yearGroups.map((yearGroup) => (

        <div key={yearGroup.year || "no-year"} className="space-y-4">

          <div className="flex items-center gap-4">

            <div className="flex items-center gap-2">

              <div className="h-2 w-2 rounded-full bg-red-500" />

              <div className="text-xl font-bold tracking-wide text-gray-900">

                YEAR {yearGroup.year}

              </div>

            </div>

            <div className="h-[2px] flex-1 bg-[hsl(var(--gray-border))]" />

          </div>



          <div className="space-y-6">

            {yearGroup.dates.map((dateGroup) => (

              <div key={dateGroup.key} className="grid grid-cols-[60px_1fr] gap-0">

                <div className="-ml-4 flex flex-col items-center">

                  <div className="w-full text-center text-lg font-bold text-primary">

                    {dateGroup.monthShort}

                  </div>



                  <div className="mt-1 flex flex-1 flex-col items-center">

                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">

                      {dateGroup.day}

                    </div>

                    <div className="w-1 flex-1 rounded-full bg-primary" />

                  </div>

                </div>



                <div className="ml-1 space-y-5">

                  {dateGroup.items.map((item) => (

                    <div

                      key={item.id}

                      className="rounded-lg bg-background p-5 shadow-[0_4px_12px_rgba(0,0,0,0.12)]"

                    >

                      {(() => {

                        const autoText = formatActivityLogText(item);

                        const title = item.title ?? autoText.title;

                        const description = item.description ?? autoText.description;

                        return (

                          <>

                            <div className="flex items-start justify-between">

                              <div className="flex items-start gap-2">

                                {getActivityIcon(item.variant)}

                                <div className="text-xl font-bold text-primary">{title}</div>

                              </div>



                              <div className="whitespace-nowrap text-sm italic text-muted-foreground">

                                {item.timeLabel}

                              </div>

                            </div>



                            <div 

                              className="mt-2 text-md text-gray-900 text-justify"

                              dangerouslySetInnerHTML={{ __html: description }}

                            />

                          </>

                        );

                      })()}

                    </div>

                  ))}

                </div>

              </div>

            ))}

          </div>

        </div>

      ))}

    </div>

  );

}







export type ApprovedCardProps = {

  headerTitle?: string;

  title?: string;

  description?: string;

  note?: string;

  className?: string;

};



export function ApprovedCard({

  headerTitle = "Clearance Approved",

  title = "Congratulations!",

  description =

    "Your clearance has been fully approved. Kindly wait as the HRO is processing your payroll.",

  note =

    "Note: If you teach in the Basic Education Unit, please settle all obligations at that level to avoid delays.",

  className,

}: ApprovedCardProps) {

  return (

    <Card className={cn("overflow-hidden", className)}>

      <CardHeader className="bg-primary text-primary-foreground text-center py-5">

        <CardTitle className="text-base font-bold">{headerTitle}</CardTitle>

      </CardHeader>



      <CardContent className="px-6 py-6 text-center">

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-success text-success">

          <Check className="h-8 w-8" />

        </div>



        <div className="mt-4 text-lg font-bold text-gray-900">{title}</div>

        <div className="mt-2 text-sm text-muted-foreground">{description}</div>



        <div className="mt-6 text-xs font-semibold text-gray-900">{note}</div>

      </CardContent>

    </Card>

  );

}





export type AcademicDetailsRow = {

  label: string;

  value: string;

};



export type AcademicDetailsCardProps = {

  topLeft?: AcademicDetailsRow;

  topRight?: AcademicDetailsRow;

  rows: AcademicDetailsRow[];

  className?: string;

};



export type WelcomeAcademicCardProps = {

  name: string;
  topLeft: AcademicDetailsRow;
  topRight: AcademicDetailsRow;
  rows?: AcademicDetailsRow[];
  afterRows?: React.ReactNode;
  className?: string;

};



export type ApproverWelcomeMetricsProps = {

  pendingClearance: number;
  totalClearanceRequests: number;
  className?: string;

};



export function ApproverWelcomeMetrics({

  pendingClearance,
  totalClearanceRequests,
  className,

}: ApproverWelcomeMetricsProps) {

  return (

    <div
      className={cn(
        "grid grid-cols-2 gap-3",
        className
      )}
    >
      <Card className="overflow-hidden">
        <CardContent className="flex items-center justify-between p-4">
          <div className="text-4xl font-bold leading-none text-primary">{pendingClearance}</div>
          <div className="text-right text-sm font-bold leading-tight text-primary">
            Pending
            <br />
            Clearance
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="flex items-center justify-between p-4">
          <div className="text-4xl font-bold leading-none text-primary">{totalClearanceRequests}</div>
          <div className="text-right text-sm font-bold leading-tight text-primary">
            Clearance
            <br />
            Requests
          </div>
        </CardContent>
      </Card>
    </div>
  );

}







export function WelcomeAcademicCard({
  name,
  topLeft,
  topRight,
  rows = [],
  afterRows,
  className,

}: WelcomeAcademicCardProps) {

  return (

    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="bg-primary text-primary-foreground text-center py-2.5">
        <CardDescription className="text-base leading-none text-primary-foreground/80">
          Welcome
        </CardDescription>
        <CardTitle className="text-xl font-bold leading-tight">{name}!</CardTitle>
      </CardHeader>

      <CardContent className="pt-4 pb-1">
        <div
          className={cn(
            "-mx-6 flex items-center justify-center gap-1.5 px-6 pb-3",
            rows.length
              ? "border-b border-[hsl(var(--gray-border))] shadow-[0_2px_2px_-2px_rgba(0,0,0,0.25)]"
              : ""
          )}
        >
          <div className="flex items-baseline gap-3">
            <div className="text-sm font-bold text-primary">{topLeft.label}</div>
            <div className="text-sm font-medium text-primary">{topLeft.value}</div>
          </div>

          <div className="flex items-baseline gap-3">
            <div className="text-sm font-bold text-primary">{topRight.label}</div>
            <div className="text-sm font-medium text-primary">{topRight.value}</div>
          </div>

        </div>

        {rows.length ? (
          <div className="-mx-6 px-6 py-3 flex justify-center">
            <div className="grid grid-cols-[auto,1fr] items-baseline gap-x-6 gap-y-2 justify-center">
              {rows.map((row) => (
                <React.Fragment key={row.label}>
                  <div className="text-sm font-bold text-primary">{row.label}</div>
                  <div className="text-sm font-medium text-primary whitespace-normal break-words">{row.value}</div>
                </React.Fragment>
              ))}
            </div>
          </div>
        ) : null}

        {afterRows ? <div className="mt-4">{afterRows}</div> : null}
      </CardContent>
    </Card>
  );
}




export function AcademicDetailsCard({ topLeft, topRight, rows, className }: AcademicDetailsCardProps) {

  return (

    <Card className={cn("border-0 shadow-none", className)}>

      <CardContent className="pt-6">

        {topLeft && topRight ? (

          <div

            className={cn(

              "-mx-6 flex items-center justify-center gap-3 px-6 pb-3",

              rows.length

                ? "border-b border-[hsl(var(--gray-border))] shadow-[0_2px_2px_-2px_rgba(0,0,0,0.25)]"

                : ""

            )}

          >

            <div className="flex items-baseline gap-3">

              <div className="text-sm font-bold text-primary">{topLeft.label}</div>

              <div className="text-sm font-medium text-primary">{topLeft.value}</div>

            </div>

            <div className="flex items-baseline gap-3">

              <div className="text-sm font-bold text-primary">{topRight.label}</div>

              <div className="text-sm font-medium text-primary">{topRight.value}</div>

            </div>

          </div>

        ) : null}



        <div className={cn("grid grid-cols-2 gap-x-4 gap-y-2", topLeft && topRight ? "mt-4" : "")}

        >

          {rows.map((row) => (

            <React.Fragment key={row.label}>

              <div className="text-sm font-bold text-primary">{row.label}</div>

              <div className="text-sm font-medium text-primary">{row.value}</div>

            </React.Fragment>

          ))}

        </div>

      </CardContent>

    </Card>

  );

}



export type ClearanceStatusCardProps = {
  statusLabel: string;
  statusVariant?: DashboardBadgeVariant;
  className?: string;
};



export function ClearanceStatusCard({
  statusLabel,
  statusVariant = "warning",
  className,

}: ClearanceStatusCardProps) {

  return (
    <Card className={cn("bg-foregroundLight", className)}>
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-gray-900">Clearance Status</div>
          <Badge variant={getBadgeVariant(statusVariant)}>{statusLabel}</Badge>
        </div>
      </CardContent>
    </Card>
  );
};




export type ClearanceProgressCardProps = {

  label?: string;
  value: number;
  current?: number;
  total?: number;
  className?: string;

};



export function ClearanceProgressCard({

  label = "Clearance Progress Bar",
  value,
  current,
  total,
  className,

}: ClearanceProgressCardProps) {

  const computed =
    typeof current === "number" && typeof total === "number" && total > 0
      ? (current / total) * 100
      : value;

  const clamped = Math.max(0, Math.min(100, computed));

  return (
    <Card className={className}>
      <CardContent className="py-5">
        <div className="flex items-center justify-between">
          <div className="text-base font-bold text-gray-900">{label}</div>
          {typeof current === "number" && typeof total === "number" ? (
            <div className="text-sm font-semibold text-muted-foreground">
              {current}/{total}
            </div>
          ) : null}
        </div>
        <div className="mt-3 h-2 w-full rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-success"
            style={{ width: `${clamped}%` }}
          />
        </div>
      </CardContent>
    </Card>

  );
};




export type ClearanceStepCardProps = {

  index: number;
  title: string;
  statusLabel?: string;
  statusVariant?: DashboardBadgeVariant;
  rightIcon?: React.ReactNode;
  className?: string;
  onClick?: () => void;

};



export type ClearanceRequirementItem = {
  id: string;
  title: string;
  description: string;
  completed?: boolean;
  submitted?: boolean;
  requestId?: string;
  status?: string;
  submissionNotes?: string;
  required_physical?: boolean;
  rejected?: boolean;
  remarks?: string;
};



export type ExpandableClearanceStepCardProps = {

  index: number;
  title: string;
  statusLabel?: string;
  statusVariant?: DashboardBadgeVariant;
  expanded: boolean;
  onToggle: () => void;
  collapsedType?: "status" | "dropdownOnly" | "locked";
  submittedTo?: string;
  submittedOn?: string;
  requirements?: ClearanceRequirementItem[];
  className?: string;

};



export function ExpandableClearanceStepCard({

  index,
  title,
  statusLabel,
  statusVariant = "warning",
  expanded,
  onToggle,
  collapsedType = "status",
  submittedTo,
  submittedOn,
  requirements = [],
  className,

}: ExpandableClearanceStepCardProps) {

  // Initialize state with existing submitted requirements
  React.useEffect(() => {
    const initialComments: Record<string, string> = {};
    const initialCheckboxes: Record<string, boolean> = {};
    
    requirements.forEach((req) => {
      if (req.submitted && req.requestId && !req.rejected) {
        // This requirement was already submitted and not rejected
        initialCheckboxes[req.title] = true;
        // Use the actual submission notes from the API
        initialComments[req.title] = req.submissionNotes || "Submitted via clearance system";
      } else if (req.completed) {
        // This requirement was approved
        initialCheckboxes[req.title] = true;
        initialComments[req.title] = req.submissionNotes || "Approved";
      } else if (req.rejected) {
        // This requirement was rejected - allow resubmission
        initialCheckboxes[req.title] = false;
        initialComments[req.title] = ""; // Clear previous submission notes
      }
    });
    
    setSavedComments(initialComments);
    setCheckboxStates(initialCheckboxes);
  }, [requirements]);

  const [savedComments, setSavedComments] = React.useState<Record<string, string>>({});
  const [checkboxStates, setCheckboxStates] = React.useState<Record<string, boolean>>({});
  const [showCommentDialog, setShowCommentDialog] = React.useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = React.useState<string | null>(null);
  const [pendingComment, setPendingComment] = React.useState<string>("");

  const isLocked = collapsedType === "locked";
  const effectiveExpanded = expanded && !isLocked;
  const showBadge = collapsedType === "status" && !!statusLabel;
  const showArrow = collapsedType !== "locked";

  return (

    <Card className={cn("overflow-hidden border-muted-foreground/20 shadow-sm", className)}>
      <button
        type="button"
        className={cn(
          "flex w-full items-center justify-between px-6 py-4 text-left",
          effectiveExpanded ? "bg-primary" : "bg-transparent",
          isLocked ? "cursor-not-allowed" : ""
        )}

        onClick={isLocked ? undefined : onToggle}
        disabled={isLocked}

      >

        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
              effectiveExpanded
                ? "bg-primary-foreground text-primary"
                : "bg-primary text-primary-foreground"

            )}
          >
            {index}

          </div>

          <div
            className={cn(
              "text-sm font-bold",
              effectiveExpanded ? "text-primary-foreground" : "text-primary"
            )}
          >
            {title}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {showBadge ? (
            <Badge variant={getBadgeVariant(statusVariant)}>{statusLabel}</Badge>
          ) : null}

          {showArrow ? (
            <img
              src="/PrimaryArrowIcon.png"
              alt={effectiveExpanded ? "Collapse" : "Expand"}
              className={cn(
                "h-7 w-7 object-contain transition-transform",
                effectiveExpanded ? "rotate-180 brightness-0 invert" : "rotate-0"
              )}
            />

          ) : (
            <img
              src="/PrimaryLockIcon.png"
              alt="Locked"
              className="h-5 w-5 object-contain"
            />
          )}
        </div>
      </button>



      {effectiveExpanded ? (

        <CardContent className="p-6 pt-4">
          <div className="space-y-5">
            <div>
              <div className="text-sm font-bold text-gray-900">Status</div>
              {submittedTo ? (
                <div className="mt-2 text-sm text-gray-900">Submitted to: {submittedTo}</div>
              ) : null}
              {submittedOn ? (
                <div className="mt-1 text-sm text-gray-900">Submitted on: {submittedOn}</div>
              ) : null}
            </div>

            <div>
              <div className="text-sm font-bold text-gray-900">Requirements Checklist</div>
              <div className="mt-3 space-y-3">
                {requirements.map((req) => (
                  (() => {
                    const savedComment = savedComments[req.title]?.trim() ?? "";
                    const hasSavedComment = savedComment.length > 0;

                    return (
                  <div
                    key={req.title}
                    className={cn(
                      "flex gap-4 rounded-md px-4 py-4",
                      req.completed ? "bg-green-50 border border-green-200" : "bg-foregroundLight"
                    )}
                  >
                    <div className="mt-1">
                      <Checkbox 
                        variant="success" 
                        checked={checkboxStates[req.title] || req.completed || false}
                        onCheckedChange={(checked) => {
                          const isSubmitted = req.submitted || req.completed;
                          
                          // Prevent unchecking if already submitted or approved
                          if (!checked && isSubmitted) {
                            return;
                          }
                          
                          if (checked && !savedComments[req.title]) {
                            // Show comment dialog for new submissions
                            setShowCommentDialog(req.title);
                          } else if (!checked) {
                            // Allow unchecking only if not submitted
                            setCheckboxStates(prev => ({ ...prev, [req.title]: false }));
                          }
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-bold text-gray-900">{req.title}</div>
                        {req.required_physical && (
                          <Badge variant="secondary" className="text-xs">
                            Physical Submission
                          </Badge>
                        )}
                        {req.completed && (
                          <Badge variant="success" className="text-xs">
                            APPROVED
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-gray-900 whitespace-pre-line">{req.description}</div>
                      {hasSavedComment && !req.rejected ? (
                        <div className="bg-white p-4 border border-black rounded-md mt-3">
                          {savedComment}
                        </div>
                      ) : null}
                    </div>
                  </div>
                    );
                  })()
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      ) : null}

      {/* Comment Dialog for checkbox submission */}
      {showCommentDialog && (
        <CommentDialog
          open={true}
          onOpenChange={(open) => !open && setShowCommentDialog(null)}
          title={showCommentDialog}
          placeholder="Enter your submission message for this requirement..."
          initialValue=""
          onSubmit={(comment) => {
            setPendingComment(comment.trim());
            setShowCommentDialog(null);
            setShowConfirmDialog(showCommentDialog);
          }}
        />
      )}
      
      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <AlertDialog open={true} onOpenChange={(open) => !open && setShowConfirmDialog(null)}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Submission</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to SUBMIT '{showConfirmDialog}'. Do you wish to continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowConfirmDialog(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  // Make API call to submit ClearanceRequest first
                  try {
                    const response = await fetch('/admin/xu-faculty-clearance/api/faculty/submit-requirement', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.getAttribute('value') || ''
                      },
                      body: JSON.stringify({
                        requirementTitle: showConfirmDialog,
                        comment: pendingComment
                      })
                    });
                    
                    if (!response.ok) {
                      const errorData = await response.json();
                      console.error('Failed to submit requirement:', errorData.detail || 'Unknown error');
                      alert(`Failed to submit: ${errorData.detail || 'Unknown error'}`);
                      // Don't update state if submission failed
                      setShowConfirmDialog(null);
                      setPendingComment("");
                    } else {
                      const result = await response.json();
                      console.log('Requirement submitted successfully:', result);
                      // Only update state after successful submission
                      setSavedComments(prev => ({ ...prev, [showConfirmDialog]: pendingComment }));
                      setCheckboxStates(prev => ({ ...prev, [showConfirmDialog]: true }));
                      setShowConfirmDialog(null);
                      setPendingComment("");
                      // Show success message with request ID
                      alert(`Requirement submitted successfully!\nRequest ID: ${result.requestId}`);
                      // Optionally refresh the page to get updated state
                      window.location.reload();
                    }
                  } catch (error) {
                    console.error('Error submitting requirement:', error);
                    alert('Error submitting requirement. Please try again.');
                    // Don't update state if submission failed
                    setShowConfirmDialog(null);
                    setPendingComment("");
                  }
                }}
              >
                Submit
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Card>
  );
}


export function ClearanceStepCard({
  index,

  title,

  statusLabel,

  statusVariant = "muted",

  rightIcon,

  className,

  onClick,

}: ClearanceStepCardProps) {

  const effectiveRightIcon =

    rightIcon ?? (

      <img

        src="/PrimaryArrowIcon.png"

        alt="Open"

        className="h-7 w-7 object-contain"

      />

    );



  return (

    <Card

      className={cn(

        "border-muted-foreground/20 shadow-sm",

        onClick ? "cursor-pointer" : "",

        className

      )}

      onClick={onClick}

    >

      <CardContent className="flex items-center justify-between px-6 py-4">

        <div className="flex items-center gap-3">

          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">

            {index}

          </div>

          <div className="text-sm font-bold text-primary">{title}</div>

        </div>



        <div className="flex items-center gap-3">

          {statusLabel ? (

            <Badge variant={getBadgeVariant(statusVariant)}>{statusLabel}</Badge>

          ) : null}

          {effectiveRightIcon}

        </div>

      </CardContent>

    </Card>

  );

}



export type SystemGuidlinesItem = {

  title: string;

  description: (string | { text: string; subitems?: string[] })[] | string;

  email: string;

  created_by: string;

  timestamp: string;

  enabled?: boolean;

};



export type SystemGuidlinesCardProps = {

  items: SystemGuidlinesItem[];

  className?: string;

  onClose?: () => void;

  headerActionHref?: string;

  headerActionImgSrc?: string;

  headerActionImgAlt?: string;

  headerActionOnClick?: () => void;

  onViewItem?: (item: SystemGuidlinesItem) => void;

  onAddRequirement?: () => void;

  addDisabled?: boolean;

  cardName?: string;

};



export interface SectionListCardProps {

  title: string;

  className?: string;

  onClose?: () => void;

  headerActionHref?: string;

  headerActionImgSrc?: string;

  headerActionImgAlt?: string;

  headerActionOnClick?: () => void;

  headerActions?: React.ReactNode;

  children: React.ReactNode;

}



export function SectionListCard(props: SectionListCardProps) {

  const {

    title,

    className,

    onClose,

    headerActionHref,

    headerActionImgSrc,

    headerActionImgAlt = "Open",

    headerActionOnClick,

    headerActions,

    children,

  } = props;



  const headerAction = headerActionHref && headerActionImgSrc ? (

    <Button

      asChild

      variant="icon"

      size="icon"

      className="absolute right-3 top-[40%] -translate-y-1/2 text-primary-foreground"

    >

      <Link to={headerActionHref}>

        <img

          src={headerActionImgSrc}

          alt={headerActionImgAlt}

          className="h-6 w-6 object-contain"

        />

      </Link>

    </Button>

  ) : headerActionOnClick && headerActionImgSrc ? (

    <Button

      type="button"

      variant="icon"

      size="icon"

      className="absolute right-3 top-[40%] -translate-y-1/2 text-primary-foreground"

      onClick={headerActionOnClick}

    >

      <img

        src={headerActionImgSrc}

        alt={headerActionImgAlt}

        className="h-6 w-6 object-contain"

      />

    </Button>

  ) : onClose ? (

    <Button

      type="button"

      variant="icon"

      size="icon"

      className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-foreground"

      onClick={onClose}

    >

      <X className="h-5 w-5" />

    </Button>

  ) : null;



  return (

    <Card className={cn("overflow-hidden", className)}>

      <CardHeader className="relative bg-primary py-3">

        <CardTitle className="text-center text-base font-bold text-primary-foreground">

          {title}

        </CardTitle>

        {headerActions ? (

          <div className="absolute right-3 top-[40%] -translate-y-1/2">{headerActions}</div>

        ) : (

          headerAction

        )}

      </CardHeader>

      <CardContent className="p-0">{children}</CardContent>

    </Card>

  );
}

export interface FacultyDataDumpCardProps {
  title?: string;
  className?: string;
  onFileSelected?: (file: File) => void;
  selectedFile?: File | null;
  uploadStatus?: "idle" | "uploading" | "success" | "error";
  uploadProgress?: number;
  uploadStatusText?: string;
  onCancelUpload?: () => void;
  onRemoveFile?: () => void;
  onActivate?: () => void;
  activateDisabled?: boolean;
  onDownloadTemplate?: () => void;
  maxSizeLabel?: string;
  accept?: string;
  semesters?: { id: string; label: string }[];
  selectedSemesterId?: string;
  onSemesterChange?: (id: string) => void;
}

export function FacultyDataDumpCard({
  title = "Upload Faculty Data",
  className,
  onFileSelected,
  selectedFile,
  uploadStatus = "idle",
  uploadProgress = 0,
  uploadStatusText,
  onCancelUpload,
  onRemoveFile,
  onActivate,
  activateDisabled = false,
  onDownloadTemplate,
  maxSizeLabel = "Max size 50 MB",
  accept = ".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  semesters,
  selectedSemesterId,
  onSemesterChange,
}: FacultyDataDumpCardProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [internalSemesterId, setInternalSemesterId] = React.useState("");
  const [internalFile, setInternalFile] = React.useState<File | null>(null);
  const currentSemesterId = selectedSemesterId ?? internalSemesterId;
  const currentFile = selectedFile ?? internalFile;

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setInternalFile(file);
    onFileSelected?.(file);
  }

  const prettyBytes = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const val = bytes / Math.pow(1024, idx);
    return `${val.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
  };

  const statusLabel = (() => {
    if (uploadStatusText?.trim()) return uploadStatusText.trim();
    if (uploadStatus === "uploading") return "Uploading...";
    if (uploadStatus === "success") return "Upload complete.";
    if (uploadStatus === "error") return "Upload failed.";
    return "";
  })();

  return (
    <Card className={cn("overflow-hidden border-muted-foreground/20", className)}>
      <CardContent className="p-6">
        <div className="text-center text-base font-bold text-gray-900">{title}</div>
        <div className="mt-4">
          <Select
            value={currentSemesterId}
            onValueChange={(val) => {
              setInternalSemesterId(val);
              onSemesterChange?.(val);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Semester" />
            </SelectTrigger>
            <SelectContent>
              {(semesters ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div
          className={cn(
            "mt-4 rounded-md border-2 border-dashed border-muted-foreground/40 bg-muted/30",
            currentFile ? "p-4" : "p-8"
          )}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
        >
          {currentFile ? (
            <div className="w-full">
              <div className="flex items-center gap-3 rounded-md border border-muted-foreground/20 bg-background p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Upload className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-gray-900">{currentFile.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {prettyBytes(currentFile.size)}{statusLabel ? ` • ${statusLabel}` : ""}
                  </div>
                  {uploadStatus === "uploading" ? (
                    <div className="mt-2 h-2 w-full overflow-hidden rounded bg-muted">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.max(0, Math.min(100, uploadProgress))}%` }}
                      />
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {uploadStatus === "uploading" ? (
                    <Button type="button" variant="icon" size="icon" onClick={onCancelUpload}>
                      <X className="h-4 w-4" />
                    </Button>
                  ) : uploadStatus === "success" ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success">
                      <Check className="h-4 w-4 text-white" strokeWidth={4} />
                    </div>
                  ) : (
                    <Button type="button" variant="icon" size="icon" onClick={onRemoveFile}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                {uploadStatus === "uploading" ? (
                  <Button type="button" variant="secondary" disabled className="col-span-2 h-10 w-full rounded-md">
                    Cancel
                  </Button>
                ) : uploadStatus === "success" ? (
                  <>
                    <Button
                      type="button"
                      className="h-10 w-full rounded-md bg-destructive font-bold text-destructive-foreground hover:bg-destructive/90"
                      onClick={onRemoveFile}
                    >
                      Remove File
                    </Button>
                    <Button
                      type="button"
                      className="h-10 w-full rounded-md bg-primary font-bold text-primary-foreground hover:bg-primary/90"
                      onClick={onActivate}
                      disabled={activateDisabled || !onActivate}
                    >
                      Activate
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    className="col-span-2 h-10 w-full rounded-md"
                    onClick={() => inputRef.current?.click()}
                  >
                    Choose another file
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="mx-auto flex w-full flex-col items-center justify-center gap-3"
              onClick={() => inputRef.current?.click()}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-md text-muted-foreground">
                <Upload className="h-10 w-10" />
              </div>
              <div className="text-md text-muted-foreground">
                {" "}
                <span className="font-bold">Click to upload </span> or drag and drop
              </div>
              <div className="text-xs text-muted-foreground">CSV or Excel files ({maxSizeLabel})</div>
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        <div className="mt-5 rounded-md bg-primary/10 p-4">
          <div className="text-lg font-bold text-primary">Need a template?</div>
          <div className="mt-1 mt-2 text-sm  text-muted-foreground">

            Download our CSV template to ensure your student data is formatted correctly

          </div>



          <div className="mt-4">

            <Button

              type="button"

              className="h-10 rounded-md bg-primary px-4 

              font-bold text-primary-foreground hover:bg-primary/90"

              onClick={onDownloadTemplate}

            >

              <div className="flex items-center gap-2 text-sm font-bold">

                <img src="/WhiteDownloadIcon.png" alt="Download" className="h-6 w-6 object-contain" />

                Download Template

              </div>

            </Button>

          </div>

        </div>



        <div className="mt-4 rounded-md bg-yellow-100 p-4">

          <div className="text-md font-bold text-yellow-900">Important Information</div>

          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm  text-yellow-900">

            <li>All imported users will be automatically assigned the faculty member role</li>

            <li>Faculty Members will automatically be assigned to the active school year and semester</li>

          </ul>

        </div>
      </CardContent>

    </Card>

  );

}

export type ArchivedClearanceCardProps = {
  className?: string;
  title?: string;
  AcademicYear?: string;
  Semester?: string;
  ClearancePeriod?: string;
  LastUpdate?: string;
  Archived?: string;
  description?: string;
  buttonText?: string;
  onButtonClick?: () => void;
  buttonVariant?: "default" | "back" | "action";
  iconSrc?: string;
  iconAlt?: string;
  onIconClick?: () => void;
  iconClassName?: string;
};

export function ArchivedClearanceCard({
  className,
  title = "Archived Clearance",
  AcademicYear = "2025 - 2026",
  Semester = "1",
  ClearancePeriod = "11/22/2025 - 11/23/2025",
  LastUpdate = "November 1, 2025, 04:02 PM",
  Archived = "November 1, 2025, 04:02 PM",
  iconSrc = "/BlackChevronIcon.png",
  iconAlt = "Archive",
  onIconClick,
  iconClassName = "ml-4",
}: ArchivedClearanceCardProps) {
  return (
    <Card className={cn("overflow-hidden border-muted-foreground/20", className)}>
        <div className="text-center text-xl font-bold text-gray-900 flex items-center justify-between p-6">
          <div>{title}</div>
          <Button variant="icon" className={iconClassName} size="icon" onClick={onIconClick}>
            <img src={iconSrc} alt={iconAlt} className="h-6 w-6" />
          </Button>
        </div>
        
        <Divider className="bg-foreground " />
        
        <div className=" p-6">
        <div className="grid grid-cols-2 gap-2">
          <div className="text-md font-bold text-gray-900">Academic Year</div>
          <div className="text-sm text-gray-900 text-left break-words">{AcademicYear}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="text-md font-bold text-gray-900">Clearance Period</div>
          <div className="text-sm text-gray-900 text-left break-words">{ClearancePeriod}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="text-md font-bold text-gray-900">Semester</div>
          <div className="text-sm text-gray-900 text-left break-words">{Semester}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="text-md font-bold text-gray-900">Last Update</div>
          <div className="text-sm text-gray-900 text-left break-words">{LastUpdate}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="text-md font-bold text-gray-900">Archived</div>
          <div className="text-sm text-gray-900 text-left break-words">{Archived}</div>
        </div>
      </div>
      </Card>
    );
  }

export type ViewArchivedClearanceWithStatusCardProps  = {
 className?: string;
  title?: string;
  AcademicYear?: string;
  Semester?: string;
  ClearancePeriod?: string;
  LastUpdate?: string;
  Archived?: string;
  status?: "complete" | "incomplete";
  description?: string;
  buttonText?: string;
  FacultyCSVDump?:string;
  Size?:string;
  onButtonClick?: () => void;
  buttonVariant?: "default" | "back" | "action";
  iconSrc?: string;
  iconAlt?: string;
  onIconClick?: () => void;
  iconClassName?: string;
};


export function ViewArchivedClearanceWithStatusCard({
  className,
  title = "Archived Clearance",
  AcademicYear = "2025 - 2026",
  Semester = "1",
  ClearancePeriod = "11/22/2025 - 11/23/2025",
  LastUpdate = "November 1, 2025, 04:02 PM",
  Archived = "November 1, 2025, 04:02 PM",
  status = "incomplete",
  FacultyCSVDump = "2526_FacultyData.csv",
  Size = "250 MB",
  iconAlt = "Archive",

  onIconClick,
  iconClassName = "ml-4",
}: ViewArchivedClearanceWithStatusCardProps) {
  return (
    <Card className={cn("overflow-hidden border-muted-foreground/20", className)}>
      
        <div className="text-xl font-bold text-gray-900 justify-between p-6">
          <div className="items-right pb-3">
            <Badge variant={status === "complete" ? "success" : "warning"}>
              {status === "complete" ? "COMPLETE" : "INCOMPLETE"}
            </Badge>
          </div>
          <div className="flex items-center text-center justify-between ">
          <div>{title}</div>
          <Button variant="icon" className={iconClassName} size="icon" onClick={onIconClick}>
            <img src="/BlackChevronIcon.png" alt={iconAlt} className="h-6 w-6" />
          </Button>
          </div> 
        </div>
        
        <Divider className="bg-foreground " />
        
        <div className=" p-6">
        <div className="grid grid-cols-2 gap-2">
          <div className="text-md font-bold text-gray-900">Academic Year</div>
          <div className="text-sm text-gray-900 text-left break-words">{AcademicYear}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="text-md font-bold text-gray-900">Semester</div>
          <div className="text-sm text-gray-900 text-left break-words">{Semester}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="text-md font-bold text-gray-900">Clearance Period</div>
          <div className="text-sm text-gray-900 text-left break-words">{ClearancePeriod}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="text-md font-bold text-gray-900">Last Update</div>
          <div className="text-sm text-gray-900 text-left break-words">{LastUpdate}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="text-md font-bold text-gray-900">Archived</div>
          <div className="text-sm text-gray-900 text-left break-words">{Archived}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="text-md font-bold text-gray-900">Faculty CSV Dump</div>
          <div className="text-sm text-gray-900 text-left break-words">{FacultyCSVDump}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="text-md font-bold text-gray-900"></div>
          <div className="text-sm text-gray-900 text-left break-words">{Size}</div>
        </div>
      </div>
      </Card>
    );
  }

export type ViewArchivedClearanceCardProps = {
 className?: string;
  title?: string;
  AcademicYear?: string;
  Semester?: string;
  ClearancePeriod?: string;
  LastUpdate?: string;
  Archived?: string;
  description?: string;
  buttonText?: string;
  FacultyCSVDump?:string;
  Size?:string;
  totalFaculty?: string;
  completedClearances?: string;
  onButtonClick?: () => void;
  buttonVariant?: "default" | "back" | "action";
  iconSrc?: string;
  iconAlt?: string;
  onIconClick?: () => void;
  iconClassName?: string;
};

export function ViewArchivedClearanceCard({
  className,
  title = "Archived Clearance",
  AcademicYear = "2025 - 2026",
  Semester = "1",
  ClearancePeriod = "11/22/2025 - 11/23/2025",
  LastUpdate = "November 1, 2025, 04:02 PM",
  Archived = "November 1, 2025, 04:02 PM",
  FacultyCSVDump = "2526_FacultyData.csv",
  Size = "250 MB",
  totalFaculty = "0",
  completedClearances = "0",
  iconAlt = "Archive",
  onIconClick,
  iconClassName = "ml-4",
}: ViewArchivedClearanceCardProps) {
  return (
    <Card className={cn("overflow-hidden border-muted-foreground/20", className)}>
        <div className="text-center text-xl font-bold text-gray-900 flex items-center justify-between p-6">
          <div>{title}</div>
          <Button variant="icon" className={iconClassName} size="icon">
            <img src="/PrimaryDownloadIcon.png" alt={iconAlt} className="h-6 w-6" />
          </Button>
        </div>
        
        <Divider className="bg-foreground " />
        
        <div className=" p-6">
        <div className="grid grid-cols-2 gap-2">
          <div className="text-md font-bold text-gray-900">Academic Year</div>
          <div className="text-sm text-gray-900 text-left break-words">{AcademicYear}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="text-md font-bold text-gray-900">Semester</div>
          <div className="text-sm text-gray-900 text-left break-words">{Semester}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="text-md font-bold text-gray-900">Clearance Period</div>
          <div className="text-sm text-gray-900 text-left break-words">{ClearancePeriod}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="text-md font-bold text-gray-900">Last Update</div>
          <div className="text-sm text-gray-900 text-left break-words">{LastUpdate}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="text-md font-bold text-gray-900">Archived</div>
          <div className="text-sm text-gray-900 text-left break-words">{Archived}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="text-md font-bold text-gray-900">Faculty CSV Dump</div>
          <div className="text-sm text-gray-900 text-left break-words">{FacultyCSVDump}</div>
        </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="text-md font-bold text-gray-900">Total Faculty</div>
            <div className="text-sm text-gray-900 text-left break-words">{totalFaculty}</div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="text-md font-bold text-gray-900">Completed Clearances</div>
            <div className="text-sm text-gray-900 text-left break-words">{completedClearances}</div>
          </div>
        </div>
      </Card>
    );
  }

export type ViewArchivedFacultyCardProps = {
  className?: string;
  academicYear: string;
  semester: string;
  clearancePeriod: string;
  archivedDate: string;
  csvFileName: string;
  csvFileSize: string;
  onDownloadCSV?: () => void;
  onIconClick?: () => void;
};

export function ViewArchivedFacultyCard({
  className,
  academicYear,
  semester,
  clearancePeriod,
  archivedDate,
  csvFileName,
  csvFileSize,
  onDownloadCSV,
  onIconClick,
}: ViewArchivedFacultyCardProps) {
  const yearMatch = academicYear.match(/(\d{4})/);
  const startYear = yearMatch ? yearMatch[1] : "";
  const yearCode = startYear ? startYear.slice(2) : "";

  const normalizedSemester = semester.toLowerCase();
  let termCode = "";
  if (normalizedSemester.includes("first")) termCode = "01";
  else if (normalizedSemester.includes("second")) termCode = "02";
  else if (normalizedSemester.includes("intersession")) termCode = "03";

  const displayTitle = yearCode && termCode ? `${yearCode}${termCode} Archived Faculty` : "Archived Faculty";
  return (
    <Card className={cn("overflow-hidden border-muted-foreground/20", className)}>
      <div className="text-center text-xl font-bold text-gray-900 flex items-center justify-between p-6">
        <div>{displayTitle}</div>
        <Button
          variant="icon"
          className="ml-4"
          size="icon"
          onClick={onDownloadCSV ?? onIconClick}
          disabled={!onDownloadCSV}
        >
          <img src="/PrimaryDownloadIcon.png" alt="Download CSV" className="h-6 w-6" />
        </Button>
      </div>

      <Divider className="bg-foreground " />

      <div className="p-6">
        <div className="grid grid-cols-2 gap-2">
          <div className="text-md font-bold text-gray-900">Academic Year</div>
          <div className="text-sm text-gray-900 text-left break-words">{academicYear}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="text-md font-bold text-gray-900">Semester</div>
          <div className="text-sm text-gray-900 text-left break-words">{semester}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="text-md font-bold text-gray-900">Clearance Period</div>
          <div className="text-sm text-gray-900 text-left break-words">{clearancePeriod}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="text-md font-bold text-gray-900">Last Update</div>
          <div className="text-sm text-gray-900 text-left break-words">{archivedDate}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="text-md font-bold text-gray-900">Archived</div>
          <div className="text-sm text-gray-900 text-left break-words">{archivedDate}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="text-md font-bold text-gray-900">Faculty CSV Dump</div>
          <div className="text-sm text-gray-900 text-left break-words">{csvFileName}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="text-md font-bold text-gray-900">Size</div>
          <div className="text-sm text-gray-900 text-left break-words">{csvFileSize}</div>
        </div>
      </div>
    </Card>
  );
}

export type SystemUser = {
  id: string;
  name: string;

  systemId: string;

  userRole: string;

  universityId: string;

  college: string;

  department: string;

  email: string;

};



export type SystemUsersCardProps = {

  className?: string;

  users: SystemUser[];

  onAddApprover?: () => void;

  onAddAdmin?: () => void;

  onEditUser?: (user: SystemUser) => void;

  onRemoveUser?: (user: SystemUser) => void;

  currentUserEmail?: string;

  pageLabel?: string;

  pageCountLabel?: string;

  onPrevPage?: () => void;

  onNextPage?: () => void;

};



export function SystemUsersCard({

  className,

  users,

  onAddApprover,

  onAddAdmin,

  onEditUser,

  onRemoveUser,

  currentUserEmail,

}: SystemUsersCardProps) {

  return (

    <Card className={cn("overflow-hidden border-muted-foreground/20 shadow-sm", className)}>

      <CardContent className="p-0">

        <div className="flex">

          <Divider orientation="vertical" className="h-auto self-stretch" />

          <div className="min-w-0 flex-1">

            <div className="flex items-center justify-start gap-2 bg-background px-4 py-3 flex-wrap">
              <Button type="button" variant="default" className="h-10" onClick={onAddApprover}>
                <div className="flex items-center gap-2">
                  <img src="/WhitePlusIcon.png" alt="Add Approver" className="h-5 w-5 object-contain" />
                  <span className="ml-0">Add Approver</span>
                </div>
              </Button>
              <Button type="button" variant="default" className="h-10" onClick={onAddAdmin}>
                <div className="flex items-center gap-2">
                  <img src="/WhitePlusIcon.png" alt="Add Admin" className="h-5 w-5 object-contain" />
                  <span>Add Admin</span>
                </div>
              </Button>
            </div>

            <Divider color="border-[hsl(var(--gray-border))]" />



            <div>

              {users.map((user, idx) => (

                <React.Fragment key={user.id}>

                  <div className="flex items-start gap-4 px-4 py-5">

                    <div className="min-w-0 flex-1">

                      <div className="flex w-full items-center justify-between gap-3">

                        <span className="text-xl font-bold text-gray-900">{user.name}</span>



                        <div className="flex items-center gap-2">

                          <Button

                            type="button"

                            variant="action"

                            className="h-7 rounded-md px-3 text-xs font-bold"

                            onClick={() => onEditUser?.(user)}

                            disabled={user.email === currentUserEmail}

                          >

                            EDIT

                          </Button>



                          <Button

                            type="button"

                            variant="destructive"

                            className="h-7 rounded-md px-3 text-xs font-bold"

                            onClick={() => onRemoveUser?.(user)}

                            disabled={user.email === currentUserEmail}

                          >

                            REMOVE

                          </Button>

                        </div>

                      </div>



                      <div className="mt-4 grid grid-cols-[110px_1fr] gap-x-3 gap-y-1 text-md">

                        <div className="font-semibold text-md text-gray-900">System ID</div>

                        <div className="text-muted-foreground">{user.systemId}</div>



                        <div className="font-semibold text-md text-gray-900">User Role</div>

                        <div className="text-muted-foreground">{user.userRole}</div>



                        <div className="font-semibold text-md text-gray-900">University ID</div>

                        <div className="text-muted-foreground">{user.universityId}</div>



                        <div className="font-semibold text-gray-900">College</div>

                        <div className="text-muted-foreground">{user.college}</div>



                        <div className="font-semibold text-gray-900">Department</div>

                        <div className="text-muted-foreground">{user.department}</div>



                        <div className="font-semibold text-gray-900">Email</div>

                        <div className="break-all text-muted-foreground">{user.email}</div>

                      </div>

                    </div>

                  </div>



                  {idx < users.length - 1 ? (

                    <Divider color="border-[hsl(var(--gray-border))]" />

                  ) : null}

                </React.Fragment>

              ))}

            </div>

          </div>

          <Divider orientation="vertical" className="h-auto self-stretch" />

        </div>

      </CardContent>

    </Card>

  );

}



export function SystemGuidlinesCard({

  items,

  className,

  onClose,

  headerActionHref,

  headerActionImgSrc,

  headerActionImgAlt = "Open",

  headerActionOnClick,

  cardName,

  onViewItem,

  onAddRequirement,

  addDisabled,

}: SystemGuidlinesCardProps) {

  return (

    <SectionListCard

      title={cardName ?? "System Guidelines"}

      className={className}

      onClose={onClose}

      headerActionHref={headerActionHref}

      headerActionImgSrc={headerActionImgSrc}

      headerActionImgAlt={headerActionImgAlt}

      headerActionOnClick={headerActionOnClick}

    >

      <div className="p-4">

        <div className="space-y-3">

          {items.map((item) => (

            <React.Fragment key={item.title}>

              <div className=" items-start gap-3 rounded-md bg-muted p-4">

                <div>

                  <div className="mt-2 text-lg font-bold text-gray-900">{item.title}</div>



                  <div className="mt-3 text-md text-gray-900">

                    {Array.isArray(item.description) ? (

                      <ol className="mb-2 ml-4 list-decimal space-y-1">

                        {item.description.map((desc, i) => (

                          <li key={i}>

                            {typeof desc === "string" ? desc : desc.text}



                            {typeof desc !== "string" && desc.subitems ? (

                              <ol className="ml-6 mt-1 list-lower-alpha space-y-1">

                                {desc.subitems.map((sub, j) => (

                                  <li key={j}>{sub}</li>

                                ))}

                              </ol>

                            ) : null}

                          </li>

                        ))}

                      </ol>

                    ) : (

                      <p className="whitespace-pre-line">{item.description}</p>

                    )}



                    <Link to={item.email} className="text-primary font-bold underline">

                      {item.email}

                    </Link>

                  </div>

                </div>



                <div className="flex items-start justify-between mt-3 text-sm text-muted-foreground">

                  Created: {item.timestamp}

                </div>

              </div>

            </React.Fragment>

          ))}

        </div>

      </div>

    </SectionListCard>

  );

}



export type ClearanceTimelineStatus = "active" | "inactive";



export type ClearanceTimelineItem = {

  id?: string;

  schoolYear: string;

  term: string;

  status: ClearanceTimelineStatus;

  Name: string;

  Timeline: string;

  Date: String;

  Time: String;

};



export type ClearanceTimelineCardProps = {

  title: string;

  items: ClearanceTimelineItem[];

  className?: string;

  headerActionHref?: string;

  headerActionImgSrc?: string;

  headerActionImgAlt?: string;

  headerActionOnClick?: () => void;

  onEditItem?: (item: ClearanceTimelineItem) => void;

};



export function ClearanceTimelineCard({

  title,

  items,

  className,

  headerActionHref,

  headerActionImgSrc,

  headerActionImgAlt = "Open",

  headerActionOnClick,

  onEditItem,

}: ClearanceTimelineCardProps) {

  return (

    <SectionListCard

      title={title}

      className={className}

      headerActionHref={headerActionHref}

      headerActionImgSrc={headerActionImgSrc}

      headerActionImgAlt={headerActionImgAlt}

      headerActionOnClick={headerActionOnClick}

    >

      <div className="space-y-3">

        {items.map((item, idx) => (

          <React.Fragment key={`${item.schoolYear}-${item.term}-${idx}`}>

            <div className="overflow-hidden rounded-md bg-white p-4">

              <div className="flex items-center justify-between px-4 py-3">

                <div className="min-w-0 flex-1">

                  <div className="text-lg font-bold text-gray-900">{item.term}</div>

                </div>

                <div className="flex items-center gap-2">

                  <GuidelinesToggle
                    checked={item.status === "active"}
                    onChange={(next) => {
                      // Handle toggle change here
                      console.log("Toggle changed:", next);
                    }}
                  />

                  {item.status === "active" && (

                    <Button

                      type="button"

                      variant="secondary"

                      size="sm"

                      className="h-8 rounded-md px-3 text-xs font-bold"

                      onClick={() => onEditItem?.(item)}

                    >

                      EDIT

                    </Button>

                  )}

                </div>

              </div>

              <div className="px-4 py-4 bg-white">

                <div className="space-y-0 bg-foregroundLight rounded-md border border-gray-200 p-4">

                  <div className="flex items-center gap-3">
                      <div className="text-md font-bold text-gray-900 w-32">Name:</div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">{item.Name || 'unset'}</div>
                    </div>

                  <div className="flex items-center gap-3">
                    <div className="text-md font-bold text-gray-900 w-32">School Year:</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900">{item.schoolYear || 'unset'}</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-md font-bold text-gray-900 w-32">Timeline:</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900">{item.Timeline || 'unset'}</div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-900  italic">Last Update: {item.Date} {item.Time}</div>
                  </div>

                </div>

                <div className="flex justify-between gap-3 mt-4">
                  {item.Name === 'unset' || item.Timeline === 'unset' ? (
                    <Button variant="default" className="w-full">ADD</Button>
                  ) : (
                    <>
                      <Button variant="default" className="flex-1">ARCHIVE</Button>
                      <Button variant="back" className="flex-1">EDIT</Button>
                    </>
                  )}
                </div>

              </div>

            </div>

            {idx < items.length - 1 && (
              <div className="border-b-2 border-[hsl(var(--gray-border))] shadow-[0_2px_2px_-2px_rgba(0,0,0,0.25)]" />
            )}

          </React.Fragment>

        ))}

      </div>

    </SectionListCard>

  );

}



export type AnalyticsDonutCardProps = {

  title: string;

  completed: number;

  total: number;

  className?: string;

};



export function AnalyticsDonutCard({ title, completed, total, className }: AnalyticsDonutCardProps) {

  const safeTotal = Math.max(0, total);

  const safeCompleted = Math.max(0, Math.min(completed, safeTotal));

  const pct = safeTotal > 0 ? (safeCompleted / safeTotal) * 100 : 0;

  const clamped = Math.max(0, Math.min(100, pct));



  return (

    <Card className={cn("overflow-hidden", className)}>

      <CardHeader className="bg-primary py-3">

        <CardTitle className="text-center text-base font-bold text-primary-foreground">{title}</CardTitle>

      </CardHeader>



      <CardContent className="p-4">

        <div className="mx-auto w-full max-w-[320px] rounded-md border border-[hsl(var(--gray-border))] bg-background p-4">

          <div className="mx-auto flex items-center justify-center">

            <div

              className="relative h-48 w-48 rounded-full"

              style={{

                background: `conic-gradient(hsl(var(--success)) ${clamped}%, hsl(var(--muted)) ${clamped}% 100%)`,

              }}

            >

              <div className="absolute inset-7 rounded-full bg-background" />

            </div>

          </div>



          <div className="mt-4 flex items-center justify-center gap-8 text-xs font-semibold text-muted-foreground">

            <div className="flex items-center gap-2">

              <div className="h-2.5 w-6 rounded-sm bg-[hsl(var(--muted))]" />

              <div>Incomplete</div>

            </div>



            <div className="flex items-center gap-2">

              <div className="h-2.5 w-6 rounded-sm bg-success" />

              <div>Completed</div>

            </div>

          </div>

        </div>

      </CardContent>

    </Card>

  );

}



export type DepartmentCompletionRateItem = {

  label: string;

  completed: number;

  total: number;

};



export type DepartmentCompletionRateSection = {

  title: string;

  items: DepartmentCompletionRateItem[];

};



export type DepartmentCompletionRateCardProps = {

  title?: string;

  sections: DepartmentCompletionRateSection[];

  className?: string;

};



export function DepartmentCompletionRateCard({

  title = "Department Completion Rate",

  sections,

  className,

}: DepartmentCompletionRateCardProps) {

  return (

    <Card className={cn("overflow-hidden", className)}>

      <CardHeader className="bg-primary py-3">

        <CardTitle className="text-center text-base font-bold text-primary-foreground">{title}</CardTitle>

      </CardHeader>



      <CardContent className="p-4">

        <div className="space-y-4">

          {sections.map((section) => (

            <div key={section.title}>

              <div className="text-sm font-bold text-gray-900">{section.title}</div>



              <div className="mt-3 space-y-3">

                {section.items.map((item) => {

                  const safeTotal = Math.max(0, item.total);

                  const safeCompleted = Math.max(0, Math.min(item.completed, safeTotal));

                  const pct = safeTotal > 0 ? (safeCompleted / safeTotal) * 100 : 0;

                  const clamped = Math.max(0, Math.min(100, pct));



                  return (

                    <div key={item.label} className="rounded-md bg-muted px-4 py-3">

                      <div className="flex items-center justify-between gap-3">

                        <div className="text-sm font-semibold text-gray-900">{item.label} </div>

                        <div className="text-xs font-semibold text-muted-foreground">

                          {safeCompleted}/{safeTotal}

                        </div>

                      </div>



                      <div className="mt-3 h-1.5 w-full rounded-full bg-background">

                        <div className="h-1.5 rounded-full bg-success" style={{ width: `${clamped}%` }} />

                      </div>

                    </div>

                  );

                })}

              </div>

            </div>

          ))}

        </div>

      </CardContent>

    </Card>

  );

}

export type AgreementCardProps = {
  requestId?: string;
  employeeId?: string;
  name?: string;
  college?: string;
  department?: string;
  facultyType?: string;
  SchoolID?:string;
  FullName?:string;
  SchoolEmail?:string;
  status?: "pending" | "approved" | "rejected";
  className?: string;
  onApprove?: () => void;
  onReject?: () => void;
  onViewDetails?: () => void;
  onConfirm?: () => void;
};

export function AgreementCard({
  className,
  onConfirm,
}: AgreementCardProps) {
  const [agreeChecked, setAgreeChecked] = React.useState(false);
  const [understandChecked, setUnderstandChecked] = React.useState(false);
  const [understandConsequencesChecked, setUnderstandConsequencesChecked] = React.useState(false);

  const allChecked = agreeChecked && understandChecked && understandConsequencesChecked;

  return (
    <div className={cn("rounded-xl border bg-card text-card-foreground shadow", className)}>
      <div className="pt-9 pb-4 pl-4 pr-4" >


        <div>
        <div className="flex items-center gap-4 border-2 border-muted-foreground p-4 rounded bg-foregroundLight">
          <Checkbox
            variant="gray"
            checked={agreeChecked}
            onCheckedChange={(v) => setAgreeChecked(v === true)}
          />
           <label className="text-sm text-gray-700">
              <span className="font-bold">I agree</span> that I have created all the necessary clearance requirements that I need for my Department/Office
            </label>
        </div>
        </div>

        <div className="pt-4">

        <div className="flex items-center gap-4 border-2 border-muted-foreground p-4 rounded bg-foregroundLight">
          <Checkbox
            variant="gray"
            checked={understandChecked}
            onCheckedChange={(v) => setUnderstandChecked(v === true)}
          />
          <label className="text-sm text-gray-700">
            <span className="font-bold">I understand</span> that once a Clearance Timeline is in an “Active” state, I cannot make any changes to my requirements.
          </label>
        </div>
        </div>

        <div className="pt-4">
        <div className="flex items-center gap-4 border-2 border-muted-foreground p-4 rounded bg-foregroundLight">
          <Checkbox
            variant="gray"
            checked={understandConsequencesChecked}
            onCheckedChange={(v) => setUnderstandConsequencesChecked(v === true)}
          />
          <label className="text-sm text-gray-700">
            <span className="font-bold">I understand</span> that if I was not able to create the requirements for my departments on time, the system will reject the faculty member by default.
          </label>
        </div>
        </div>

        <div className="pt-6">
          <Button
            type="button"
            variant="default"
            className="w-full justify-center  text-center font-bold"
            disabled={!allChecked}
            onClick={onConfirm}
          >
            I Agree and Understand
          </Button>
        </div>
      </div>
    </div>
  );
}

export type TrueAgreementCardProps = {
  requestId?: string;
  employeeId?: string;
  name?: string;
  college?: string;
  department?: string;
  facultyType?: string;
  SchoolID?:string;
  FullName?:string;
  SchoolEmail?:string;
  status?: "pending" | "approved" | "rejected";
  className?: string;
  onApprove?: () => void;
  onReject?: () => void;
  onViewDetails?: () => void;
  onConfirm?: () => void;
};

export function TrueAgreementCard({
  className,
  onConfirm,
}: TrueAgreementCardProps) {
  const allChecked = true;

  return (
    <div className={cn("rounded-xl border bg-card text-card-foreground shadow", className)}>
      <div className="pt-9 pb-4 pl-4 pr-4" >


        <div>
        <div className="flex items-center gap-4 border-2 border-muted-foreground p-4 rounded bg-foregroundLight">
          <Checkbox
            variant="gray"
            checked={true}
            disabled
          />
           <label className="text-sm text-gray-700">
              <span className="font-bold">I agree</span> that I have created all the necessary clearance requirements that I need for my Department/Office
            </label>
        </div>
        </div>

        <div className="pt-4">

        <div className="flex items-center gap-4 border-2 border-muted-foreground p-4 rounded bg-foregroundLight">
          <Checkbox
            variant="gray"
            checked={true}
            disabled
          />
          <label className="text-sm text-gray-700">
            <span className="font-bold">I understand</span> that once a Clearance Timeline is in an “Active” state, I cannot make any changes to my requirements.
          </label>
        </div>
        </div>

        <div className="pt-4">
        <div className="flex items-center gap-4 border-2 border-muted-foreground p-4 rounded bg-foregroundLight">
          <Checkbox
            variant="gray"
            checked={true}
            disabled
          />
          <label className="text-sm text-gray-700">
            <span className="font-bold">I understand</span> that if I was not able to create the requirements for my departments on time, the system will reject the faculty member by default.
          </label>
        </div>
        </div>


      </div>
    </div>
  );
}

export type NoLinkClearanceRequestItem = {
  id: string;
  name: string;
  requestId: string;
  employeeId: string;
  college: string;
  department: string;
  facultyType: string;
  status: ClearanceRequestStatus;
};

export type NoClearanceRequestsCardProps = {
  items?: NoLinkClearanceRequestItem[];
  className?: string;
};

export function NoLinkClearanceRequestsCard({
  items = [],
  className,
}: NoClearanceRequestsCardProps) {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set());

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-0">
        <div className="flex">
          <Divider orientation="vertical" className="h-auto self-stretch " />
          <div className="min-w-0 flex-1">

            <div>
              {items.length === 0 ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">No clearance requests.</div>
              ) : null}
              {items.map((item, idx) => (
                <React.Fragment key={item.id}>
                  <div className="flex gap-3 px-4 py-6">
                    <div className="pt-1">

                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="grid grid-cols-[1fr_auto] items-start gap-3">
                        <div className="min-w-0">

                            <div className="break-words whitespace-normal text-left text-2xl font-bold text-primary">
                              {item.name}
                            </div>
                        </div>

                        <div className="shrink-0">
                          <Badge
                            variant={getClearanceStatusBadgeVariant(item.status)}
                            className="px-3 py-1 text-xs font-bold"
                          >
                            {item.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-[88px_1fr] gap-x-3 gap-y-1 text-sm">
                        <div className="font-bold text-gray-900">Request ID</div>
                        <div className="text-gray-900">{item.requestId}</div>
                        <div className="font-bold text-gray-900">Employee ID</div>
                        <div className="text-gray-900">{item.employeeId}</div>

                        <div className="font-bold text-gray-900">College</div>
                        <div className="text-gray-900">{item.college}</div>

                        <div className="font-bold text-gray-900">Department</div>
                        <div className="text-gray-900">{item.department}</div>

                        <div className="font-bold text-gray-900">Faculty Type</div>
                        <div className="text-gray-900">{item.facultyType}</div>
                      </div>
                    </div>
                  </div>

                  {idx < items.length - 1 ? (
                    <Divider color="border-[hsl(var(--gray-border))]" />
                  ) : null}
                </React.Fragment>
              ))}
            </div>
          </div>

          <Divider orientation="vertical" className="h-auto self-stretch" />
        </div>
      </CardContent>
    </Card>
  );
}