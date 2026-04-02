import * as React from "react";

import "../../index.css"; 
import { CISOHeader } from "../../stories/components/header";

import {
  SectionListCard,
  type SystemGuidlinesItem,
} from "../../stories/components/cards";

import { Button } from "../../stories/components/button";
import { Divider } from "../../stories/components/divider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
} from "../../stories/components/alert-dialog";

import {
  EditSystemGuidelinesDialog,
  loadSystemGuidelinesItems,
} from "../../stories/components/edit-system-guidelines-dialog";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../../stories/components/breadcrumb";
import { Link, useNavigate } from "react-router-dom";

// Helper to POST notifications for multiple roles
function postCISONotification(payload: {
  title: string;
  body: string;
  details: string[];
  status: null;
  is_read: 0;
  user_roles: string[];
  created_by_id?: string | number | null;
  approver_id?: string | number | null;
  clearance_period_start_date?: string | null;
  clearance_period_end_date?: string | null;
}) {
  fetch("/admin/xu-faculty-clearance/api/ciso/notifications", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then(async (r) => {
      if (r.ok) return;
      const text = await r.text().catch(() => "");
      console.error("CISO notification POST failed", r.status, text);
    })
    .catch((e) => {
      console.error("CISO notification POST threw", e);
    });
}

function GuidelinesToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={
        checked
          ? "relative h-6 w-12 rounded-full bg-success"
          : "relative h-6 w-12 rounded-full bg-muted-foreground/30"
      }
      onClick={() => onChange(!checked)}
    >
      <span
        className={
          checked
            ? "absolute left-[26px] top-1 h-4 w-4 rounded-full bg-white"
            : "absolute left-1 top-1 h-4 w-4 rounded-full bg-white"
        }
      />
    </button>
  );
}

export default function CISOSystemGuideline() {
  const navigate = useNavigate();

  type GuidelineApiItem = SystemGuidlinesItem & { id: number };

  const [items, setItems] = React.useState<GuidelineApiItem[]>([]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [confirm, setConfirm] = React.useState<
    | { open: true; type: "enable" | "disable" | "delete"; index: number }
    | { open: false }
  >({ open: false });

  const refresh = React.useCallback(() => {
    return fetch("/admin/xu-faculty-clearance/api/ciso/system-guidelines")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { items: GuidelineApiItem[] }) => {
        const initial = (data.items ?? []).map((item) => ({
          ...item,
          enabled: item.enabled ?? true,
        }));
        setItems(initial);
      });
  }, []);

  React.useEffect(() => {
    refresh()
      .catch(() => {
        const initial = loadSystemGuidelinesItems().map((item) => ({
          ...item,
          enabled: item.enabled ?? true,
        }));
        setItems(initial as GuidelineApiItem[]);
      });
  }, [refresh]);





  return (
    <div className="min-h-screen bg-primary-foreground text-primary-foreground">
      
      {/* HEADER */}
      <div className="header mb-3">
        <CISOHeader />
      </div>

      {/* DASHBOARD CONTENT */}
      <main className="dashboard p-4 mt-2 space-y-3">

        <h1 className="text-2xl text-left text-primary font-bold">System Guidelines</h1>

        <Breadcrumb className="mt-2">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/CISO-dashboard">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>System Guidelines</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mb-3 mt-2 flex items-center justify-end">
          <Button variant="back" size="back" onClick={() => navigate("/CISO-dashboard")}> 
            <div className="flex items-center gap-2">
              <img src="BlackArrowIcon.png" alt="back" className="h-4 w-4" />Back
            </div>
          </Button>
        </div>

          <SectionListCard
            title="System Guidelines"
            headerActionImgSrc="/WhitePlusIcon.png"
            headerActionImgAlt="Add Maintenance Window"
            headerActionOnClick={() => {
              setEditingIndex(null);
              setDialogOpen(true);
            }}
          >
            <div className="p-0">
              {items.map((item, idx) => {
                const enabled = item.enabled ?? true;
                const descriptionText = Array.isArray(item.description)
                  ? item.description
                      .map((d) => (typeof d === "string" ? d : d.text))
                      .join("\n")
                  : item.description;

                return (
                  <div key={`${item.title}-${idx}`} className="bg-muted m-4">
                    <div className="flex items-center justify-between bg-muted px-4 py-3">
                      <div className="text-md font-bold text-foreground">{item.title}</div>
                      <GuidelinesToggle
                        checked={enabled}
                        onChange={(next) => {
                          setConfirm({
                            open: true,
                            type: next ? "enable" : "disable",
                            index: idx,
                          });
                        }}
                      />
                    </div>

                    <Divider color="border-[hsl(var(--white))]" />

                    <div className="bg-muted px-4 py-4">
                      <p className="text-md text-foreground whitespace-pre-line">
                        {descriptionText}
                      </p>

                      <div className="mt-3 text-sm text-muted-foreground">
                        Last updated: {item.timestamp}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Updated by: {item.email}
                      </div>
                    </div>

                    <Divider color="border-[hsl(var(--whiter))]" />

                    <div className="bg-muted px-4 py-4">
                      <div className="flex items-center justify-center">
                        {enabled ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-9 w-[120px] rounded-md bg-muted-foreground/20 text-foreground hover:bg-muted-foreground/20"
                            onClick={() => {
                              setEditingIndex(idx);
                              setDialogOpen(true);
                            }}
                          >
                            EDIT
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="h-9 w-[120px] rounded-md"
                            onClick={() => {
                              setConfirm({ open: true, type: "delete", index: idx });
                            }}
                          >
                            DELETE
                          </Button>
                        )}
                      </div>
                    </div>

                    {idx < items.length - 1 ? (
                      <Divider  />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </SectionListCard>

          <AlertDialog
            open={confirm.open}
            onOpenChange={(open: boolean) => {
              if (!open) setConfirm({ open: false });
            }}
          >
            <AlertDialogContent className="w-[420px] max-w-[calc(100vw-3rem)] rounded-xl bg-background p-0">
              {(() => {
                const type = confirm.open ? confirm.type : "delete";
                const index = confirm.open ? confirm.index : -1;
                const title =
                  index >= 0 && index < items.length ? items[index]?.title ?? "" : "";

                const isDelete = type === "delete";
                const isDisable = type === "disable";
                const isEnable = type === "enable";

                const headingWord = isDelete ? "DELETE" : isDisable ? "DEACTIVATE" : "ACTIVATE";

                const headingColor = isEnable ? "text-primary" : "text-destructive";

                const actionLabel = isDelete ? "Delete" : isDisable ? "Deactivate" : "Activate";

                const actionClass = isEnable
                  ? "h-11 w-full rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                  : "h-11 w-full rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90";

                const iconClass = isEnable
                  ? "border-primary text-primary"
                  : "border-destructive text-destructive";

                return (
                  <div className="rounded-xl bg-background">
                    <div className="px-6 pb-4 pt-6 text-center">
                      <div
                        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 ${iconClass}`}
                      >
                        <span className="text-2xl font-bold">!</span>
                      </div>

                      <div className="mt-4 text-base font-semibold text-foreground">
                        You are about to <span className={headingColor}>{headingWord}</span>
                      </div>
                      <div className="mt-1 text-base font-semibold text-foreground">
                        “{title}”
                      </div>

                      <div className="mt-4 text-sm font-semibold text-foreground">
                        Do you wish to continue?
                      </div>
                    </div>

                    <div className="px-6 pb-6">
                      <div className="space-y-3">
                        <AlertDialogAction
                          className={actionClass}
                          onClick={() => {
                            if (!confirm.open) return;

                            const current = items[confirm.index];
                            if (!current?.id) {
                              setConfirm({ open: false });
                              return;
                            }

                            if (confirm.type === "delete") {
                              fetch(
                                `/admin/xu-faculty-clearance/api/ciso/system-guidelines/${current.id}`,
                                { method: "DELETE" }
                              ).finally(() => {
                                setConfirm({ open: false });
                                refresh().catch(() => null);
                              });
                              return;
                            }

                            const nextEnabled = confirm.type === "enable";
                            fetch(
                              `/admin/xu-faculty-clearance/api/ciso/system-guidelines/${current.id}`,
                              {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ enabled: nextEnabled }),
                              }
                            ).then(() => {
                              // POST Inactive notification only when deactivating
                              if (!nextEnabled) {
                                  postCISONotification({
                                    title: "Content Archived",
                                    body: `"${title}" has been moved to archives by [User Name].`,
                                    details: [`Guidelines title = "${title}"`],
                                    status: null,
                                    is_read: 0,
                                    user_roles: ["CISO", "OVPHE"],
                                    created_by_id: null,
                                    approver_id: null,
                                    clearance_period_start_date: null,
                                    clearance_period_end_date: null,                                    
                                  });
                                
                                postCISONotification({
                                  title: "Notice",
                                  body: `The guideline "${title}" has been set to Inactive and is no longer visible to the approvers and their approver assistants.`,
                                  details: [`Guideline = "${title}"`],
                                  status: null,
                                  is_read: 0,
                                  user_roles: ["CISO", "OVPHE"],
                                  created_by_id: null,
                                  approver_id: null,
                                  clearance_period_start_date: null,
                                  clearance_period_end_date: null,                                  
                                });
                              }
                            }).finally(() => {
                              setConfirm({ open: false });
                              refresh().catch(() => null);
                            });
                          }}
                        >
                          {actionLabel}
                        </AlertDialogAction>

                        <AlertDialogCancel className="h-11 w-full rounded-md ">
                            Cancel
                        </AlertDialogCancel>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </AlertDialogContent>
          </AlertDialog>

          <EditSystemGuidelinesDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            initialValues={
              editingIndex !== null
                ? {
                    title: items[editingIndex]?.title ?? "",
                    description:
                      typeof items[editingIndex]?.description === "string"
                        ? items[editingIndex]?.description
                        : "",
                  }
                : undefined
            }
            onSave={({ title, description }) => {
              if (editingIndex !== null) {
                const current = items[editingIndex];
                if (!current?.id) {
                  setEditingIndex(null);
                  return;
                }
                fetch(`/admin/xu-faculty-clearance/api/ciso/system-guidelines/${current.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ title, description }),
                })
                .then((r) => {
                  if (!r.ok) throw new Error("Guideline update failed");
                  postCISONotification({
                    title: "Update",
                    body: `The Guideline "${title}" has been updated by the System Admin.`,
                    details: [`Guideline  = "${title}"`],
                    status: null,
                    is_read: 0,
                    user_roles: ["APPROVER", "CISO", "OVPHE", "ASSISTANT_APPROVER"],
                    created_by_id: null,
                    approver_id: null,
                    clearance_period_start_date: null,
                    clearance_period_end_date: null,                    
                  });
                })
                .finally(() => {
                  setEditingIndex(null);
                  refresh().catch(() => null);
                });
                return;
              }

              fetch("/admin/xu-faculty-clearance/api/ciso/activity-logs", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  event_type: "created_guideline",
                  details: title ? [`Guideline: ${title}`] : [],
                }),
              });
              // CREATE: Create guideline then POST notifications
              fetch("/admin/xu-faculty-clearance/api/ciso/system-guidelines", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, description }),
              })
              .then((r) => {
                if (!r.ok) throw new Error("Guideline create failed");
                postCISONotification({
                  title: "New Guideline Released",
                  body: `${title} is now active. Please review the updated procedures.`,
                  details: [`Guideline = "${title}"`],
                  status: null,
                  is_read: 0,
                  user_roles: ["APPROVER", "CISO", "OVPHE", "ASSISTANT_APPROVER"],
                  created_by_id: null,
                  approver_id: null,
                  clearance_period_start_date: null,
                  clearance_period_end_date: null,
                });
              })
              .finally(() => {
                refresh().catch(() => null);
              });
            }}
          />
  



      </main>

    </div>
  );
}
