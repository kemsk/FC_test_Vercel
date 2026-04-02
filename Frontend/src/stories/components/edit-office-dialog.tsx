
import * as React from "react";
import { Button } from "./button";
import { Dialog, DialogContent } from "./dialog";
import { Input } from "./input";

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
                className="h-11 w-full rounded-md"
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