import * as React from "react";
import "../../index.css"; 
import { AssistantApproverHeader } from "../../stories/components/header";
import { RequestCard } from "../../stories/components/cards";
import { Button } from "../../stories/components/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../../stories/components/breadcrumb";
import { Link, useNavigate } from "react-router-dom";

type ArchivedAssistantRequest = {
  id: string;
  requestId: string;
  requirementName: string;
  submissionNotes: string;
  submissionLink: string;
  status: "pending" | "approved" | "rejected";
  submittedDate: string;
  approvedDate: string;
  approvedBy: string;
  remarks: string;
};

type ArchivedAssistantItem = {
  id: string;
  employeeId: string;
  schoolId: string;
  name: string;
  fullName: string;
  schoolEmail: string;
  college: string;
  department: string;
  facultyType: string;
  status: "pending" | "approved" | "rejected";
  missingApproval: string;
  requests: ArchivedAssistantRequest[];
};

export default function AssistantApproverArchivedIndividualApproval() {
  const navigate = useNavigate();
  const params = React.useMemo(() => new URLSearchParams(window.location.search), []);
  const timelineId = params.get("timelineId") || "";
  const archivedId = params.get("archivedId") || "";

  const [timelineName, setTimelineName] = React.useState("Archived Clearance");
  const [item, setItem] = React.useState<ArchivedAssistantItem | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [remarksByRequest, setRemarksByRequest] = React.useState<Record<string, string>>({});
  const [submittingRequestId, setSubmittingRequestId] = React.useState<string>("");

  const loadArchivedDetail = React.useCallback(() => {
    if (!timelineId || !archivedId) {
      setLoading(false);
      setError("Missing archived clearance selection.");
      return Promise.resolve();
    }

    setLoading(true);
    return fetch(`/admin/xu-faculty-clearance/api/assistant-approver/archived-individual?timelineId=${encodeURIComponent(timelineId)}&archivedId=${encodeURIComponent(archivedId)}`, {
      credentials: "include",
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to load archived clearance.");
        return data as { timeline?: { name?: string }; item?: ArchivedAssistantItem };
      })
      .then((data) => {
        setTimelineName(data.timeline?.name || "Archived Clearance");
        setItem(data.item ?? null);
        setRemarksByRequest(
          Object.fromEntries((data.item?.requests ?? []).map((request) => [request.id, request.remarks || ""]))
        );
        setError("");
      })
      .catch((err: Error) => {
        setItem(null);
        setError(err.message || "Failed to load archived clearance.");
      })
      .finally(() => setLoading(false));
  }, [archivedId, timelineId]);

  React.useEffect(() => {
    void loadArchivedDetail();
  }, [loadArchivedDetail]);

  const handleArchivedAction = React.useCallback(async (requestId: string, action: "approve" | "reject") => {
    setSubmittingRequestId(requestId);
    try {
      const response = await fetch(`/admin/xu-faculty-clearance/api/assistant-approver/archived-individual?timelineId=${encodeURIComponent(timelineId)}&archivedId=${encodeURIComponent(archivedId)}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: requestId,
          action,
          remarks: remarksByRequest[requestId] || "",
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error((data && data.detail) || "Failed to update archived request.");
      }

      await loadArchivedDetail();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update archived request.";
      window.alert(message);
    } finally {
      setSubmittingRequestId("");
    }
  }, [archivedId, loadArchivedDetail, remarksByRequest, timelineId]);

  return (
    <div className="min-h-screen bg-primary-foreground text-primary-foreground">
      <div className="header mb-3">
        <AssistantApproverHeader />
      </div>

      <main className="dashboard p-4">
        <div className="mt-3 space-y-4">
          <Breadcrumb className="mt-2">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/assistant-approver-archived-clearance">View Archived Clearance</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={`/assistant-approver-view-clearance?timelineId=${encodeURIComponent(timelineId)}`}>{timelineName}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{item?.fullName || item?.name || "Archived Individual"}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="mb-3 mt-2 flex items-center justify-end">
            <Button variant="back" size="back" onClick={() => navigate(`/assistant-approver-view-clearance?timelineId=${encodeURIComponent(timelineId)}`)}> 
              <div className="flex items-center gap-2">
                <img src="BlackArrowIcon.png" alt="back" className="h-4 w-4" />Back
              </div>
            </Button>
          </div>

          {loading ? (
            <div className="rounded-xl border border-muted-foreground/20 bg-card p-6 text-black">Loading archived clearance...</div>
          ) : item ? (
            <div className="mt-2 gap-3 space-y-5">
              <RequestCard
                requestId={item.id}
                employeeId={item.employeeId}
                SchoolID={item.schoolId}
                FullName={item.fullName || item.name}
                name={item.fullName || item.name}
                college={item.college}
                department={item.department}
                facultyType={item.facultyType}
                SchoolEmail={item.schoolEmail}
                status={item.status}
              />

              {item.requests.map((request) => (
                <div key={request.id} className="rounded-xl border border-muted-foreground/20 bg-card p-6 shadow">
                  <div className="text-xl text-center text-black font-bold mt-1">{request.requirementName || request.requestId}</div>

                  <div className="mt-6">
                    <div className="text-md font-bold text-foreground">Submission Notes</div>
                    <div className="mt-3 rounded-md border border-foreground p-3 text-sm text-black">
                      {request.submissionNotes || "No submission notes provided."}
                    </div>
                  </div>

                  {request.submissionLink ? (
                    <div className="mt-4">
                      <div className="text-md font-bold text-foreground">Submission Link</div>
                      <a className="mt-2 block break-all text-sm text-primary underline" href={request.submissionLink} target="_blank" rel="noreferrer">
                        {request.submissionLink}
                      </a>
                    </div>
                  ) : null}

                  <div className="mt-4 grid gap-2 text-sm text-black">
                    <div><span className="font-bold">Status:</span> {request.status.toUpperCase()}</div>
                    {request.submittedDate ? <div><span className="font-bold">Submitted On:</span> {request.submittedDate}</div> : null}
                    {request.approvedBy ? <div><span className="font-bold">Processed By:</span> {request.approvedBy}</div> : null}
                    {request.approvedDate ? <div><span className="font-bold">Processed On:</span> {request.approvedDate}</div> : null}
                    {request.remarks ? <div><span className="font-bold">Remarks:</span> {request.remarks}</div> : null}
                  </div>

                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="text-md font-bold text-foreground">Remarks</div>
                      <textarea
                        className="mt-2 min-h-[88px] w-full rounded-md border border-foreground p-3 text-sm text-black"
                        value={remarksByRequest[request.id] ?? ""}
                        onChange={(event) =>
                          setRemarksByRequest((prev) => ({
                            ...prev,
                            [request.id]: event.target.value,
                          }))
                        }
                        placeholder="Input your remarks here"
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button
                        type="button"
                        className="h-10 rounded-md px-5"
                        onClick={() => void handleArchivedAction(request.requestId, "approve")}
                        disabled={submittingRequestId === request.requestId}
                      >
                        {submittingRequestId === request.requestId ? "Processing..." : "Approve"}
                      </Button>
                      <Button
                        type="button"
                        variant="cancel"
                        className="h-10 rounded-md px-5"
                        onClick={() => void handleArchivedAction(request.requestId, "reject")}
                        disabled={submittingRequestId === request.requestId}
                      >
                        {submittingRequestId === request.requestId ? "Processing..." : "Reject"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {!item.requests.length ? (
                <div className="rounded-xl border border-muted-foreground/20 bg-card p-6 text-black">
                  No archived requests found under this assistant.
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-xl border border-muted-foreground/20 bg-card p-6 text-black">
              {error || "Archived clearance not found."}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
