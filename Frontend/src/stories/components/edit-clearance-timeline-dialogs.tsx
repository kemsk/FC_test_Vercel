import * as React from "react";

import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { Dialog, DialogContent, DialogTrigger } from "./dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export type ClearanceTimelineDialogValues = {
  academicYearStart: string;
  academicYearEnd: string;
  term: string;
  clearanceStartDate: string;
  clearanceEndDate: string;
  setAsActive: boolean;
};

export type EditClearanceTimelineDialogProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  initialValues?: Partial<ClearanceTimelineDialogValues>;
  onSave?: (payload: ClearanceTimelineDialogValues) => void;
};

export type CreateClearanceTimelineDialogProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  initialValues?: Partial<ClearanceTimelineDialogValues>;
  onCreate?: (payload: ClearanceTimelineDialogValues) => void;
  hideTermField?: boolean;
  presetTerm?: string;
};

const TERM_OPTIONS = ["First Semester", "Second Semester", "Intersession"] as const;

function YearField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  clearable?: boolean;
  minYear?: number;
}) {
  const { label, value, onChange, clearable, minYear } = props;
  const [open, setOpen] = React.useState(false);

  const nowYear = new Date().getFullYear();
  const baseYear = (() => {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
    if (typeof minYear === "number" && Number.isFinite(minYear)) return minYear;
    return nowYear;
  })();

  const start = Math.floor(baseYear / 12) * 12;
  const years = Array.from({ length: 24 }, (_, i) => start + i);
  return (
    <div>
      <div className="text-xs font-semibold text-foreground">{label}</div>
      <div className="relative mt-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="action"
              className="h-10 w-full justify-between pl-9 pr-9 font-normal"
            >
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <span>{value ? value : "Year"}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto max-w-[calc(100vw-3rem)] overflow-hidden p-3 border border-primary"
            align="center"
            collisionPadding={24}
          >
            <div className="grid grid-cols-4 gap-2">
              {years.map((y) => {
                const disabled = typeof minYear === "number" ? y < minYear : false;
                const selected = String(y) === value;
                return (
                  <Button
                    key={y}
                    type="button"
                    variant={selected ? "default" : "cancel"}
                    className="h-9"
                    disabled={disabled}
                    onClick={() => {
                      if (disabled) return;
                      onChange(String(y));
                      setOpen(false);
                    }}
                  >
                    {y}
                  </Button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        {clearable && value ? (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            onClick={() => onChange("")}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function DateField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  minDate?: Date;
  maxDate?: Date;
}) {
  const { label, value, onChange, minDate, maxDate } = props;
  const [open, setOpen] = React.useState(false);
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  
  const parsedDate = React.useMemo(() => {
    if (!value) return undefined;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return parsed;
  }, [value]);

  const displayDate = React.useMemo(() => {
    if (!parsedDate) return "Date";
    return parsedDate.toLocaleDateString();
  }, [parsedDate]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const navigateMonth = (direction: number) => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
  };

  const isDateSelectable = (date: Date) => {
    if (minDate && date < minDate) return false;
    if (maxDate && date > maxDate) return false;
    return true;
  };

  // Set initial month to minDate or current date if within range
  React.useEffect(() => {
    if (minDate && new Date() < minDate) {
      setCurrentMonth(new Date(minDate.getFullYear(), minDate.getMonth(), 1));
    }
  }, [minDate]);
  
  return (
    <div>
      <div className="text-xs font-semibold text-foreground">{label}</div>
      <div className="relative mt-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="action"
              className="h-10 w-full justify-between pl-9 pr-9 font-normal"
            >
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <span>{displayDate}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto max-w-[calc(100vw-3rem)] overflow-hidden p-3 border border-primary"
            align="center"
            collisionPadding={24}
          >
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                className="p-1 hover:bg-accent rounded"
                onClick={() => navigateMonth(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="font-semibold">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
              <button
                type="button"
                className="p-1 hover:bg-accent rounded"
                onClick={() => navigateMonth(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-xs text-muted-foreground text-center p-1">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth(currentMonth).map((date, i) => {
                const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                const isSelected = parsedDate && date.toDateString() === parsedDate.toDateString();
                const isToday = new Date().toDateString() === date.toDateString();
                const isSelectable = isDateSelectable(date);
                
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!isCurrentMonth || !isSelectable}
                    className={`p-2 rounded hover:bg-accent ${
                      !isCurrentMonth || !isSelectable ? "text-muted-foreground cursor-not-allowed" : ""
                    } ${isSelected ? "bg-primary text-primary-foreground" : ""} ${
                      isToday ? "border border-primary" : ""
                    }`}
                    onClick={() => {
                      if (isCurrentMonth && isSelectable) {
                        const y = date.getFullYear();
                        const m = String(date.getMonth() + 1).padStart(2, "0");
                        const d = String(date.getDate()).padStart(2, "0");
                        onChange(`${y}-${m}-${d}`);
                        setOpen(false);
                      }
                    }}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

function TimelineDialogShell(props: {
  mode: "edit" | "create";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  initialValues?: Partial<ClearanceTimelineDialogValues>;
  onSubmit?: (payload: ClearanceTimelineDialogValues) => void;
  hideTermField?: boolean;
  presetTerm?: string;
}) {
  const { mode, open, onOpenChange, trigger, initialValues, onSubmit, hideTermField, presetTerm } = props;

  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = typeof open === "boolean";
  const effectiveOpen = isControlled ? open : internalOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const [startYear, setStartYear] = React.useState("");
  const [endYear, setEndYear] = React.useState("");
  const [term, setTerm] = React.useState("");
  const [clearanceStartDate, setClearanceStartDate] = React.useState("");
  const [clearanceEndDate, setClearanceEndDate] = React.useState("");
  const [setAsActive, setSetAsActive] = React.useState(false);

  const numericStartYear = React.useMemo(() => {
    const n = Number(startYear);
    if (!Number.isFinite(n)) return undefined;
    if (String(Math.trunc(n)).length !== 4) return undefined;
    return Math.trunc(n);
  }, [startYear]);

  const minEndYear = React.useMemo(() => {
    if (typeof numericStartYear !== "number") return undefined;
    return numericStartYear + 1;
  }, [numericStartYear]);

  // Calculate min and max dates for clearance period based on academic year
  const clearanceMinDate = React.useMemo(() => {
    if (typeof numericStartYear !== "number") return undefined;
    return new Date(numericStartYear, 0, 1); // January 1st of start year
  }, [numericStartYear]);

  const clearanceMaxDate = React.useMemo(() => {
    const numericEndYear = Number(endYear);
    if (typeof numericEndYear !== "number" || String(Math.trunc(numericEndYear)).length !== 4) return undefined;
    return new Date(numericEndYear, 11, 31); // December 31st of end year
  }, [endYear]);

  React.useEffect(() => {
    if (!effectiveOpen) return;
    setStartYear(initialValues?.academicYearStart ?? "");
    setEndYear(initialValues?.academicYearEnd ?? "");
    setTerm(initialValues?.term ?? presetTerm ?? "");
    setClearanceStartDate(initialValues?.clearanceStartDate ?? "");
    setClearanceEndDate(initialValues?.clearanceEndDate ?? "");
    setSetAsActive(initialValues?.setAsActive ?? false);
  }, [
    effectiveOpen,
    initialValues?.academicYearEnd,
    initialValues?.academicYearStart,
    initialValues?.clearanceEndDate,
    initialValues?.clearanceStartDate,
    initialValues?.setAsActive,
    initialValues?.term,
    presetTerm,
  ]);

  const title = mode === "edit" ? "Edit Timeline" : "Create Timeline";
  const submitLabel = mode === "edit" ? "Save" : "Create";

  return (
    <Dialog open={effectiveOpen} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}

      <DialogContent className="w-[420px] max-w-[calc(100vw-3rem)] rounded-xl p-0">
        <div className="rounded-xl bg-background">
          <div className="px-6 pb-4 pt-6">
            <div className="relative flex items-center justify-center">
              <div className="text-center text-base font-bold text-foreground">{title}</div>
            </div>

            <div className="mt-6 space-y-5">
              <YearField
                label="Start Year"
                value={startYear}
                onChange={(next) => {
                  setStartYear(next);
                  const n = Number(next);
                  if (Number.isFinite(n) && String(Math.trunc(n)).length === 4) {
                    setEndYear(String(Math.trunc(n) + 1));
                    return;
                  }
                  setEndYear("");
                }}
                clearable
              />

              <YearField
                label="End Year"
                value={endYear}
                minYear={minEndYear}
                onChange={(next) => {
                  if (typeof minEndYear === "number") {
                    const n = Number(next);
                    if (Number.isFinite(n) && n < minEndYear) return;
                  }
                  setEndYear(next);
                }}
              />

              <div className="mt-5" />

              <DateField
                label="Clearance Period Start Date"
                value={clearanceStartDate}
                onChange={setClearanceStartDate}
                minDate={clearanceMinDate}
                maxDate={clearanceMaxDate}
              />

              <DateField
                label="Clearance Period End Date"
                value={clearanceEndDate}
                onChange={setClearanceEndDate}
                minDate={clearanceMinDate}
                maxDate={clearanceMaxDate}
              />

              <div className="pt-2">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <Checkbox
                    variant="primary"
                    checked={setAsActive}
                    onCheckedChange={(next) => setSetAsActive(next === true)}
                  />
                  <span>Set as active clearance period</span>
                </label>
              </div>
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
                  onSubmit?.({
                    academicYearStart: startYear,
                    academicYearEnd: endYear,
                    term,
                    clearanceStartDate,
                    clearanceEndDate,
                    setAsActive,
                  });
                }}
              >
                {submitLabel}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function EditClearanceTimelineDialog(props: EditClearanceTimelineDialogProps) {
  const { open, onOpenChange, trigger, initialValues, onSave } = props;
  return (
    <TimelineDialogShell
      mode="edit"
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      initialValues={initialValues}
      onSubmit={onSave}
      hideTermField
    />
  );
}

export function CreateClearanceTimelineDialog(props: CreateClearanceTimelineDialogProps) {
  const { open, onOpenChange, trigger, initialValues, onCreate, hideTermField, presetTerm } = props;
  return (
    <TimelineDialogShell
      mode="create"
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      initialValues={initialValues}
      onSubmit={onCreate}
      hideTermField={hideTermField}
      presetTerm={presetTerm}
    />
  );
}
