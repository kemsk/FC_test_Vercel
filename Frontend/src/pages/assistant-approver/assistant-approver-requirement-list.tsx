import * as React from "react";
import "../../index.css"; 
import { AssistantApproverHeader } from "../../stories/components/header";

import {
  RequirementListCard,
  type RequirementListItem,
} from "../../stories/components/cards";

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

export default function AssistantApproverRequirementList() {
  const navigate = useNavigate();
  const [items, setItems] = React.useState<RequirementListItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/admin/xu-faculty-clearance/api/assistant-approver/requirement-list")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { items?: RequirementListItem[] }) => setItems(data.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-primary-foreground text-primary-foreground">
      
      {/* HEADER */}
      <div className="header mb-3">
        <AssistantApproverHeader />
      </div>

      {/* DASHBOARD CONTENT */}
      <main className="dashboard p-4">
        
        <h1 className="text-2xl text-left text-primary font-bold">Requirement List</h1>

        <Breadcrumb className="mt-2">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/assistant-approver-dashboard">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Requirement List</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
       
        <div className="mb-3 mt-2 flex items-center justify-end">
          <Button variant="back" size="back" onClick={() => navigate("/assistant-approver-dashboard")}> 
            <div className="flex items-center gap-2">
              <img src="BlackArrowIcon.png" alt="back" className="h-4 w-4" />Back
            </div>
          </Button>
        </div>
       
       <div className="mt-2 space-y-3">
        {loading ? (
          <div className="rounded-xl border border-muted-foreground/20 bg-card p-6 text-black">Loading requirements...</div>
        ) : items.length ? (
          items.map((item, index) => (
            <RequirementListCard
              key={`${item.title}-${index}`}
              title={item.title}
              Recipients={(item as RequirementListItem & { recipients?: string }).recipients ?? "Same Department Faculty"}
              description={item.description}
              physicalSubmission={item.physicalSubmission}
              LastUpdated={item.lastUpdated}
              CreatedBy={(item as RequirementListItem & { createdBy?: string }).createdBy ?? ""}
              ClearanceTimeline={(item as RequirementListItem & { clearanceTimeline?: string }).clearanceTimeline ?? ""}
            />
          ))
        ) : (
          <div className="rounded-xl border border-muted-foreground/20 bg-card p-6 text-black">No requirements found.</div>
        )}
       </div>

      </main>

    </div>
  );
}
