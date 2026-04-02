import * as React from "react";

import "../../index.css"; 
import { CISOHeader } from "../../stories/components/header";

import {
  SectionListCard,
} from "../../stories/components/cards";

import { Divider } from "../../stories/components/divider";

import { Button } from "../../stories/components/button";
import { Checkbox } from "../../stories/components/checkbox";

import { Pencil, Trash2 } from "lucide-react";

import {
  AddApproverDialog,
  EditApproverDialog,
  EditApproverFlowDialog,
} from "../../stories/components/approver-flow-dialogs";

import { Dialog, DialogContent } from "../../stories/components/dialog";
import { Input } from "../../stories/components/input";

import { Badge } from "../../stories/components/badge";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../stories/components/alert-dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../stories/components/select";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../../stories/components/breadcrumb";
import { Link, useNavigate } from "react-router-dom";

type CollegeItem = {
  id: string;
  name: string;
  short: string;
};

type DepartmentItem = {
  id: string;
  collegeId: string;
  name: string;
  short: string;
};

type OfficeItem = {
  id: string;
  name: string;
  short: string;
  displayOrder?: number;
};

type ApproverFlowItem = {
  id: string;
  category: string;
  collegeIds: string[];
  order?: number;
};

type ClearanceTimeline = {
  id: string;
  name: string;
  academicYearStart: string;
  academicYearEnd: string;
  term: string;
  clearanceStartDate: string;
  clearanceEndDate: string;
  setAsActive: boolean;
  createdAt: string;
};

type DraftDepartment = { name: string; short: string };

const FALLBACK_APPROVER_CATEGORIES = [
  "Department Chair",
  "College Dean",
  "University Registrar",
  "University Library",
  "Office of the Vice President for Higher Education",
  "Human Resources Office",
];

async function apiJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const r = await fetch(input, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(text || `Request failed: ${r.status}`);
  }
  return (await r.json()) as T;
}

function postCISOActivityLog(_payload: { event_type: string; details?: string[] }) {
  // Temporarily disabled on this page: no activity log POST from College & Office Configuration.
  return;
}

function AddCollegeDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: { college: { name: string; short: string }; departments: DraftDepartment[] }) => void;
}) {
  const { open, onOpenChange, onCreate } = props;
  const [step, setStep] = React.useState<1 | 2>(1);
  const [name, setName] = React.useState("");
  const [short, setShort] = React.useState("");
  const [departments, setDepartments] = React.useState<DraftDepartment[]>([]);

  React.useEffect(() => {
    if (!open) return;
    setStep(1);
    setName("");
    setShort("");
    setDepartments([]);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[420px] max-w-[calc(100vw-3rem)] rounded-xl p-0">
        <div className="rounded-xl bg-background">
          <div className="px-6 pb-4 pt-6">
            <div className="text-center text-base font-bold text-foreground">
              {step === 1 ? "Add College" : "Add Department"}
            </div>

            {step === 1 ? (
              <div className="mt-6 space-y-4">
                <div>
                  <div className="text-xs font-semibold text-foreground">College Name</div>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 h-10" />
                </div>

                <div>
                  <div className="text-xs font-semibold text-foreground">Abbreviation</div>
                  <Input value={short} onChange={(e) => setShort(e.target.value)} className="mt-2 h-10" />
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div>
                  <div className="text-xs font-semibold text-foreground">College Name</div>
                  <div className="mt-1 text-sm text-foreground">{name || "-"}</div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-foreground">College Departments</div>

                  <div className="mt-2 space-y-2">
                    {departments.map((d, idx) => (
                      <div key={idx} className="grid grid-cols-[1fr,120px] gap-2">
                        <Input
                          value={d.name}
                          onChange={(e) => {
                            const next = [...departments];
                            next[idx] = { ...next[idx], name: e.target.value };
                            setDepartments(next);
                          }}
                          placeholder="Department Name"
                          className="h-10"
                        />
                        <Input
                          value={d.short}
                          onChange={(e) => {
                            const next = [...departments];
                            next[idx] = { ...next[idx], short: e.target.value };
                            setDepartments(next);
                          }}
                          placeholder="Abbreviation"
                          className="h-10"
                        />
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    className="mt-3 h-10 w-full rounded-md bg-primary text-primary-foreground"
                    onClick={() => setDepartments((prev) => [...prev, { name: "", short: "" }])}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-sm font-semibold">Add New Department</span>
                      <span className="text-lg font-bold">+</span>
                    </div>
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-[hsl(var(--gray-border))] px-6 py-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="cancel"
                className="h-11 w-full "
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>

              {step === 1 ? (
                <Button
                  type="button"
                  className="h-11 w-full rounded-md"
                  onClick={() => setStep(2)}
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="button"
                  className="h-11 w-full rounded-md"
                  onClick={() => {
                    onCreate({ college: { name, short }, departments });
                    onOpenChange(false);
                  }}
                >
                  Create
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditCollegeDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: { name: string; short: string };
  onSave: (payload: { name: string; short: string }) => void;
}) {
  const { open, onOpenChange, initialValues, onSave } = props;
  const [name, setName] = React.useState("");
  const [short, setShort] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setName(initialValues?.name ?? "");
    setShort(initialValues?.short ?? "");
  }, [open, initialValues?.name, initialValues?.short]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[420px] max-w-[calc(100vw-3rem)] rounded-xl p-0">
        <div className="rounded-xl bg-background">
          <div className="px-6 pb-4 pt-6">
            <div className="text-center text-base font-bold text-foreground">Edit College</div>
            <div className="mt-6 space-y-4">
              <div>
                <div className="text-xs font-semibold text-foreground">College Name</div>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 h-10" />
              </div>

              <div>
                <div className="text-xs font-semibold text-foreground">Abbreviation</div>
                <Input value={short} onChange={(e) => setShort(e.target.value)} className="mt-2 h-10" />
              </div>
            </div>
          </div>

          <div className="border-t border-[hsl(var(--gray-border))] px-6 py-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="cancel"
                className="h-11 w-full "
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>

              <Button
                type="button"
                className="h-11 w-full rounded-md"
                onClick={() => {
                  onSave({ name, short });
                  onOpenChange(false);
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

function EditDepartmentDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: { name: string; short: string };
  onSave: (payload: { name: string; short: string }) => void;
}) {
  const { open, onOpenChange, initialValues, onSave } = props;
  const [name, setName] = React.useState("");
  const [short, setShort] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setName(initialValues?.name ?? "");
    setShort(initialValues?.short ?? "");
  }, [open, initialValues?.name, initialValues?.short]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[420px] max-w-[calc(100vw-3rem)] rounded-xl p-0">
        <div className="rounded-xl bg-background">
          <div className="px-6 pb-4 pt-6">
            <div className="text-center text-base font-bold text-foreground">Edit Department</div>

            <div className="mt-6 space-y-4">
              <div>
                <div className="text-xs font-semibold text-foreground">Department Name</div>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 h-10" />
              </div>

              <div>
                <div className="text-xs font-semibold text-foreground">Abbreviation</div>
                <Input value={short} onChange={(e) => setShort(e.target.value)} className="mt-2 h-10" />
              </div>
            </div>
          </div>

          <div className="border-t border-[hsl(var(--gray-border))] px-6 py-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="cancel"
                className="h-11 w-full"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>

              <Button
                type="button"
                className="h-11 w-full rounded-md"
                onClick={() => {
                  onSave({ name, short });
                  onOpenChange(false);
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

function EditOfficeDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: { name: string; short: string };
  onSave: (payload: { name: string; short: string }) => void;
}) {
  const { open, onOpenChange, initialValues, onSave } = props;
  const [name, setName] = React.useState("");
  const [short, setShort] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setName(initialValues?.name ?? "");
    setShort(initialValues?.short ?? "");
  }, [open, initialValues?.name, initialValues?.short]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[420px] max-w-[calc(100vw-3rem)] rounded-xl p-0">
        <div className="rounded-xl bg-background">
          <div className="px-6 pb-4 pt-6">
            <div className="text-center text-base font-bold text-foreground">Edit Office</div>

            <div className="mt-6 space-y-4">
              <div>
                <div className="text-xs font-semibold text-foreground">Office Name</div>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 h-10" />
              </div>

              <div>
                <div className="text-xs font-semibold text-foreground">Abbreviation</div>
                <Input value={short} onChange={(e) => setShort(e.target.value)} className="mt-2 h-10" />
              </div>
            </div>
          </div>

          <div className="border-t border-[hsl(var(--gray-border))] px-6 py-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="cancel"
                className="h-11 w-full "
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>

              <Button
                type="button"
                className="h-11 w-full rounded-md"
                onClick={() => {
                  onSave({ name, short });
                  onOpenChange(false);
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

function AddDepartmentDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collegeName: string;
  onCreate: (payload: DraftDepartment) => void;
}) {
  const { open, onOpenChange, collegeName, onCreate } = props;
  const [name, setName] = React.useState("");
  const [short, setShort] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setName("");
    setShort("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[420px] max-w-[calc(100vw-3rem)] rounded-xl p-0">
        <div className="rounded-xl bg-background">
          <div className="px-6 pb-4 pt-6">
            <div className="text-center text-base font-bold text-foreground">Add Department</div>

            <div className="mt-6 space-y-4">
              <div>
                <div className="text-xs font-semibold text-foreground">College Name</div>
                <div className="mt-1 text-sm text-foreground">{collegeName || "-"}</div>
              </div>

              <div className="grid grid-cols-[1fr,120px] gap-2">
                <div>
                  <div className="text-xs font-semibold text-foreground">Department Name</div>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-2 h-10"
                  />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">Abbreviation</div>
                  <Input
                    value={short}
                    onChange={(e) => setShort(e.target.value)}
                    className="mt-2 h-10"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-[hsl(var(--gray-border))] px-6 py-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="cancel"
                className="h-11 w-full"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>

              <Button
                type="button"
                className="h-11 w-full rounded-md"
                onClick={() => {
                  onCreate({ name, short });
                  onOpenChange(false);
                }}
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddOfficeDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: { name: string; short: string }) => void;
}) {
  const { open, onOpenChange, onCreate } = props;
  const [name, setName] = React.useState("");
  const [short, setShort] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setName("");
    setShort("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[420px] max-w-[calc(100vw-3rem)] rounded-xl p-0">
        <div className="rounded-xl bg-background">
          <div className="px-6 pb-4 pt-6">
            <div className="text-center text-base font-bold text-foreground">Add Office</div>

            <div className="mt-6 space-y-4">
              <div>
                <div className="text-xs font-semibold text-foreground">Office Name</div>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 h-10" />
              </div>

              <div>
                <div className="text-xs font-semibold text-foreground">Abbreviation</div>
                <Input value={short} onChange={(e) => setShort(e.target.value)} className="mt-2 h-10" />
              </div>
            </div>
          </div>

          <div className="border-t border-[hsl(var(--gray-border))] px-6 py-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="cancel"
                className="h-11 w-full"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>

              <Button
                type="button"
                className="h-11 w-full rounded-md"
                onClick={() => {
                  onCreate({ name, short });
                  onOpenChange(false);
                }}
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CISOCollegeOfficeConfiguration() {
  const navigate = useNavigate();

  const [colleges, setColleges] = React.useState<CollegeItem[]>([]);
  const [departments, setDepartments] = React.useState<DepartmentItem[]>([]);
  const [offices, setOffices] = React.useState<OfficeItem[]>([]);
  const [approverFlow, setApproverFlow] = React.useState<ApproverFlowItem[]>([]);
  const [timelines, setTimelines] = React.useState<ClearanceTimeline[]>([]);
  const [selectedTimelineId, setSelectedTimelineId] = React.useState<string>(() => {
    // Load saved timeline from localStorage on initial load
    return localStorage.getItem('ciso-selected-timeline') || "";
  });
  const [isConfigurationLocked, setIsConfigurationLocked] = React.useState(false);
  const [checkbox1Checked, setCheckbox1Checked] = React.useState(false);
  const [checkbox2Checked, setCheckbox2Checked] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const [selectedCollegeId, setSelectedCollegeId] = React.useState<string>("");

  const [addCollegeOpen, setAddCollegeOpen] = React.useState(false);
  const [addDepartmentOpen, setAddDepartmentOpen] = React.useState(false);
  const [addOfficeOpen, setAddOfficeOpen] = React.useState(false);
  const [addApproverOpen, setAddApproverOpen] = React.useState(false);

  const [editCollegeOpen, setEditCollegeOpen] = React.useState(false);
  const [editDepartmentOpen, setEditDepartmentOpen] = React.useState(false);
  const [editOfficeOpen, setEditOfficeOpen] = React.useState(false);
  const [editApproverOpen, setEditApproverOpen] = React.useState(false);

  const [editApproverFlowOpen, setEditApproverFlowOpen] = React.useState(false);

  const [editingCollegeId, setEditingCollegeId] = React.useState<string | null>(null);
  const [editingDepartmentId, setEditingDepartmentId] = React.useState<string | null>(null);
  const [editingOfficeId, setEditingOfficeId] = React.useState<string | null>(null);
  const [editingApproverId, setEditingApproverId] = React.useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = React.useState<{
    open: boolean;
    type?: "college" | "department" | "office" | "approver";
    id?: string;
    label?: string;
  }>({ open: false });

  const [queuedActivityLogs, setQueuedActivityLogs] = React.useState<QueuedActivityLog[]>([]);

  const queueCISOActivityLog = React.useCallback(
    (payload: { event_type: string; details?: string[] }) => {
      setQueuedActivityLogs((prev) => [...prev, { role: "CISO", payload }]);
    },
    []
  );

  const flushQueuedActivityLogs = React.useCallback(async () => {
    if (!queuedActivityLogs.length) return;

    const logsToFlush = queuedActivityLogs;
    setQueuedActivityLogs([]);

    await Promise.all(
      logsToFlush.map(async (log) => {
        if (log.role === "CISO") {
          postCISOActivityLog(log.payload);
          return;
        }
        postCISOActivityLog(log.payload);
      })
    );
  }, [queuedActivityLogs]);

  React.useEffect(() => {
    // Fetch timelines first
    fetch("/admin/xu-faculty-clearance/api/ciso/clearance-timeline", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { items: ClearanceTimeline[] }) => {
        const timelineItems = data.items ?? [];
        const sortedTimelines = [...timelineItems].sort((a, b) => a.name.localeCompare(b.name));
        setTimelines(sortedTimelines);

        const savedTimelineId = localStorage.getItem('ciso-selected-timeline') || "";
        const savedTimeline = sortedTimelines.find((timeline) => timeline.id === savedTimelineId);
        const activeTimeline = sortedTimelines.find((timeline) => timeline.setAsActive);
        const fallbackTimeline = activeTimeline ?? sortedTimelines[0];

        if (savedTimeline) {
          setSelectedTimelineId(savedTimeline.id);
        } else if (fallbackTimeline) {
          setSelectedTimelineId(fallbackTimeline.id);
          localStorage.setItem('ciso-selected-timeline', fallbackTimeline.id);
        }
      })
      .catch(() => {
        setTimelines([]);
      });

    // Fetch org structure
    fetch("/admin/xu-faculty-clearance/api/ciso/org-structure", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { colleges: CollegeItem[]; departments: DepartmentItem[]; offices: OfficeItem[] }) => {
        const initialColleges = data.colleges ?? [];
        const initialDepartments = data.departments ?? [];
        const initialOffices = data.offices ?? [];

        setColleges(initialColleges);
        setDepartments(initialDepartments);
        setOffices(initialOffices);
        setSelectedCollegeId(initialColleges[0]?.id ?? "");
      })
      .catch(() => {
        setColleges([]);
        setDepartments([]);
        setOffices([]);
        setSelectedCollegeId("");
      });
  }, []);

  // Fetch approver flow when timeline changes
  React.useEffect(() => {
    const approverFlowUrl = selectedTimelineId 
      ? `/admin/xu-faculty-clearance/api/ciso/approver-flow?timeline_id=${selectedTimelineId}`
      : "/admin/xu-faculty-clearance/api/ciso/approver-flow";
    
    fetch(approverFlowUrl, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { steps: ApproverFlowItem[] }) => {
        const steps = (data.steps ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setApproverFlow(steps);
      })
      .catch(() => {
        setApproverFlow([]);
      });
  }, [selectedTimelineId]);

  // Check if selected timeline is active
  React.useEffect(() => {
    const selectedTimeline = timelines.find((t) => t.id === selectedTimelineId);
    setIsConfigurationLocked(selectedTimeline?.setAsActive ?? false);
  }, [selectedTimelineId, timelines]);

  const approverCategories = React.useMemo(() => {
    const raw = approverFlow.map((s) => (s.category ?? "").trim()).filter(Boolean);
    const unique = Array.from(new Set(raw));
    // Always include fallback categories to ensure all options are available
    const allCategories = [...FALLBACK_APPROVER_CATEGORIES];
    // Add any custom categories from the current approver flow
    unique.forEach(category => {
      if (!allCategories.includes(category)) {
        allCategories.push(category);
      }
    });
    return allCategories;
  }, [approverFlow]);

  const filteredDepartments = React.useMemo(
    () => departments.filter((d) => d.collegeId === selectedCollegeId),
    [departments, selectedCollegeId]
  );

  const selectedCollegeName = React.useMemo(
    () => colleges.find((c) => c.id === selectedCollegeId)?.name ?? "",
    [colleges, selectedCollegeId]
  );

  const editingCollege = React.useMemo(
    () => (editingCollegeId ? colleges.find((c) => c.id === editingCollegeId) : undefined),
    [colleges, editingCollegeId]
  );

  const editingDepartment = React.useMemo(
    () => (editingDepartmentId ? departments.find((d) => d.id === editingDepartmentId) : undefined),
    [departments, editingDepartmentId]
  );

  const editingOffice = React.useMemo(
    () => (editingOfficeId ? offices.find((o) => o.id === editingOfficeId) : undefined),
    [offices, editingOfficeId]
  );

  const editingApprover = React.useMemo(
    () => (editingApproverId ? approverFlow.find((a) => a.id === editingApproverId) : undefined),
    [approverFlow, editingApproverId]
  );

  const handleSaveConfiguration = React.useCallback(async () => {
    if (!selectedTimelineId || !checkbox1Checked || !checkbox2Checked) return;
    
    setIsSaving(true);
    try {
      // Save configuration for the selected timeline
      const response = await fetch(`/admin/xu-faculty-clearance/api/ciso/college-office-configuration?timeline_id=${selectedTimelineId}`, {
        method: 'POST',
        credentials: "include",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timelineId: selectedTimelineId,
          colleges,
          departments,
          offices,
          approverFlow,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Save configuration error:', errorText);
        throw new Error(`Failed to save configuration: ${errorText}`);
      }
      
      // Show success message
      alert('Configuration saved successfully!');
      
      // Reset checkboxes after successful save
      setCheckbox1Checked(false);
      setCheckbox2Checked(false);
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert('Failed to save configuration. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [selectedTimelineId, checkbox1Checked, checkbox2Checked, colleges, departments, offices, approverFlow]);

  return (
    <div className="min-h-screen bg-primary-foreground text-primary-foreground">
      
      {/* HEADER */}
      <div className="header mb-3">
        <CISOHeader />
      </div>

      {/* DASHBOARD CONTENT */}
      <main className="dashboard p-4">
        
        <h1 className="text-2xl text-left text-primary font-bold">College & Office Configuration</h1>

        <Breadcrumb className="mt-2">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/CISO-tools">Tools</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>College & Office Configuration</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mb-3 mt-2 flex items-center justify-end">
          <Button variant="back" size="back" onClick={() => navigate("/CISO-tools")}> 
              <div className="flex items-center gap-2">
                <img src="BlackArrowIcon.png" alt="back" className="h-4 w-4" />Back
              </div>
          </Button>
        </div>

        <div className="mt-4 space-y-5">
          
          <div className="w-full bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-black font-bold">Choose Semester</div>
            <div className="mt-3">
              <Select value={selectedTimelineId} onValueChange={(value) => {
                setSelectedTimelineId(value);
                localStorage.setItem('ciso-selected-timeline', value);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select clearance timeline" />
                </SelectTrigger>
                <SelectContent>
                  {timelines.map((timeline) => (
                    <SelectItem key={timeline.id} value={timeline.id}>
                      {timeline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedTimelineId && (
              <div className="mt-2">
                {(() => {
                  const timeline = timelines.find(t => t.id === selectedTimelineId);
                  if (!timeline) return null;
                  return (
                    <div className="text-sm text-gray-600">
                      <div>Academic Year: {timeline.academicYearStart}-{timeline.academicYearEnd}</div>
                      <div>Clearance Period: {timeline.clearanceStartDate} to {timeline.clearanceEndDate}</div>
                      <div className={`mt-1 font-semibold ${timeline.setAsActive ? 'text-red-600' : 'text-green-600'}`}>
                        Status: {timeline.setAsActive ? 'Active (Configuration Locked)' : 'Inactive'}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
          
          <div className="w-full space-y-5">
            
            <SectionListCard
              title="Colleges"
              headerActionImgAlt="Add"
              headerActionImgSrc="/WhitePlusIcon.png"
              headerActionOnClick={() => setAddCollegeOpen(true)}
            >
              <div className="p-4">
                <div className="space-y-2">
                  {colleges.map((c, idx) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-md bg-muted px-4 py-3"
                    >
                      <div className="min-w-0 text-sm font-semibold text-foreground">
                        {idx + 1}. {c.name} ({c.short})
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8 rounded-md bg-muted-foreground/20 text-foreground hover:bg-muted-foreground/20"
                          onClick={() => {
                            setEditingCollegeId(c.id);
                            setEditCollegeOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8 rounded-md"
                          onClick={() => {
                            setConfirmDelete({
                              open: true,
                              type: "college",
                              id: c.id,
                              label: c.name,
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SectionListCard>

            <SectionListCard
              title="College Departments"
              headerActionImgAlt="Add"
              headerActionImgSrc="/WhitePlusIcon.png"
              headerActionOnClick={() => setAddDepartmentOpen(true)}
            >
              <div className="p-4">
                <div className="text-xs font-semibold text-muted-foreground">Filter by College</div>
                <div className="mt-2">
                  <Select value={selectedCollegeId} onValueChange={setSelectedCollegeId}>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Choose from dropdown" />
                    </SelectTrigger>
                    <SelectContent>
                      {colleges.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Divider className="my-4 border-[hsl(var(--gray-border))]" />

                <div className="space-y-2">
                  {filteredDepartments.map((d, idx) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between rounded-md bg-muted px-4 py-3"
                    >
                      <div className="min-w-0 text-sm font-semibold text-foreground">
                        {idx + 1}. {d.name} ({d.short})
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8 rounded-md bg-muted-foreground/20 text-foreground hover:bg-muted-foreground/20"
                          onClick={() => {
                            setEditingDepartmentId(d.id);
                            setEditDepartmentOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8 rounded-md"
                          onClick={() => {
                            setConfirmDelete({
                              open: true,
                              type: "department",
                              id: d.id,
                              label: d.name,
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SectionListCard>

            <SectionListCard
              title="Offices"
              headerActionImgAlt="Add"
              headerActionImgSrc="/WhitePlusIcon.png"
              headerActionOnClick={() => setAddOfficeOpen(true)}
            >
              <div className="p-4">
                <div className="space-y-2">
                  {offices.map((o, idx) => (
                    <div
                      key={o.id}
                      className="flex items-center justify-between rounded-md bg-muted px-4 py-3"
                    >
                      <div className="min-w-0 text-sm font-semibold text-foreground">
                        {idx + 1}. {o.name} ({o.short})
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8 rounded-md bg-muted-foreground/20 text-foreground hover:bg-muted-foreground/20"
                          onClick={() => {
                            setEditingOfficeId(o.id);
                            setEditOfficeOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8 rounded-md"
                          onClick={() => {
                            setConfirmDelete({
                              open: true,
                              type: "office",
                              id: o.id,
                              label: o.name,
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SectionListCard>

            <SectionListCard
              title="Approver Flow"
              headerActions={
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="icon"
                    size="icon"
                    className="text-primary-foreground"
                    onClick={() => setEditApproverFlowOpen(true)}
                  >
                    <img src="/WhiteDirectionIcon.png" alt="List Ordered" className="h-5 w-5 object-contain" />
                  </Button>

                  <Button
                    type="button"
                    variant="icon"
                    size="icon"
                    className="text-primary-foreground"
                    onClick={() => setAddApproverOpen(true)}
                  >
                    <img src="/WhitePlusIcon.png" alt="Add" className="h-6 w-6 object-contain" />
                  </Button>
                </div>
              }
            >
              <div className="p-4">
                <div className="space-y-2">
                  {approverFlow.map((a, idx) => {
                    const isAll = a.collegeIds.length === 0 || a.collegeIds.length === colleges.length;
                    const badges = isAll
                      ? ["ALL"]
                      : a.collegeIds
                          .map((id) => colleges.find((c) => c.id === id)?.short)
                          .filter((v): v is string => !!v);

                    return (
                      <div
                        key={a.id}
                        className="flex items-center justify-between rounded-md bg-muted px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground">
                            {idx + 1}. {a.category}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {badges.map((b) => (
                              <Badge key={b} className="h-5 rounded-full px-2 text-[10px]">
                                {b}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="h-8 w-8 rounded-md bg-muted-foreground/20 text-foreground hover:bg-muted-foreground/20"
                            onClick={() => {
                              setEditingApproverId(a.id);
                              setEditApproverOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8 rounded-md"
                            onClick={() => {
                              setConfirmDelete({
                                open: true,
                                type: "approver",
                                id: a.id,
                                label: a.category,
                              });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </SectionListCard>
          </div>
        </div>

        <AddCollegeDialog
          open={addCollegeOpen}
          onOpenChange={setAddCollegeOpen}
          onCreate={({ college, departments: newDepartments }) => {
            (async () => {
              const created = await apiJson<CollegeItem>(
                "/admin/xu-faculty-clearance/api/ciso/colleges",
                {
                  method: "POST",
                  body: JSON.stringify({ name: college.name, short: college.short }),
                }
              );

              try {
                await fetch("/admin/xu-faculty-clearance/api/ciso/activity-logs", {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    event_type: "created_college",
                    details: created?.name ? [`College: ${created.name}`] : [],
                    user_role: "CISO",
                  }),
                });
              } catch {
                // ignore
              }

              postCISOActivityLog({
                event_type: "created_college",
                details: created?.name ? [`College: ${created.name}`] : [],
              });

              setColleges((prev) => [...prev, created]);
              setSelectedCollegeId(created.id);

              const deptDrafts = (newDepartments || []).filter((d) => d.name.trim() || d.short.trim());
              if (deptDrafts.length) {
                const createdDepts = await Promise.all(
                  deptDrafts.map((d) =>
                    apiJson<DepartmentItem>("/admin/xu-faculty-clearance/api/ciso/departments", {
                      method: "POST",
                      body: JSON.stringify({
                        collegeId: created.id,
                        name: d.name,
                        short: d.short,
                      }),
                    })
                  )
                );
                for (const dept of createdDepts) {
                  try {
                    await fetch("/admin/xu-faculty-clearance/api/ciso/activity-logs", {
                      method: "POST",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        event_type: "created_department",
                        details: [
                          dept?.name ? `Department: ${dept.name}` : "",
                          created?.name ? `College: ${created.name}` : "",
                        ].filter(Boolean),
                        user_role: "CISO",
                      }),
                    });
                  } catch {
                    // ignore
                  }

                  postCISOActivityLog({
                    event_type: "created_department",
                    details: [
                      dept?.name ? `Department: ${dept.name}` : "",
                      created?.name ? `College: ${created.name}` : "",
                    ].filter(Boolean),
                  });
                }
                setDepartments((prev) => [...prev, ...createdDepts]);
              }
            })().catch(() => {
              // ignore; can be handled by UI later
            });
          }}
        />

        <AddApproverDialog
          open={addApproverOpen}
          onOpenChange={setAddApproverOpen}
          colleges={colleges}
          categories={approverCategories}
          onCreate={(payload) => {
            (async () => {

              // Check for duplicate approver with same category and colleges
              const isDuplicate = approverFlow.some(existing => {
                const categoryMatch = existing.category === payload.category;
                const collegeMatch = JSON.stringify(existing.collegeIds.sort()) === JSON.stringify(payload.collegeIds.sort());
                return categoryMatch && collegeMatch;
              });
              
              if (isDuplicate) {
                alert('An approver with this category and college selection already exists!');
                return;
              }
              
              const addedCollegeNames = payload.collegeIds
                .map((id) => colleges.find((c) => c.id === id)?.name)
                .filter(Boolean);

              // Only update local approverFlow; persistence happens when configuration is saved
              setApproverFlow((prev) => [
                ...prev,
                {
                  id: `temp-${Date.now()}-${prev.length}`,
                  category: payload.category,
                  collegeIds: payload.collegeIds,
                  order: prev.length,
                },
              ]);

            })().catch(() => {
              // ignore; can be handled by UI later
            });
          }}
        />

        <AddDepartmentDialog
          open={addDepartmentOpen}
          onOpenChange={setAddDepartmentOpen}
          collegeName={selectedCollegeName}
          onCreate={(payload) => {
            if (!selectedCollegeId) return;
            (async () => {
              const created = await apiJson<DepartmentItem>(
                "/admin/xu-faculty-clearance/api/ciso/departments",
                {
                  method: "POST",
                  body: JSON.stringify({
                    collegeId: selectedCollegeId,
                    name: payload.name,
                    short: payload.short,
                  }),
                }
              );

              try {
                await fetch("/admin/xu-faculty-clearance/api/ciso/activity-logs", {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    event_type: "created_department",
                    details: [
                      created?.name ? `Department: ${created.name}` : "",
                      selectedCollegeName ? `College: ${selectedCollegeName}` : "",
                    ].filter(Boolean),
                    user_role: "CISO",
                  }),
                });
              } catch {
                // ignore
              }

              postCISOActivityLog({
                event_type: "created_department",
                details: [
                  created?.name ? `Department: ${created.name}` : "",
                  selectedCollegeName ? `College: ${selectedCollegeName}` : "",
                ].filter(Boolean),
              });
              setDepartments((prev) => [...prev, created]);
            })().catch(() => {
              // ignore; can be handled by UI later
            });
          }}
        />

        <AddOfficeDialog
          open={addOfficeOpen}
          onOpenChange={setAddOfficeOpen}
          onCreate={(payload) => {
            (async () => {
              const created = await apiJson<OfficeItem>(
                "/admin/xu-faculty-clearance/api/ciso/offices",
                {
                  method: "POST",
                  body: JSON.stringify({ name: payload.name, short: payload.short }),
                }
              );

              try {
                await fetch("/admin/xu-faculty-clearance/api/ciso/activity-logs", {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    event_type: "created_office",
                    details: created?.name ? [`Office: ${created.name}`] : [],
                    user_role: "CISO",
                  }),
                });
              } catch {
                // ignore
              }

              postCISOActivityLog({
                event_type: "created_office",
                details: created?.name ? [`Office: ${created.name}`] : [],
              });
              setOffices((prev) => [...prev, created]);
            })().catch(() => {
              // ignore; can be handled by UI later
            });
          }}
        />

        <EditCollegeDialog
          open={editCollegeOpen}
          onOpenChange={(open) => {
            setEditCollegeOpen(open);
            if (!open) setEditingCollegeId(null);
          }}
          initialValues={
            editingCollege
              ? {
                  name: editingCollege.name,
                  short: editingCollege.short,
                }
              : undefined
          }
          onSave={(payload) => {
            if (!editingCollegeId) return;
            (async () => {
              const previousName = colleges.find((c) => c.id === editingCollegeId)?.name ?? "";
              const updated = await apiJson<CollegeItem>(
                `/admin/xu-faculty-clearance/api/ciso/colleges/${editingCollegeId}`,
                {
                  method: "PATCH",
                  body: JSON.stringify({ name: payload.name, short: payload.short }),
                }
              );

              try {
                await fetch("/admin/xu-faculty-clearance/api/ciso/activity-logs", {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    event_type: "edited_college",
                    details: [
                      previousName ? `Previous: ${previousName}` : "",
                      updated.name ? `Updated: ${updated.name}` : "",
                    ].filter(Boolean),
                    user_role: "CISO",
                  }),
                });
              } catch {
                // ignore
              }

              postCISOActivityLog({
                event_type: "edited_college",
                details: [
                  previousName ? `Previous: ${previousName}` : "",
                  updated.name ? `Updated: ${updated.name}` : "",
                ].filter(Boolean),
              });
              setColleges((prev) => prev.map((c) => (c.id === editingCollegeId ? updated : c)));
            })();
          }}
        />

        <EditDepartmentDialog
          open={editDepartmentOpen}
          onOpenChange={(open) => {
            setEditDepartmentOpen(open);
            if (!open) setEditingDepartmentId(null);
          }}
          initialValues={
            editingDepartment
              ? {
                  name: editingDepartment.name,
                  short: editingDepartment.short,
                }
              : undefined
          }
          onSave={(payload) => {
            if (!editingDepartmentId) return;
            (async () => {
              const prevDept = departments.find((d) => d.id === editingDepartmentId);
              const prevDeptName = prevDept?.name ?? "";
              const prevCollegeName = colleges.find((c) => c.id === prevDept?.collegeId)?.name ?? "";
              const updated = await apiJson<DepartmentItem>(
                `/admin/xu-faculty-clearance/api/ciso/departments/${editingDepartmentId}`,
                {
                  method: "PATCH",
                  body: JSON.stringify({ name: payload.name, short: payload.short }),
                }
              );

              try {
                await fetch("/admin/xu-faculty-clearance/api/ciso/activity-logs", {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    event_type: "edited_department",
                    details: [
                      prevDeptName ? `Previous: ${prevDeptName}` : "",
                      prevCollegeName ? `College: ${prevCollegeName}` : "",
                      updated.name ? `Updated: ${updated.name}` : "",
                    ].filter(Boolean),
                    user_role: "CISO",
                  }),
                });
              } catch {
                // ignore
              }

              postCISOActivityLog({
                event_type: "edited_department",
                details: [
                  prevDeptName ? `Previous: ${prevDeptName}` : "",
                  prevCollegeName ? `College: ${prevCollegeName}` : "",
                  updated.name ? `Updated: ${updated.name}` : "",
                ].filter(Boolean),
              });
              setDepartments((prev) =>
                prev.map((d) => (d.id === editingDepartmentId ? updated : d))
              );
            })();
          }}
        />

        <EditOfficeDialog
          open={editOfficeOpen}
          onOpenChange={(open) => {
            setEditOfficeOpen(open);
            if (!open) setEditingOfficeId(null);
          }}
          initialValues={
            editingOffice
              ? {
                  name: editingOffice.name,
                  short: editingOffice.short,
                }
              : undefined
          }
          onSave={(payload) => {
            if (!editingOfficeId) return;
            (async () => {
              const prevOfficeName = offices.find((o) => o.id === editingOfficeId)?.name ?? "";
              const updated = await apiJson<OfficeItem>(
                `/admin/xu-faculty-clearance/api/ciso/offices/${editingOfficeId}`,
                {
                  method: "PATCH",
                  body: JSON.stringify({ name: payload.name, short: payload.short }),
                }
              );

              try {
                await fetch("/admin/xu-faculty-clearance/api/ciso/activity-logs", {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    event_type: "edited_office",
                    details: [
                      prevOfficeName ? `Previous: ${prevOfficeName}` : "",
                      updated.name ? `Updated: ${updated.name}` : "",
                    ].filter(Boolean),
                    user_role: "CISO",
                  }),
                });
              } catch {
                // ignore
              }

              postCISOActivityLog({
                event_type: "edited_office",
                details: [
                  prevOfficeName ? `Previous: ${prevOfficeName}` : "",
                  updated.name ? `Updated: ${updated.name}` : "",
                ].filter(Boolean),
              });
              setOffices((prev) => prev.map((o) => (o.id === editingOfficeId ? updated : o)));
            })();
          }}
        />

        <EditApproverDialog
          open={editApproverOpen}
          onOpenChange={(open) => {
            setEditApproverOpen(open);
            if (!open) setEditingApproverId(null);
          }}
          colleges={colleges}
          categories={approverCategories}
          initialValues={
            editingApprover
              ? {
                  category: editingApprover.category,
                  collegeIds: editingApprover.collegeIds,
                }
              : undefined
          }
          onSave={(payload) => {
            if (!editingApproverId) return;
            (async () => {
              const prevApprover = approverFlow.find((a) => a.id === editingApproverId);
              const prevCategory = prevApprover?.category ?? "";
              const editedCollegeNames = payload.collegeIds
                .map((id) => colleges.find((c) => c.id === id)?.name)
                .filter(Boolean);
              const updated = await apiJson<ApproverFlowItem>(
                `/admin/xu-faculty-clearance/api/ciso/approver-flow/steps/${editingApproverId}`,
                {
                  method: "PATCH",
                  body: JSON.stringify({ category: payload.category, collegeIds: payload.collegeIds }),
                }
              );

              try {
                await fetch("/admin/xu-faculty-clearance/api/ciso/activity-logs", {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    event_type: "edited_approver",
                    details: [
                      prevCategory ? `Previous: ${prevCategory}` : "",
                      payload.category ? `Updated: ${payload.category}` : "",
                      editedCollegeNames.length ? `Colleges: ${editedCollegeNames.join(", ")}` : "",
                    ].filter(Boolean),
                    user_role: "CISO",
                  }),
                });
              } catch {
                // ignore
              }
              setApproverFlow((prev) => prev.map((a) => (a.id === editingApproverId ? updated : a)));
            })();
          }}
        />

        <EditApproverFlowDialog
          open={editApproverFlowOpen}
          onOpenChange={setEditApproverFlowOpen}
          items={approverFlow}
          onSave={(next) => {
            (async () => {
              setApproverFlow(next);
              await apiJson<{ ok: boolean }>(
                "/admin/xu-faculty-clearance/api/ciso/approver-flow/order",
                {
                  method: "PUT",
                  body: JSON.stringify({ stepIds: next.map((s) => s.id) }),
                }
              );

              try {
                const details = next.map((step, idx) => {
                  const orderNum = idx + 1;
                  const categoryName = step.category || "Unknown";
                  return `${orderNum} ${categoryName}`;
                });
                await fetch("/admin/xu-faculty-clearance/api/ciso/activity-logs", {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    event_type: "edited_approver_flow",
                    details,
                    user_role: "CISO",
                  }),
                });
              } catch {
                // ignore
              }
            })();
          }}
        />

        <AlertDialog
          open={confirmDelete.open}
          onOpenChange={(open: boolean) => {
            if (!open) setConfirmDelete({ open: false });
          }}
        >
          <AlertDialogContent className="w-[420px] max-w-[calc(100vw-3rem)] rounded-xl bg-background p-0">
            <div className="rounded-xl bg-background">
              <AlertDialogHeader className="px-6 pb-4 pt-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full text-destructive">
                  <span className="text-2xl font-bold">!</span>
                </div>

                <AlertDialogTitle className="mt-4 text-base font-semibold text-foreground">
                  You are about to <span className="text-destructive">DELETE</span>
                </AlertDialogTitle>
                <div className="mt-1 text-base font-semibold text-foreground">
                  “{confirmDelete.open ? confirmDelete.label : ""}”
                </div>

                <div className="mt-4 text-sm font-semibold text-foreground">Do you wish to continue?</div>
              </AlertDialogHeader>

              <AlertDialogFooter className="mt-2 flex flex-col gap-2 px-6 pb-6 sm:flex-col sm:space-x-0">
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    console.log("[DEBUG] AlertDialogAction clicked", confirmDelete);
                    if (!confirmDelete.open) return;

                    if (confirmDelete.type === "college") {
                      (async () => {
                        postCISOActivityLog({
                          event_type: "deleted_college",
                          details: confirmDelete.label ? [`College: ${confirmDelete.label}`] : [],
                        });
                        await apiJson(
                          `/admin/xu-faculty-clearance/api/ciso/colleges/${confirmDelete.id}`,
                          { method: "DELETE" }
                        );
                        queueCISOActivityLog({
                          event_type: "deleted_college",
                          details: confirmDelete.label ? [`College: ${confirmDelete.label}`] : [],
                        });
                        setColleges((prev) => prev.filter((c) => c.id !== confirmDelete.id));
                        setDepartments((prev) => prev.filter((d) => d.collegeId !== confirmDelete.id));
                        setSelectedCollegeId((prev) => (prev === confirmDelete.id ? "" : prev));
                      })();
                    }

                    if (confirmDelete.type === "department") {
                      (async () => {
                        const dept = departments.find((d) => d.id === confirmDelete.id);
                        const collegeName = colleges.find((c) => c.id === dept?.collegeId)?.name ?? "";
                        const details = [
                          confirmDelete.label ? `Department: ${confirmDelete.label}` : "",
                          collegeName ? `College: ${collegeName}` : "",
                        ].filter(Boolean);

                        try {
                          await fetch("/admin/xu-faculty-clearance/api/ciso/activity-logs", {
                            method: "POST",
                            credentials: "include",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              event_type: "deleted_department",
                              details,
                              user_role: "CISO",
                            }),
                          });
                        } catch {
                          // ignore
                        }

                        await apiJson(
                          `/admin/xu-faculty-clearance/api/ciso/departments/${confirmDelete.id}`,
                          { method: "DELETE" }
                        );
                        setDepartments((prev) => prev.filter((d) => d.id !== confirmDelete.id));
                      })();
                    }

                    if (confirmDelete.type === "office") {
                      (async () => {
                        try {
                          await fetch("/admin/xu-faculty-clearance/api/ciso/activity-logs", {
                            method: "POST",
                            credentials: "include",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              event_type: "deleted_office",
                              details: confirmDelete.label ? [`Office: ${confirmDelete.label}`] : [],
                              user_role: "CISO",
                            }),
                          });
                        } catch {
                          // ignore
                        }

                        postCISOActivityLog({
                          event_type: "deleted_office",
                          details: confirmDelete.label ? [`Office: ${confirmDelete.label}`] : [],
                        });
                        await apiJson(
                          `/admin/xu-faculty-clearance/api/ciso/offices/${confirmDelete.id}`,
                          { method: "DELETE" }
                        );
                        setOffices((prev) => prev.filter((o) => o.id !== confirmDelete.id));
                      })();
                    }

                    if (confirmDelete.type === "approver") {
                      (async () => {
                        const step = approverFlow.find((a) => a.id === confirmDelete.id);
                        const isAll = !step || step.collegeIds.length === 0 || step.collegeIds.length === colleges.length;
                        const collegeTitles = isAll
                          ? ["ALL"]
                          : (step.collegeIds
                              .map((id) => colleges.find((c) => c.id === id)?.name)
                              .filter(Boolean) as string[]);
                        const details = [
                          step?.category ? `Department/Office Name = ("${step.category}")` : "",
                          `College : ${collegeTitles.length ? collegeTitles.join(", ") : ""}`,
                        ].filter((d) => {
                          const t = String(d ?? "").trim();
                          return !!t && t !== "College :";
                        });

                        try {
                          await fetch("/admin/xu-faculty-clearance/api/ciso/activity-logs", {
                            method: "POST",
                            credentials: "include",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              event_type: "removed_from_approver_flow",
                              details,
                              user_role: "CISO",
                            }),
                          });
                        } catch {
                          // ignore
                        }

                        // Only update local approverFlow; persistence happens when configuration is saved
                        setApproverFlow((prev) => prev.filter((a) => a.id !== confirmDelete.id));
                      })();
                    }

                    setConfirmDelete({ open: false });
                  }}
                >
                  Delete
                </AlertDialogAction>

                <AlertDialogCancel
                  className="h-11 w-full "
                  onClick={() => setConfirmDelete({ open: false })}
                >
                  Cancel
                </AlertDialogCancel>
              </AlertDialogFooter>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        <div className="mt-4 space-y-5">
          <div className="w-full bg-white rounded-lg border border-gray-200 p-6">

            <div className="space-y-3">
              <div className="flex items-center gap-4 border-2 border-muted-foreground p-4 rounded bg-foregroundLight">
                <Checkbox 
                  variant="gray" 
                  checked={checkbox1Checked}
                  onCheckedChange={(checked) => setCheckbox1Checked(checked === true)}
                  disabled={isConfigurationLocked}
                /> 
                <label htmlFor="checkbox1" className="text-sm text-gray-700"><span className="font-bold">I agree</span> that all Colleges, Departments, and Offices that are necessary to the Faculty Clearance Process are present and are readily configured in this page.</label>
              </div>
              <div className="flex items-center gap-4 border-2 border-muted-foreground p-4 rounded bg-foregroundLight">
                <Checkbox 
                  variant="gray" 
                  checked={checkbox2Checked}
                  onCheckedChange={(checked) => setCheckbox2Checked(checked === true)}
                  disabled={isConfigurationLocked}
                /> 
                <label htmlFor="checkbox2" className="text-sm text-gray-700"><span className="font-bold">I understand</span> that once a Clearance Timeline is in an "Active" state, I cannot make any changes to the configuration.</label>
              </div>
            </div>
            <div className="mt-3">
              <Button 
                variant="default" 
                className="w-full font-bold"
                disabled={!checkbox1Checked || !checkbox2Checked || isSaving || isConfigurationLocked}
                onClick={handleSaveConfiguration}
              >
                {isSaving ? 'Saving...' : 'I Agree and Understand'}
              </Button>
              {isConfigurationLocked && (
                <div className="mt-2 text-sm text-red-600 text-center">
                  Configuration is locked because the timeline is active.
                </div>
              )}
            </div>
          </div>
        </div>

      </main>

    </div>
  );
}