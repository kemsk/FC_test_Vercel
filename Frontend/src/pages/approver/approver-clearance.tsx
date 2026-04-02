import * as React from "react";
import "../../index.css"; 
import { ApprovalHeader } from "../../stories/components/header";

import {
  ClearanceRequestsCard,
  type ClearanceRequestItem,
} from "../../stories/components/cards";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../stories/components/select";

import { SearchInputGroup } from "../../stories/components/input-group";

export default function ApproverClearance() {
  const [query, setQuery] = React.useState("");
  const [requests, setRequests] = React.useState<ClearanceRequestItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/admin/xu-faculty-clearance/api/approver/clearance", {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load requests: ${res.statusText}`);
        }
        return res.json();
      })
      .then((data) => {
        setRequests(Array.isArray(data?.items) ? data.items : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading requests:", err);
        setLoading(false);
        setRequests([]);
      });
  }, []);

  const filteredRequests = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((r) => {
      const hay = [r.requestId, r.employeeId, r.name, r.college, r.department, r.facultyType]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [query, requests]);

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

  return (
    <div className="min-h-screen bg-primary-foreground text-primary-foreground">
      
      {/* HEADER */}
      <div className="header mb-3">
        <ApprovalHeader />
      </div>

      {/* DASHBOARD CONTENT */}
      <main className="dashboard p-4">
        
        <h1 className="text-2xl text-left text-primary font-bold">Clearance Requests</h1>

        <div className="mt-4 space-y-5">
          <div className="w-full max-w-[520px]">
            <SearchInputGroup
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              containerClassName="h-10"
            />
          </div>

          <div className="flex flex-wrap items-left gap-3 overflow-x-auto ">
            <Select defaultValue="name">
              <SelectTrigger variant="pill" className="w-max gap-2">
                <span>Sort by :</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="employeeId">Employee ID</SelectItem>
                <SelectItem value="college">College</SelectItem>
                <SelectItem value="department">Department</SelectItem>
                <SelectItem value="facultyType">Faculty Type</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="pending">
              <SelectTrigger variant="pill" className="w-max gap-2">
                <span>Status :</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6">
          <ClearanceRequestsCard
            items={filteredRequests}
            getItemHref={(item) => `/approver-individual-approval?request_id=${item.requestId}`}
          />
        </div>

      </main>

    </div>
  );
}
