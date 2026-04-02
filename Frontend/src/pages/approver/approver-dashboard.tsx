import * as React from "react";
import "../../index.css"; 
import { ApprovalHeader } from "../../stories/components/header";

import {
  AnnouncementsCard,
  type AnnouncementItem,
  WelcomeAcademicCard,
  ApproverWelcomeMetrics,
  RequirementsListCard,
  type RequirementListItem,
} from "../../stories/components/cards";

export default function Approverdashboard() {
  const [timeline, setTimeline] = React.useState<{ academicYear: string; semester: string } | null>(null);
  const [approverOffice, setApproverOffice] = React.useState<string>("");
  const [pendingClearance, setPendingClearance] = React.useState<number>(0);
  const [totalClearanceRequests, setTotalClearanceRequests] = React.useState<number>(0);

  const [profile, setProfile] = React.useState<{
    email: string;
    university_id: string;
    first_name: string | null;
    middle_name: string | null;
    last_name: string | null;
    role_value: number | null;
  } | null>(null);

  React.useEffect(() => {
    fetch("/admin/xu-faculty-clearance/api/me")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load profile");
        return res.json();
      })
      .then((data) => setProfile(data))
      .catch(() => setProfile(null));
  }, []);

  React.useEffect(() => {
    fetch("/admin/xu-faculty-clearance/api/approver/dashboard")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load dashboard data");
        return res.json();
      })
      .then((data) => {
        if (data.timeline) {
          setTimeline({
            academicYear: data.timeline.academicYear?.toString() || "",
            semester: data.timeline.semester || "",
          });
        }
        if (data.approverInfo) {
          const office = data.approverInfo.department || 
                        data.approverInfo.office || 
                        data.approverInfo.college || 
                        "Not Assigned";
          setApproverOffice(office);
        } else {
          setApproverOffice("Not Assigned");
        }
        
        // Set clearance counts from backend response
        setPendingClearance(data.pendingCount || 0);
        setTotalClearanceRequests(data.totalCount || 0);
      })
      .catch(() => {
        setTimeline(null);
        setApproverOffice("Not Assigned");
        setPendingClearance(0);
        setTotalClearanceRequests(0);
      });
  }, []);

  const displayName = React.useMemo(() => {
    if (!profile) return "";
    const parts = [profile.first_name, profile.middle_name, profile.last_name]
      .map((p) => (p ?? "").trim())
      .filter(Boolean);
    return parts.length ? parts.join(" ") : profile.email;
  }, [profile]);
   type AnnouncementsResponse = { items: AnnouncementItem[] };
   type RequirementsResponse = { items: RequirementListItem[] };

  const [requirementItems, setRequirementItems] = React.useState<RequirementListItem[]>([]);
  const [announcementItems, setAnnouncementItems] = React.useState<AnnouncementItem[]>([]);

  React.useEffect(() => {
    fetch("/admin/xu-faculty-clearance/api/approver/requirement-list")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: RequirementsResponse) => {
        setRequirementItems(data.items || []);
      })
      .catch(() => setRequirementItems([]));
  }, []);

  React.useEffect(() => {
    fetch("/admin/xu-faculty-clearance/api/ovphe/announcements")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: AnnouncementsResponse) => {
        const active = (data.items ?? []).filter((item) => item.enabled !== false);
        setAnnouncementItems(active);
      })
      .catch(() => setAnnouncementItems([]));
  }, []);

  return (
    <div className="min-h-screen bg-primary-foreground text-primary-foreground">
      
      {/* HEADER */}
      <div className="header mb-3">
        <ApprovalHeader />
      </div>

      {/* DASHBOARD CONTENT */}
      <main className="dashboard p-4 mt-2 space-y-3">
        <WelcomeAcademicCard
          name={displayName}
          topLeft={{ label: "Academic Year", value: timeline?.academicYear || "" }}
          topRight={{ label: "Semester", value: timeline?.semester || "" }}
          rows={[
            { label: "Approver Office", value: approverOffice },
          ]}
        />

        <ApproverWelcomeMetrics
          pendingClearance={pendingClearance}
          totalClearanceRequests={totalClearanceRequests}
        />
        

          <RequirementsListCard
            items={requirementItems}
            headerActionHref="/approver-requirement-list"
            headerActionImgSrc="/WhitePlusIcon.png"
            headerActionImgAlt="Open Requirements"
          />
  


          <AnnouncementsCard 
            items={announcementItems}
            showHeaderChevron={false}
          />



      </main>

    </div>
  );
}
