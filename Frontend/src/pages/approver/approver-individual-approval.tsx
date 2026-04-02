import * as React from "react";
import "../../index.css"; 
import { ApprovalHeader } from "../../stories/components/header";
import { RequestCard } from "../../stories/components/cards";
import { Button } from "../../stories/components/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Textarea } from "../../stories/components/textarea";

interface IndividualRequestData {
  item: {
    id: string;
    requestId: string;
    employeeId: string;
    schoolId: string;
    name: string;
    fullName: string;
    schoolEmail: string;
    college: string;
    department: string;
    facultyType: string;
    status: string;
    submittedDate: string;
    requirementName: string;
    submissionNotes: string;
    submissionLink: string;
    remarks: string;
    approvedDate: string;
    approvedBy: string;
  };
}

export default function ApproverIndividualApproval() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get("request_id");

  const [request, setRequest] = React.useState<IndividualRequestData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<"approved" | "rejected" | "pending">("pending");
  const [remarks, setRemarks] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!requestId) {
      setError("No request ID provided");
      setLoading(false);
      return;
    }

    fetch(`/admin/xu-faculty-clearance/api/approver/individual-approval?request_id=${requestId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load request: ${res.statusText}`);
        }
        return res.json();
      })
      .then((data) => {
        setRequest(data);
        setStatus(data.item.status);
        setRemarks(data.item.remarks || "");
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading request:", err);
        setError(err.message || "Failed to load request");
        setLoading(false);
      });
  }, [requestId]);

  const isProcessed = request && (request.item.status === "approved" || request.item.status === "rejected");
  const isDisabled = Boolean(isProcessed);

  const handleSave = async () => {
    if (!request || status === "pending") {
      setError("Please select Approved or Rejected");
      return;
    }

    // Prevent saving if request is already processed
    if (isProcessed) {
      setError("This request has already been processed and cannot be modified");
      return;
    }

    // Validate remarks for rejected status
    if (status === "rejected" && !remarks.trim()) {
      setError("Remarks are required when rejecting a clearance request");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/admin/xu-faculty-clearance/api/approver/individual-approval", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        },
        body: JSON.stringify({
          request_id: request.item.requestId,
          action: status === "approved" ? "approve" : "reject",
          remarks: remarks,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Save successful:", result);
      
      // Navigate back to clearance list
      navigate("/approver-clearance");
    } catch (err) {
      console.error("Error saving:", err);
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate("/approver-clearance");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-primary-foreground text-primary-foreground">
        <div className="header mb-3">
          <ApprovalHeader />
        </div>
        <main className="dashboard p-4">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading...</div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-primary-foreground text-primary-foreground">
        <div className="header mb-3">
          <ApprovalHeader />
        </div>
        <main className="dashboard p-4">
          <div className="flex items-center justify-center h-64">
            <div className="text-red-500">Error: {error || "Request not found"}</div>
          </div>
        </main>
      </div>
    );
  }

  const { item } = request;

  return (
    <div className="min-h-screen bg-primary-foreground text-primary-foreground">
      
      {/* HEADER */}
      <div className="header mb-3">
        <ApprovalHeader />
      </div>

      {/* DASHBOARD CONTENT */}
      <main className="dashboard p-4">

        <div className="mb-3 mt-2 flex items-center justify-end">
          <Button variant="back" size="back" onClick={handleCancel}> 
            <div className="flex items-center gap-2">
              <img src="BlackArrowIcon.png" alt="back" className="h-4 w-4" />Back
            </div>
          </Button>
        </div>
       
        <div className="mt-2 gap-3">
          <RequestCard
            requestId={item.requestId}
            employeeId={item.employeeId}
            SchoolID={item.schoolId}
            FullName={item.name}
            name={`Request No. ${item.requestId}`}
            college={item.college}
            department={item.department}
            facultyType={item.facultyType}
            SchoolEmail={item.schoolEmail}
            status={status}
            onApprove={() => console.log("Approved")}
            onReject={() => console.log("Rejected")}
            onViewDetails={() => console.log("View details")}
            />
          
          <div className="mt-5">
            <div className="bg-white rounded-lg p-6 border">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">{item.requirementName}</h2>
              
              {/* Requirement Information */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3 text-gray-900">Requirement Details</h3>
                <div className="bg-gray-50 p-4 rounded">
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-900">Requirement Name</label>
                    <p className="mt-1 text-sm text-gray-900">{item.requirementName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900">Submission Notes</label>
                    <div className="mt-1 p-3 bg-white border rounded text-sm text-gray-900">
                      {item.submissionNotes || "No notes provided"}
                    </div>
                  </div>
                  {item.submissionLink && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-900">Submission Link</label>
                      <a 
                        href={item.submissionLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mt-1 text-blue-600 hover:text-blue-800 text-sm underline"
                      >
                        {item.submissionLink}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Selection */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3 text-gray-900">Status</h3>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="status"
                      value="approved"
                      checked={status === "approved"}
                      onChange={(e) => setStatus(e.target.value as "approved")}
                      disabled={isDisabled}
                      className="mr-2"
                    />
                    <span className="text-gray-900">Approved</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="status"
                      value="rejected"
                      checked={status === "rejected"}
                      onChange={(e) => setStatus(e.target.value as "rejected")}
                      disabled={isDisabled}
                      className="mr-2"
                    />
                    <span className="text-gray-900">Rejected</span>
                  </label>
                </div>
                {isProcessed && (
                  <div className="mt-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
                    This request has been processed and cannot be modified.
                  </div>
                )}
              </div>

              {/* Remarks */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3 text-gray-900">
                  Remarks 
                  {status === "rejected" && <span className="text-red-500 ml-1">*</span>}
                </h3>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="min-h-[100px] text-gray-900 border-gray-900 placeholder:text-gray-400"
                  disabled={isDisabled}
                />
                {status === "rejected" && !remarks.trim() && (
                  <div className="mt-2 text-sm text-red-600">
                    Remarks are required when rejecting a clearance request
                  </div>
                )}
                {isProcessed && (
                  <div className="mt-2 text-sm text-gray-900">
                    Remarks cannot be modified for processed requests.
                  </div>
                )}
              </div>

              {/* Error Display */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end">
                <Button variant="outline" className="text-gray-900 border-gray-900 hover:bg-gray-50" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving || isDisabled}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      

        

      </main>

    </div>
  );
}
