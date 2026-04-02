import * as React from "react";

import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { Dialog, DialogContent } from "./dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

export type ApproverFlowCollege = {
  id: string;
  name: string;
  short: string;
};

export type ApproverFlowItem = {
  id: string;
  category: string;
  collegeIds: string[];
};

export function AddApproverDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colleges: ApproverFlowCollege[];
  categories: string[];
  onCreate: (payload: { category: string; collegeIds: string[] }) => void;
}) {
  const { open, onOpenChange, colleges, categories, onCreate } = props;
  const [category, setCategory] = React.useState<string>(categories[0] ?? "");
  const [collegeIds, setCollegeIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!open) return;
    setCategory(categories[0] ?? "");
    setCollegeIds([]);
  }, [open, categories]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[420px] max-w-[calc(100vw-3rem)] rounded-xl p-0">
        <div className="rounded-xl bg-background">
          <div className="px-6 pb-4 pt-6">
            <div className="text-center text-base font-bold text-foreground">Add Approver</div>

            <div className="mt-6 space-y-4">
              <div>
                <div className="text-xs font-semibold text-foreground">Approver Category</div>
                <div className="mt-2">
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Choose from dropdown" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-foreground">College Respondents</div>
                <div className="mt-2 space-y-2 rounded-md bg-muted p-3">
                  {colleges.map((c) => {
                    const checked = collegeIds.includes(c.id);
                    return (
                      <label key={c.id} className="flex items-center gap-3 text-sm text-foreground">
                        <Checkbox
                          variant="primary"
                          checked={checked}
                          onCheckedChange={(v) => {
                            const nextChecked = v === true;
                            setCollegeIds((prev) => {
                              if (nextChecked) return prev.includes(c.id) ? prev : [...prev, c.id];
                              return prev.filter((id) => id !== c.id);
                            });
                          }}
                        />
                        <span className="truncate">{c.name}</span>
                      </label>
                    );
                  })}
                </div>
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
                onClick={async () => {
                  try {
                    await fetch("/admin/xu-faculty-clearance/api/ciso/activity-logs", {
                      method: "POST",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        event_type: "added_to_approver_flow",
                        user_role: "CISO",
                        details: category ? [`Department/Office Name = (\"${category}\")`] : [],
                      }),
                    });
                  } catch {
                    // ignore
                  }

                  onCreate({ category, collegeIds });
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

export function EditApproverDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colleges: ApproverFlowCollege[];
  categories: string[];
  initialValues?: { category: string; collegeIds: string[] };
  onSave: (payload: { category: string; collegeIds: string[] }) => void;
}) {
  const { open, onOpenChange, colleges, categories, initialValues, onSave } = props;
  const [category, setCategory] = React.useState<string>(categories[0] ?? "");
  const [collegeIds, setCollegeIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!open) return;
    setCategory(initialValues?.category ?? (categories[0] ?? ""));
    setCollegeIds(initialValues?.collegeIds ?? []);
  }, [open, initialValues?.category, initialValues?.collegeIds, categories]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[420px] max-w-[calc(100vw-3rem)] rounded-xl p-0">
        <div className="rounded-xl bg-background">
          <div className="px-6 pb-4 pt-6">
            <div className="text-center text-base font-bold text-foreground">Edit Approver</div>

            <div className="mt-6 space-y-4">
              <div>
                <div className="text-xs font-semibold text-foreground">Approver Category</div>
                <div className="mt-2">
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Choose from dropdown" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-foreground">College Respondents</div>
                <div className="mt-2 space-y-2 rounded-md bg-muted p-3">
                  {colleges.map((c) => {
                    const checked = collegeIds.includes(c.id);
                    return (
                      <label key={c.id} className="flex items-center gap-3 text-sm text-foreground">
                        <Checkbox
                          variant="primary"
                          checked={checked}
                          onCheckedChange={(v) => {
                            const nextChecked = v === true;
                            setCollegeIds((prev) => {
                              if (nextChecked) return prev.includes(c.id) ? prev : [...prev, c.id];
                              return prev.filter((id) => id !== c.id);
                            });
                          }}
                        />
                        <span className="truncate">{c.name}</span>
                      </label>
                    );
                  })}
                </div>
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
                  onSave({ category, collegeIds });
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

export function EditApproverFlowDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ApproverFlowItem[];
  onSave: (next: ApproverFlowItem[]) => void;
}) {
  const { open, onOpenChange, items, onSave } = props;
  const [draft, setDraft] = React.useState<ApproverFlowItem[]>([]);
  const [dragId, setDragId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setDraft(items);
    setDragId(null);
  }, [open, items]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[420px] max-w-[calc(100vw-3rem)] rounded-xl p-0">
        <div className="rounded-xl bg-background">
          <div className="px-6 pb-4 pt-6">
            <div className="text-center text-base font-bold text-lg text-foreground">Edit Approver Flow</div>

            <div className="mt-6 space-y-2">
              {draft.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => setDragId(item.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (!dragId || dragId === item.id) return;
                    setDraft((prev) => {
                      const fromIdx = prev.findIndex((x) => x.id === dragId);
                      const toIdx = prev.findIndex((x) => x.id === item.id);
                      if (fromIdx < 0 || toIdx < 0) return prev;
                      const next = [...prev];
                      const [moved] = next.splice(fromIdx, 1);
                      next.splice(toIdx, 0, moved);
                      return next;
                    });
                    setDragId(null);
                  }}
                  className="flex items-center gap-3 rounded-md bg-muted px-4 py-3"
                >
                  <img src="/BlackGroupIcon.png" alt="Grip" className="h-4 w-3" />
                  <div className="min-w-0 text-md font-semibold text-foreground">{item.category}</div>
                </div>
              ))}
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
                  onSave(draft);
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
