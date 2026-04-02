import * as React from "react";

import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "./dialog";
import { Input } from "./input";
import { Textarea } from "./textarea";

import type { SystemGuidlinesItem } from "./cards";

const SYSTEM_GUIDELINES_STORAGE_KEY = "system_guidelines_items_v1";

export const DEFAULT_SYSTEM_GUIDELINES_ITEMS: SystemGuidlinesItem[] = [
  {
    title: "General Safety Guidelines",
    description:
      "All personnel must adhere to the following safety protocols:\n\n1. Ensure that all System User Details are in correct format\n2. Ensure that the Clearance Period has been properly set and configured:\n   a. Academic Year\n   b. Semester\n   c. Clearance Period Start\n   d. Clearance Period End\n3. Ensure that all departments have their requirements set\n4. Contact Support if error occurs",
    email: "ciso@xu.edu.ph",
    timestamp: "December 1, 2025, 12:00 PM",
  },
];

export function loadSystemGuidelinesItems(): SystemGuidlinesItem[] {
  try {
    const raw = localStorage.getItem(SYSTEM_GUIDELINES_STORAGE_KEY);
    if (!raw) return DEFAULT_SYSTEM_GUIDELINES_ITEMS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_SYSTEM_GUIDELINES_ITEMS;
    return parsed as SystemGuidlinesItem[];
  } catch {
    return DEFAULT_SYSTEM_GUIDELINES_ITEMS;
  }
}

export function saveSystemGuidelinesItems(items: SystemGuidlinesItem[]) {
  localStorage.setItem(SYSTEM_GUIDELINES_STORAGE_KEY, JSON.stringify(items));
}

export type EditSystemGuidelinesPayload = {
  title: string;
  description: string;
};

export type EditSystemGuidelinesDialogProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  initialValues?: Partial<EditSystemGuidelinesPayload>;
  onSave?: (payload: EditSystemGuidelinesPayload) => void;
};

export function EditSystemGuidelinesDialog({
  open,
  onOpenChange,
  trigger,
  initialValues,
  onSave,
}: EditSystemGuidelinesDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = typeof open === "boolean";
  const effectiveOpen = isControlled ? open : internalOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");

  React.useEffect(() => {
    if (!effectiveOpen) return;
    setTitle(initialValues?.title ?? "");
    setDescription(initialValues?.description ?? "");
  }, [effectiveOpen, initialValues?.description, initialValues?.title]);

  return (
    <Dialog open={effectiveOpen} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}

      <DialogContent className="w-[420px] max-w-[calc(100vw-3rem)] rounded-xl p-0">
        <div className="rounded-xl bg-background">
          <div className="px-6 pb-4 pt-6">
            <div className="text-center text-base font-bold text-foreground">
              Edit System Guidelines
            </div>

            <div className="mt-4 space-y-3">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                size="sm"
                placeholder="Title"
              />

              <Textarea
              placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[160px]"
              />
            </div>
          </div>

          <div className="border-t border-[hsl(var(--gray-border))] px-6 py-4">
            <div className="grid grid-cols-2 gap-3">
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
                  onSave?.({ title, description });
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
