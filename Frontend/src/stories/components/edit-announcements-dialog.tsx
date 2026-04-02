import * as React from "react";

import { Button } from "./button";
import { Dialog, DialogContent, DialogTrigger } from "./dialog";
import { Checkbox } from "./checkbox";
import { Input } from "./input";
import { Textarea } from "./textarea";

import type { AnnouncementItem } from "./cards";

export const ANNOUNCEMENTS_STORAGE_KEY = "system_announcements_items_v1";

const DEFAULT_ANNOUNCEMENTS_ITEMS: AnnouncementItem[] = [
  {
    pinned: true,
    title: "System Maintenance Notice",
    description:
      "The faculty clearance portal will be unavailable this Saturday from 8:00 AM to 12:00 NN for scheduled maintenance",
    timestamp: "December 1, 2025, 12:00 PM",
    enabled: true,
  },
];

export function loadAnnouncementsItems(): AnnouncementItem[] {
  try {
    const raw = localStorage.getItem(ANNOUNCEMENTS_STORAGE_KEY);
    if (!raw) return DEFAULT_ANNOUNCEMENTS_ITEMS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_ANNOUNCEMENTS_ITEMS;
    return parsed as AnnouncementItem[];
  } catch {
    return DEFAULT_ANNOUNCEMENTS_ITEMS;
  }
}

export function saveAnnouncementsItems(items: AnnouncementItem[]) {
  localStorage.setItem(ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(items));
}

export type EditAnnouncementsDialogInitialValues = {
  title?: string;
  description?: string;
  pinned?: boolean;
};

export type EditAnnouncementsDialogProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  initialValues?: EditAnnouncementsDialogInitialValues;
  onSave?: (payload: { title: string; description: string; pinned: boolean }) => void;
};

export function EditAnnouncementsDialog({
  open,
  onOpenChange,
  trigger,
  initialValues,
  onSave,
}: EditAnnouncementsDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = typeof open === "boolean";
  const effectiveOpen = isControlled ? open : internalOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [pinned, setPinned] = React.useState(false);

  React.useEffect(() => {
    if (!effectiveOpen) return;
    setTitle(initialValues?.title ?? "");
    setDescription(initialValues?.description ?? "");
    setPinned(initialValues?.pinned ?? false);
  }, [effectiveOpen, initialValues?.description, initialValues?.pinned, initialValues?.title]);

  return (
    <Dialog open={effectiveOpen} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}

      <DialogContent className="w-[420px] max-w-[calc(100vw-3rem)] rounded-xl p-0">
        <div className="rounded-xl bg-background">
          <div className="px-6 pb-4 pt-6">
            <div className="text-center text-base font-bold text-foreground">Edit Announcements</div>

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

              <label className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox
                  variant="primary"
                  checked={pinned}
                  onCheckedChange={(v) => setPinned(v === true)}
                />
                Pin this announcement
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
                  onSave?.({ title, description, pinned });
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
