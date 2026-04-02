import * as React from "react";
import "../../index.css"; 
import { AssistantApproverHeader } from "../../stories/components/header";
import { RequestCard } from "../../stories/components/cards";

import { Button } from "../../stories/components/button";
import { useNavigate } from "react-router-dom";
import { Textarea } from "../../stories/components/textarea";

async function parseApiResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    if (!res.ok) {
      throw new Error("The server returned an invalid response. Please refresh and try again.");
    }
    throw new Error("Received an invalid JSON response from the server.");
  }

  if (!res.ok) {
    const detail = typeof data === "object" && data !== null && "detail" in data ? String((data as { detail?: string }).detail || "") : "";
    throw new Error(detail || "Request failed.");
  }

  return data as T;
}

type AssistantApprovalItem = {
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
  status: "pending" | "approved" | "rejected";
  submittedDate: string;
  requirementName: string;
  submissionNotes: string;
  submissionLink: string;
  remarks: string;
  approvedDate: string;
  approvedBy: string;
};




export default function AssitantApproverIndividualApproval() {
  const navigate = useNavigate();
  const requestId = React.useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("requestId") || "";
  }, []);
  const [item, setItem] = React.useState<AssistantApprovalItem | null>(null);
  const [remarks, setRemarks] = React.useState("");
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!requestId) {
      setLoading(false);
      setError("Missing request ID.");
      return;
    }

    fetch(`/admin/xu-faculty-clearance/api/assistant-approver/individual-approval?requestId=${encodeURIComponent(requestId)}`, {
      credentials: "include",
    })
      .then((res) => parseApiResponse<{ item?: AssistantApprovalItem }>(res))
      .then((data: { item?: AssistantApprovalItem }) => {
        setItem(data.item ?? null);
        setRemarks(data.item?.remarks ?? "");
        setError("");
      })
      .catch((err: Error) => {
        setItem(null);
        setError(err.message || "Failed to load request.");
      })
      .finally(() => setLoading(false));
  }, [requestId]);

  const handleAction = React.useCallback((action: "approve" | "reject") => {
    if (!item) return;
    setIsSaving(true);
    setError("");
    setMessage("");

    fetch("/admin/xu-faculty-clearance/api/assistant-approver/individual-approval", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: item.requestId, action, remarks }),
    })
      .then((res) => parseApiResponse<{ item?: AssistantApprovalItem; ok?: boolean }>(res))
      .then((data) => {
        if (data.item) {
          setItem(data.item);
          setRemarks(data.item.remarks ?? "");
        }
        setMessage(action === "approve" ? "Request approved successfully." : "Request rejected successfully.");
      })
      .catch((err: Error) => setError(err.message || "Failed to save action."))
      .finally(() => setIsSaving(false));
  }, [item, remarks]);

  return (
    <div className="min-h-screen bg-primary-foreground text-primary-foreground">
      
      {/* HEADER */}
      <div className="header mb-3">
        <AssistantApproverHeader />
      </div>

      {/* DASHBOARD CONTENT */}
      <main className="dashboard p-4">

        <div className="mb-3 mt-2 flex items-center justify-end">
          <Button variant="back" size="back" onClick={() => navigate("/assistant-approver-clearance")}> 
            <div className="flex items-center gap-2">
              <img src="BlackArrowIcon.png" alt="back" className="h-4 w-4" />Back
            </div>
          </Button>
        </div>
       
        <div className="mt-2 gap-3">
          {loading ? (
            <div className="rounded-xl border border-muted-foreground/20 bg-card p-6 text-black">Loading request...</div>
          ) : item ? (
            <>
              <RequestCard
                requestId={item.requestId}
                employeeId={item.employeeId}
                SchoolID={item.schoolId}
                FullName={item.fullName || item.name}
                name={item.requestId}
                college={item.college}
                department={item.department}
                facultyType={item.facultyType}
                SchoolEmail={item.schoolEmail}
                status={item.status}
              />

              <div className="mt-5 rounded-xl border border-muted-foreground/20 bg-card p-6 shadow">
                <div className="text-xl text-center text-black font-bold mt-1">{item.requirementName || "Requirement"}</div>

                <div className="mt-6">
                  <div className="text-md font-bold text-foreground">Submission Notes</div>
                  <div className="mt-3 rounded-md border border-foreground p-3 text-sm text-black">
                    {item.submissionNotes || "No submission notes provided."}
                  </div>
                </div>

                {item.submissionLink ? (
                  <div className="mt-4">
                    <div className="text-md font-bold text-foreground">Submission Link</div>
                    <a className="mt-2 block break-all text-sm text-primary underline" href={item.submissionLink} target="_blank" rel="noreferrer">
                      {item.submissionLink}
                    </a>
                  </div>
                ) : null}

                <div className="mt-4 grid gap-2 text-sm text-black">
                  <div><span className="font-bold">Submitted On:</span> {item.submittedDate || "N/A"}</div>
                  {item.approvedBy ? <div><span className="font-bold">Processed By:</span> {item.approvedBy}</div> : null}
                  {item.approvedDate ? <div><span className="font-bold">Processed On:</span> {item.approvedDate}</div> : null}
                </div>

                <div className="mt-6">
                  <div className="text-md font-bold text-foreground">Remarks</div>
                  <Textarea
                    className="mt-2 min-h-[120px] text-black"
                    placeholder="Enter remarks for the approval or rejection"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    disabled={isSaving}
                  />
                </div>

                {error ? <div className="mt-3 text-sm font-medium text-red-600">{error}</div> : null}
                {message ? <div className="mt-3 text-sm font-medium text-green-700">{message}</div> : null}

                <div className="mt-6 flex items-center gap-3">
                  <Button
                    type="button"
                    variant="destructive"
                    className="h-10 rounded-md px-4 text-sm font-bold flex-1"
                    disabled={isSaving}
                    onClick={() => handleAction("reject")}
                  >
                    Reject
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    className="h-10 rounded-md px-4 text-sm font-bold flex-1"
                    disabled={isSaving}
                    onClick={() => handleAction("approve")}
                  >
                    Approve
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-muted-foreground/20 bg-card p-6 text-black">
              {error || "Request not found."}
            </div>
          )}
        </div>
      

        

      </main>

    </div>
  );
}
