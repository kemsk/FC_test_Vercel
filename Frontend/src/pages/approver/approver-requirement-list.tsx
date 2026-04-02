import "../../index.css"; 
import { ApprovalHeader } from "../../stories/components/header";
import * as React from "react";

import {
  RequirementEditCard,
  AgreementCard,
  TrueAgreementCard,
} from "../../stories/components/cards";

import { AddRequirementDialog } from "../../stories/components/add-requirement-dialog";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../../stories/components/breadcrumb";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "../../stories/components/button";
import { SuccessMessageCard } from "../../stories/components/status-message-card";

type Requirement = {
  id: number;
  title: string;
  description: string;
  physicalSubmission: boolean;
  recipients: string;
  lastUpdated: string;
  createdBy: string;
  clearanceTimeline: string;
  recipientScope: string;
  targetColleges: number[];
  targetDepartments: number[];
  targetOffices: number[];
  targetFaculty: number[];
};

export default function RequirementList() {
  const navigate = useNavigate();
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [showTrueAgreement, setShowTrueAgreement] = React.useState(false);
  const [requirements, setRequirements] = React.useState<Requirement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingRequirement, setEditingRequirement] = React.useState<Requirement | null>(null);
  const [pendingChanges, setPendingChanges] = React.useState<any[]>([]);

  // Fetch requirements from API
  const fetchRequirements = React.useCallback(async () => {
    try {
      const response = await fetch("/admin/xu-faculty-clearance/api/approver/requirement-list");
      if (response.ok) {
        const data = await response.json();
        setRequirements(data.items || []);
      }
    } catch (error) {
      console.error("Failed to fetch requirements:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchRequirements();
    // Don't load pending changes on refresh - only keep them in local storage
    // This ensures page shows saved state, not pending state
  }, [fetchRequirements]);

  // Update local storage when pending changes change
  React.useEffect(() => {
    if (pendingChanges.length > 0) {
      localStorage.setItem('pendingRequirementChanges', JSON.stringify(pendingChanges));
    } else {
      localStorage.removeItem('pendingRequirementChanges');
    }
  }, [pendingChanges]);

  // Auto-open edit dialog when editingRequirement is set
  React.useEffect(() => {
    if (editingRequirement) {
      // Find and click the hidden trigger button
      const triggerButton = document.querySelector('[data-edit-trigger="true"]') as HTMLButtonElement;
      if (triggerButton) {
        setTimeout(() => triggerButton.click(), 0);
      }
    }
  }, [editingRequirement]);

  const handleAddRequirement = async (payload: any) => {
    // Create temporary requirement for immediate display
    const tempId = Date.now(); // Use number directly for consistency
    const tempRequirement: Requirement = {
      id: tempId,
      title: payload.title,
      description: payload.description,
      physicalSubmission: payload.physicalSubmission,
      recipients: payload.recipientScope === "individual" ? "Individual Faculty" : `${payload.targetColleges?.length || 0} colleges, ${payload.targetDepartments?.length || 0} departments`,
      lastUpdated: new Date().toISOString(),
      createdBy: "Current User",
      clearanceTimeline: "Pending",
      recipientScope: payload.recipientScope || "individual",
      targetColleges: payload.targetColleges || [],
      targetDepartments: payload.targetDepartments || [],
      targetOffices: payload.targetOffices || [],
      targetFaculty: payload.targetFaculty || [],
    };

    // Store in local storage as pending change
    const pendingChange = {
      type: 'create',
      id: tempId,
      data: tempRequirement,
      timestamp: new Date().toISOString()
    };
    setPendingChanges(prev => [...prev, pendingChange]);
  };

  const handleEditRequirement = async (payload: any) => {
    if (!editingRequirement) return;

    // Store in local storage as pending change
    const pendingChange = {
      type: 'update',
      id: editingRequirement.id,
      data: {
        title: payload.title,
        description: payload.description,
        physicalSubmission: payload.physicalSubmission,
        recipientScope: payload.recipientScope || editingRequirement.recipientScope,
        targetColleges: payload.targetColleges || editingRequirement.targetColleges,
        targetDepartments: payload.targetDepartments || editingRequirement.targetDepartments,
        targetOffices: payload.targetOffices || editingRequirement.targetOffices,
        targetFaculty: payload.facultyIds || editingRequirement.targetFaculty,
      },
      timestamp: new Date().toISOString()
    };
    setPendingChanges(prev => [...prev, pendingChange]);
  };

  const handleDeleteRequirement = async (requirement: Requirement) => {
    // Store in local storage as pending change
    const pendingChange = {
      type: 'delete',
      id: requirement.id,
      data: requirement,
      timestamp: new Date().toISOString()
    };
    setPendingChanges(prev => [...prev, pendingChange]);
  };

  // Function to commit all pending changes
  const commitPendingChanges = async () => {
    if (pendingChanges.length === 0) return;

    try {
      const createdTitles = pendingChanges
        .filter((c) => c.type === "create")
        .map((c) => (c?.data?.title ? String(c.data.title) : ""))
        .filter((t) => t.trim() !== "");

      const updatedTitles = pendingChanges
        .filter((c) => c.type === "update")
        .map((c) => {
          const direct = c?.data?.title ? String(c.data.title) : "";
          if (direct.trim()) return direct;
          const fallback = requirements.find((r) => r.id === c?.id)?.title;
          return fallback ? String(fallback) : "";
        })
        .filter((t) => t.trim() !== "");

      const deletedTitles = pendingChanges
        .filter((c) => c.type === "delete")
        .map((c) => (c?.data?.title ? String(c.data.title) : ""))
        .filter((t) => t.trim() !== "");

      const details = [
        "Edited Multiple Requirements",
        createdTitles.length ? `Created: ${createdTitles.join(", ")}` : "",
        updatedTitles.length ? `Updated: ${updatedTitles.join(", ")}` : "",
        deletedTitles.length ? `Deleted: ${deletedTitles.join(", ")}` : "",
      ].filter(Boolean);

      try {
        await fetch("/admin/xu-faculty-clearance/api/approver/activity-logs", {
          method: "POST",
          credentials: "include",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_type: "edited_requirement",
            user_role: "Approver",
            details,
          }),
        });
      } catch {
      }

      // Process each pending change
      for (const change of pendingChanges) {
        if (change.type === 'create') {
          await fetch("/admin/xu-faculty-clearance/api/approver/requirement-list", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(change.data),
          });
        } else if (change.type === 'update') {
          await fetch(`/admin/xu-faculty-clearance/api/approver/requirement-list/${change.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(change.data),
          });
        } else if (change.type === 'delete') {
          await fetch(`/admin/xu-faculty-clearance/api/approver/requirement-list/${change.id}`, {
            method: "DELETE",
          });
        }
      }

      // Clear pending changes
      setPendingChanges([]);
      
      // Refresh requirements
      fetchRequirements();
    } catch (error) {
      console.error("Failed to commit pending changes:", error);
      // Error handling without JavaScript alert
    }
  };

  return (
    <div className="min-h-screen bg-primary-foreground text-primary-foreground">
      
      {/* HEADER */}
      <div className="header mb-3">
        <ApprovalHeader />
      </div>

      {/* DASHBOARD CONTENT */}
      <main className="dashboard p-4">
        
        <h1 className="text-2xl text-left text-primary font-bold">Requirement List</h1>

        <Breadcrumb className="mt-2">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/approver-dashboard">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Requirement List</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mb-3 mt-2 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {pendingChanges.length > 0 && (
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold">
                {pendingChanges.length} pending change{pendingChanges.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <Button variant="back" size="back" onClick={() => navigate("/approver-action")}> 
            <div className="flex items-center gap-2">
              <img src="BlackArrowIcon.png" alt="back" className="h-4 w-4" />Back
            </div>
          </Button>
        </div>
       
       <div className="mt-2 space-y-3">
        <AddRequirementDialog
          trigger={
            <Button variant="default" className="w-full h-12">
              <div className="flex w-full items-center justify-center gap-2">
              <img src="WhitePlusIcon.png" alt="Add Requirement" />Add Requirement
              </div>
            </Button>
          }
          onSave={handleAddRequirement}
        />

        {loading ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground">Loading requirements...</div>
          </div>
        ) : requirements.length === 0 && pendingChanges.filter(change => change.type === 'create').length === 0 ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground">No requirements found. Create your first requirement above.</div>
          </div>
        ) : (
          (() => {
            // Combine existing requirements with pending creates
            const displayRequirements = [...requirements];
            
            // Add pending creates
            const pendingCreates = pendingChanges
              .filter(change => change.type === 'create')
              .map(change => change.data as Requirement);
            
            const allRequirements = [...displayRequirements, ...pendingCreates];
            
            return allRequirements.map((requirement) => {
              const pendingChange = pendingChanges.find(change => 
                (change.type === 'update' && change.id === requirement.id) ||
                (change.type === 'delete' && change.id === requirement.id) ||
                (change.type === 'create' && change.id === requirement.id)
              );
              
              const isPendingDelete = pendingChange?.type === 'delete';
              const isPendingUpdate = pendingChange?.type === 'update';
              const isPendingCreate = pendingChange?.type === 'create';
              
              // Show items marked for deletion with special styling
              if (isPendingDelete) {
                return (
                  <div key={requirement.id} className="opacity-40">
                    <RequirementEditCard
                      title={requirement.title}
                      description={requirement.description}
                      submissionDeadline=""
                      Recipients={requirement.recipients}
                      LastUpdated={requirement.lastUpdated}
                      CreatedBy={requirement.createdBy}
                      ClearanceTimeline={requirement.clearanceTimeline}
                      physicalSubmission={requirement.physicalSubmission}
                      onEdit={() => {}} // Disable edit for pending deletions
                      onDelete={() => {}} // Disable delete for pending deletions
                    />
                    <div className="mt-2 text-center">
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold">
                        Pending Delete
                      </span>
                    </div>
                  </div>
                );
              }
              
              return (
                <div key={requirement.id} className={(isPendingUpdate || isPendingCreate) ? 'opacity-60' : ''}>
                  <RequirementEditCard
                    title={isPendingUpdate ? pendingChange.data.title : requirement.title}
                    description={isPendingUpdate ? pendingChange.data.description : requirement.description}
                    submissionDeadline=""
                    Recipients={isPendingUpdate ? pendingChange.data.recipients : requirement.recipients}
                    LastUpdated={isPendingUpdate ? pendingChange.data.lastUpdated : requirement.lastUpdated}
                    CreatedBy={isPendingUpdate ? pendingChange.data.createdBy : requirement.createdBy}
                    ClearanceTimeline={isPendingUpdate ? pendingChange.data.clearanceTimeline : requirement.clearanceTimeline}
                    physicalSubmission={isPendingUpdate ? pendingChange.data.physicalSubmission : requirement.physicalSubmission}
                    onEdit={() => setEditingRequirement(requirement)}
                    onDelete={() => handleDeleteRequirement(requirement)}
                  />
                  {(isPendingUpdate || isPendingCreate) && (
                    <div className="mt-2 text-center">
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold">
                        Pending {isPendingCreate ? 'Create' : 'Update'}
                      </span>
                    </div>
                  )}
                </div>
              );
            });
          })()
        )}

        {showTrueAgreement ? (
          <TrueAgreementCard
            onConfirm={() => {
              setShowTrueAgreement(false);
            }}
          />
        ) : showSuccess ? (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <SuccessMessageCard
              className="max-w"
              message="Agreement confirmed and changes saved."
              onContinue={() => {
                setShowSuccess(false);
                setShowTrueAgreement(true);
                window.location.reload();
              }}
            />
          </div>
        ) : (
          <>
            {pendingChanges.length > 0 && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <span className="font-semibold">{pendingChanges.length} pending change{pendingChanges.length > 1 ? 's' : ''}:</span> Check all terms below to save your changes.
                </p>
              </div>
            )}
            <AgreementCard 
              onConfirm={() => {
                if (pendingChanges.length > 0) {
                  commitPendingChanges();
                }
                setShowSuccess(true);
              }} 
            />
          </>
        )}
       </div>
      </main>

      {/* Edit Requirement Dialog */}
      {editingRequirement && (
        <AddRequirementDialog
          key={editingRequirement.id}
          trigger={
            <button 
              data-edit-trigger="true"
              style={{ display: 'none' }}
            />
          }
          dialogTitle="Edit Requirement"
          saveLabel="Update"
          initialValues={{
            title: editingRequirement.title,
            description: editingRequirement.description,
            facultyIds: editingRequirement.targetFaculty.map(String),
            physicalSubmission: editingRequirement.physicalSubmission,
            recipientScope: editingRequirement.recipientScope,
            targetColleges: editingRequirement.targetColleges,
            targetDepartments: editingRequirement.targetDepartments,
            targetOffices: editingRequirement.targetOffices,
          }}
          onSave={(payload) => {
            handleEditRequirement(payload);
            setEditingRequirement(null);
          }}
          onCancel={() => {
            setEditingRequirement(null);
          }}
        />
      )}
    </div>
  );
}
