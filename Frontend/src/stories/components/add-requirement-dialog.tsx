import * as React from "react";
import { Check, Search, X } from "lucide-react";

import { Button } from "./button";
import { Checkbox } from "./checkbox";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "./dialog";
import { Input } from "./input";
import { SearchInputGroup } from "./input-group";
import { InputGroupWithAddon } from "./input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

export type FacultyOption = {
  id: string;
  name: string;
  subtitle?: string;
  email?: string;
  college?: string;
  department?: string;
};

export type CollegeOption = {
  id: number;
  name: string;
  abbreviation: string;
};

export type DepartmentOption = {
  id: number;
  name: string;
  abbreviation: string;
  college: string;
};

export type AddRequirementPayload = {
  title: string;
  description: string;
  facultyIds: string[];
  recipientScope?: string;
  targetColleges?: number[];
  targetDepartments?: number[];
  targetOffices?: number[];
  targetFaculty?: string[];
  physicalSubmission: boolean;
};

export type AddRequirementDialogProps = {
  trigger: React.ReactNode;
  facultyOptions?: FacultyOption[];
  initialValues?: Partial<AddRequirementPayload>;
  dialogTitle?: string;
  saveLabel?: string;
  onSave?: (payload: AddRequirementPayload) => void;
  onCancel?: () => void;
};

type ApproverRole = 'college_dean' | 'department_chair' | 'office_approver' | null;

type ApproverProfile = {
  approver_type: string;
  college?: string;
  department?: string;
  office?: string;
};

export function AddRequirementDialog({
  trigger,
  initialValues,
  dialogTitle = "Add Requirement",
  saveLabel = "Save",
  onSave,
  onCancel,
}: AddRequirementDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [approverProfile, setApproverProfile] = React.useState<ApproverProfile | null>(null);
  const [approverRole, setApproverRole] = React.useState<ApproverRole>(null);

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [physicalSubmission, setPhysicalSubmission] = React.useState(false);

  // Recipient selection states
  const [recipientScope, setRecipientScope] = React.useState<string>("individual");
  const [facultyOpen, setFacultyOpen] = React.useState(false);
  const [facultyQuery, setFacultyQuery] = React.useState("");
  const [facultyIds, setFacultyIds] = React.useState<string[]>([]);
  const [facultyOptions, setFacultyOptions] = React.useState<FacultyOption[]>([]);
  
  const [colleges, setColleges] = React.useState<CollegeOption[]>([]);
  const [departments, setDepartments] = React.useState<DepartmentOption[]>([]);
  const [selectedColleges, setSelectedColleges] = React.useState<number[]>([]);
  const [selectedDepartments, setSelectedDepartments] = React.useState<number[]>([]);

  // Load options when dialog opens
  React.useEffect(() => {
    if (!open) return;
    
    // Reset form
    setRecipientScope(initialValues?.recipientScope || "individual");
    setTitle(initialValues?.title ?? "");
    setDescription(initialValues?.description ?? "");
    setPhysicalSubmission(Boolean(initialValues?.physicalSubmission));
    setFacultyIds(initialValues?.facultyIds ?? []);
    setSelectedColleges(initialValues?.targetColleges ?? []);
    setSelectedDepartments(initialValues?.targetDepartments ?? []);
    setFacultyQuery("");
    
    // Load approver profile and options
    loadApproverProfile();
    loadOptions();
  }, [open, initialValues]);

  const loadApproverProfile = async () => {
    try {
      const response = await fetch("/admin/xu-faculty-clearance/api/approver/dashboard");
      if (response.ok) {
        const data = await response.json();
        if (data.approverInfo) {
          const profile: ApproverProfile = {
            approver_type: data.approverInfo.approver_type,
            college: data.approverInfo.college || undefined,
            department: data.approverInfo.department || undefined,
            office: data.approverInfo.office || undefined,
          };
          setApproverProfile(profile);
          
          // Determine role based on assigned fields and department name
          if (profile.office && !profile.college && !profile.department) {
            // Only has office - Office Approver
            setApproverRole('office_approver');
          } else if (profile.college && profile.department) {
            // Has both college and department
            if (profile.department.toLowerCase().includes('dean')) {
              // Department name contains "Dean" - College Dean
              setApproverRole('college_dean');
            } else {
              // Regular department - Department Chair
              setApproverRole('department_chair');
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to load approver profile:", error);
    }
  };

  const loadOptions = async () => {
    try {
      // Load faculty options
      const facultyResponse = await fetch("/admin/xu-faculty-clearance/api/approver/faculty-options");
      if (facultyResponse.ok) {
        const facultyData = await facultyResponse.json();
        setFacultyOptions(facultyData.options || []);
      }

      // Load college/department options
      const collegeDeptResponse = await fetch("/admin/xu-faculty-clearance/api/approver/college-department-options");
      if (collegeDeptResponse.ok) {
        const data = await collegeDeptResponse.json();
        setColleges(data.colleges || []);
        setDepartments(data.departments || []);
      }
    } catch (error) {
      console.error("Failed to load options:", error);
    }
  };

  // Get available recipient scopes based on approver role
  const getAvailableRecipientScopes = () => {
    const scopes = [];
    
    switch (approverRole) {
      case 'college_dean':
        scopes.push(
          { value: 'college', label: 'By College' },
          { value: 'department', label: 'By Department' },
          { value: 'individual', label: 'Individual Faculty' }
        );
        break;
      case 'department_chair':
        scopes.push(
          { value: 'department', label: 'By Department' },
          { value: 'individual', label: 'Individual Faculty' }
        );
        break;
      case 'office_approver':
        scopes.push(
          { value: 'all', label: 'All Faculty' },
          { value: 'college', label: 'By College' },
          { value: 'department', label: 'By Department' },
          { value: 'individual', label: 'Individual Faculty' }
        );
        break;
      default:
        // Fallback to all scopes if role is not determined
        scopes.push(
          { value: 'all', label: 'All Faculty' },
          { value: 'college', label: 'By College' },
          { value: 'department', label: 'By Department' },
          { value: 'individual', label: 'Individual Faculty' }
        );
    }
    
    return scopes;
  };

  // Filter colleges based on approver role
  const getFilteredColleges = () => {
    if (approverRole === 'office_approver') {
      // Office approver can see all colleges
      return colleges;
    } else if (approverRole === 'college_dean' && approverProfile?.college) {
      // College dean can only see their college
      return colleges.filter(college => college.name === approverProfile.college);
    } else if (approverRole === 'department_chair' && approverProfile?.college) {
      // Department chair can only see their college (but will primarily use department selection)
      return colleges.filter(college => college.name === approverProfile.college);
    }
    return colleges;
  };

  // Filter departments based on approver role
  const getFilteredDepartments = () => {
    if (approverRole === 'office_approver') {
      // Office approver can see all departments
      return departments;
    } else if (approverRole === 'college_dean' && approverProfile?.college) {
      // College dean can see all departments in their college except dean department
      return departments.filter(dept => 
        dept.college === approverProfile?.college && 
        !dept.name.toLowerCase().includes('dean')
      );
    } else if (approverRole === 'department_chair' && approverProfile?.department) {
      // Department chair can only see their department
      return departments.filter(dept => dept.name === approverProfile.department);
    }
    return departments;
  };

  // Filter faculty based on approver role and recipient scope
  const getFilteredFaculty = () => {
    let filtered = facultyOptions;
    
    if (approverRole === 'college_dean' && approverProfile?.college) {
      // College dean - faculty from their college only
      filtered = filtered.filter(f => f.college === approverProfile.college);
    } else if (approverRole === 'department_chair' && approverProfile?.department) {
      // Department chair - faculty from their department only
      filtered = filtered.filter(f => f.department === approverProfile.department);
    }
    // Office approver can see all faculty (no filtering needed)
    
    // Apply search query
    const q = facultyQuery.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((f) => 
        f.name.toLowerCase().includes(q) ||
        f.id.toLowerCase().includes(q) ||
        (f.subtitle ? f.subtitle.toLowerCase().includes(q) : false)
      );
    }
    
    return filtered;
  };

  const filteredFaculty = getFilteredFaculty();

  const allFilteredSelected =
    filteredFaculty.length > 0 &&
    filteredFaculty.every((f) => facultyIds.includes(f.id));

  const toggleSelectAllFiltered = (checked: boolean) => {
    if (!checked) {
      const filteredIds = new Set(filteredFaculty.map((f) => f.id));
      setFacultyIds((prev) => prev.filter((id) => !filteredIds.has(id)));
      return;
    }

    setFacultyIds((prev) => {
      const next = new Set(prev);
      for (const f of filteredFaculty) next.add(f.id);
      return Array.from(next);
    });
  };

  const toggleFaculty = (id: string) => {
    setFacultyIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  };

  const allSelected = facultyOptions.length > 0 && facultyIds.length === facultyOptions.length;
  const selectedPrimaryId = facultyIds[0];
  const selectedOthersCount = Math.max(0, facultyIds.length - 1);

  const getPlaceholderText = () => {
    switch (recipientScope) {
      case "all":
        return "All Faculty";
      case "college":
        if (selectedColleges.length === 0) return "Select Colleges";
        return ""; // Empty when colleges are selected since we show chips
      case "department":
        if (selectedDepartments.length === 0) return "Select Departments";
        return ""; // Empty when departments are selected since we show chips
      case "individual":
        if (facultyIds.length === 0) return "Search Faculty";
        return ""; // Empty when faculty are selected since we show chips
      default:
        return "Select Recipients";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="w-[420px] max-w-[calc(100vw-3rem)] max-h-[calc(100vh-3rem)] overflow-y-auto overflow-x-hidden rounded-xl p-0">
        <div className="rounded-xl bg-background">
          <div className="px-6 pb-4 pt-6">
            <div className="text-center text-base font-bold text-foreground">{dialogTitle}</div>

            <div className="mt-4 space-y-3">
              {/* Recipient Selection */}
              <div className="flex w-full items-center gap-2 border-b border-[hsl(var(--gray-border))] pb-2">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  {recipientScope === "individual" && facultyIds.length > 0 && (
                    <>
                      {allSelected ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-foreground">
                          <span className="truncate">All</span>
                          <button
                            type="button"
                            className="text-muted-foreground"
                            onClick={() => setFacultyIds([])}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ) : null}

                      {!allSelected && selectedPrimaryId ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-foreground">
                          <span className="max-w-[140px] truncate">
                            {facultyOptions.find(f => f.id === selectedPrimaryId)?.name || selectedPrimaryId}
                          </span>
                          <button
                            type="button"
                            className="text-muted-foreground"
                            onClick={() =>
                              setFacultyIds((prev) => prev.filter((id) => id !== selectedPrimaryId))
                            }
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ) : null}

                      {!allSelected && selectedOthersCount ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-foreground">
                          <span className="truncate">{selectedOthersCount} others...</span>
                          <button
                            type="button"
                            className="text-muted-foreground"
                            onClick={() =>
                              setFacultyIds(() => (selectedPrimaryId ? [selectedPrimaryId] : []))
                            }
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ) : null}
                    </>
                  )}

                  {recipientScope === "college" && selectedColleges.map(collegeId => {
                    const college = colleges.find(c => c.id === collegeId);
                    return college ? (
                      <span key={collegeId} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-foreground">
                        <span className="truncate">{college.name}</span>
                        <button
                          type="button"
                          className="text-muted-foreground"
                          onClick={() => setSelectedColleges(prev => prev.filter(id => id !== collegeId))}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ) : null;
                  })}

                  {recipientScope === "department" && selectedDepartments.map(deptId => {
                    const dept = departments.find(d => d.id === deptId);
                    return dept ? (
                      <span key={deptId} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-foreground">
                        <span className="truncate">{dept.name}</span>
                        <button
                          type="button"
                          className="text-muted-foreground"
                          onClick={() => setSelectedDepartments(prev => prev.filter(id => id !== deptId))}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ) : null;
                  })}

                  <Input
                    value={recipientScope === "individual" ? facultyQuery : ""}
                    onChange={(e) => {
                      if (recipientScope === "individual") {
                        setFacultyQuery(e.target.value);
                        setFacultyOpen(true);
                      }
                    }}
                    placeholder={getPlaceholderText()}
                    className="h-6 min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 text-sm text-foreground shadow-none outline-none placeholder:text-muted-foreground focus-visible:ring-0"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-muted-foreground hover:bg-transparent focus-visible:ring-0"
                  onClick={() => setFacultyOpen(true)}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-1.5">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} size="sm" placeholder="Title"/>
              </div>

              <div className="space-y-1.5">
                <InputGroupWithAddon
                  value={description}
                  onValueChange={setDescription}
                  placeholder="Description"
                  className="w-full"
                />
              </div>

              <label className="mt-0 flex items-center gap-2 text-xs font-semibold text-foreground">
                <Checkbox
                  variant="primary"
                  checked={physicalSubmission}
                  onCheckedChange={(v) => setPhysicalSubmission(Boolean(v))}
                />
                Will Require Physical Submission
              </label>
            </div>
          </div>

          <div className="border-t border-[hsl(var(--gray-border))] px-6 py-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="cancel"
                className="h-11 w-full"
                onClick={() => {
                  onCancel?.();
                  setOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-11 w-full rounded-md"
                onClick={() => {
                  onSave?.({
                    title,
                    description,
                    facultyIds,
                    recipientScope,
                    targetColleges: selectedColleges,
                    targetDepartments: selectedDepartments,
                    targetOffices: [],
                    targetFaculty: facultyIds,
                    physicalSubmission,
                  });
                  setOpen(false);
                }}
              >
                {saveLabel}
              </Button>
            </div>
          </div>
        </div>

        {/* Faculty Search Dialog */}
        <Dialog open={facultyOpen} onOpenChange={setFacultyOpen}>
          <DialogContent className="w-[420px] max-w-[calc(100vw-3rem)] max-h-[calc(100vh-3rem)] overflow-y-auto overflow-x-hidden rounded-xl p-0">
            <div className="rounded-xl bg-background">
              <div className="px-6 pb-4 pt-6">
                <div className="text-center text-base font-bold text-foreground">Search Faculty</div>

                {/* Recipient Scope Selection */}
                <div className="mt-4 space-y-1.5">
                  <Select value={recipientScope} onValueChange={setRecipientScope}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select recipient scope" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableRecipientScopes().map((scope) => (
                        <SelectItem key={scope.value} value={scope.value}>
                          {scope.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* College/Department Selection */}
                {recipientScope === "college" && (
                  <div className="mt-3 space-y-1.5">
                    {approverRole === 'office_approver' ? (
                      // Multi-select for Office Approvers
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">Select colleges (multiple allowed):</div>
                        {getFilteredColleges().map((college) => (
                          <label key={college.id} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={selectedColleges.includes(college.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedColleges(prev => [...prev, college.id]);
                                } else {
                                  setSelectedColleges(prev => prev.filter(id => id !== college.id));
                                }
                              }}
                            />
                            <span className="text-sm">{college.name}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      // Single select for other roles
                      <Select 
                        value={selectedColleges.length > 0 ? selectedColleges[0].toString() : ""}
                        onValueChange={(value) => setSelectedColleges([parseInt(value)])}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select college" />
                        </SelectTrigger>
                        <SelectContent>
                          {getFilteredColleges().map((college) => (
                            <SelectItem key={college.id} value={college.id.toString()}>
                              {college.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {recipientScope === "department" && (
                  <div className="mt-3 space-y-1.5">
                    {approverRole === 'office_approver' ? (
                      // Multi-select for Office Approvers
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">Select departments (multiple allowed):</div>
                        {getFilteredDepartments().map((dept) => (
                          <label key={dept.id} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={selectedDepartments.includes(dept.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedDepartments(prev => [...prev, dept.id]);
                                } else {
                                  setSelectedDepartments(prev => prev.filter(id => id !== dept.id));
                                }
                              }}
                            />
                            <span className="text-sm">{dept.name} ({dept.college})</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      // Single select for other roles
                      <Select 
                        value={selectedDepartments.length > 0 ? selectedDepartments[0].toString() : ""}
                        onValueChange={(value) => setSelectedDepartments([parseInt(value)])}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {getFilteredDepartments().map((dept) => (
                            <SelectItem key={dept.id} value={dept.id.toString()}>
                              {dept.name} ({dept.college})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {/* Faculty Search - Only show for individual scope */}
                {recipientScope === "individual" && (
                  <>
                    <div className="mt-4">
                      <SearchInputGroup
                        value={facultyQuery}
                        onChange={(e) => setFacultyQuery(e.target.value)}
                        containerClassName="h-10"
                        placeholder="Search Faculty"
                      />
                    </div>

                    <div className="mt-4">
                      <button
                        type="button"
                        className={
                          allFilteredSelected
                            ? "w-full rounded-md bg-muted-foreground/20 px-4 py-3 text-left"
                            : "w-full rounded-md px-4 py-3 text-left"
                        }
                        onClick={() => toggleSelectAllFiltered(!allFilteredSelected)}
                      >
                        <div className="text-sm font-bold text-foreground">Select All</div>
                        <div className="mt-1 text-xs text-muted-foreground">Select All Faculty Members</div>
                      </button>
                    </div>

                    <div className="mt-4 space-y-3">
                      {filteredFaculty.map((f) => {
                        const selected = facultyIds.includes(f.id);
                        return (
                          <button
                            key={f.id}
                            type="button"
                            className={
                              selected
                                ? "w-full rounded-md bg-muted-foreground/20 px-4 py-3 text-left"
                                : "w-full rounded-md px-4 py-3 text-left"
                            }
                            onClick={() => toggleFaculty(f.id)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-foreground">{f.name}</div>
                                <div className="mt-1 text-xs text-muted-foreground">{f.subtitle ?? f.id}</div>
                                {f.college && (
                                  <div className="mt-1 text-xs text-muted-foreground">{f.college}</div>
                                )}
                              </div>
                              {selected ? (
                                <Check className="mt-1 h-5 w-5 shrink-0 text-foreground" />
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Show confirmation for non-individual scopes */}
                {recipientScope !== "individual" && (
                  <div className="mt-4">
                    <div className="rounded-md bg-muted px-4 py-3">
                      <div className="text-sm font-medium text-foreground">
                        {(() => {
                          if (recipientScope === "all") {
                            return "All Faculty";
                          } else if (recipientScope === "college") {
                            return selectedColleges.length === 1 
                              ? colleges.find(c => c.id === selectedColleges[0])?.name
                              : `${selectedColleges.length} colleges selected`;
                          } else if (recipientScope === "department") {
                            return selectedDepartments.length === 1
                              ? departments.find(d => d.id === selectedDepartments[0])?.name
                              : `${selectedDepartments.length} departments selected`;
                          }
                          return "";
                        })()}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {(() => {
                          if (recipientScope === "all") {
                            return "All faculty members will receive this requirement";
                          } else if (recipientScope === "college" && selectedColleges.length > 0) {
                            return selectedColleges.length === 1 
                              ? `All faculty in ${colleges.find(c => c.id === selectedColleges[0])?.name} will receive this requirement`
                              : `All faculty in ${selectedColleges.length} selected colleges will receive this requirement`;
                          } else if (recipientScope === "department" && selectedDepartments.length > 0) {
                            return selectedDepartments.length === 1
                              ? `All faculty in ${departments.find(d => d.id === selectedDepartments[0])?.name} will receive this requirement`
                              : `All faculty in ${selectedDepartments.length} selected departments will receive this requirement`;
                          }
                          return "";
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-[hsl(var(--gray-border))] px-6 py-4">
                <Button
                  type="button"
                  className="h-11 w-full rounded-md"
                  onClick={() => setFacultyOpen(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
