import * as React from "react";
import "../../index.css"; 
import { AssistantApproverHeader } from "../../stories/components/header";

import {
  AnnouncementsCard,
  type AnnouncementItem,
  WelcomeAcademicCard,
  ApproverWelcomeMetrics,
  RequirementsListCard,
  type ClearanceRequestItem,
  type RequirementListItem,
} from "../../stories/components/cards";

export default function AssistantApproverDashboard() {
  const [timeline, setTimeline] = React.useState<{ academicYear: string; semester: string } | null>(null);

  const [profile, setProfile] = React.useState<{
    email: string;
    university_id: string;
    first_name: string | null;
    middle_name: string | null;
    last_name: string | null;
    role_value: number | null;
    roles_payload?: Array<{
      role_name: string;
      college: string;
      department: string;
      office: string;
    }>;
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

  const displayName = React.useMemo(() => {
    if (!profile) return "";
    const parts = [profile.first_name, profile.middle_name, profile.last_name]
      .map((p) => (p ?? "").trim())
      .filter(Boolean);
    return parts.length ? parts.join(" ") : profile.email;
  }, [profile]);

  const approverOffice = React.useMemo(() => {
    const assistantRole = profile?.roles_payload?.find(
      (role) => role.role_name === "ASSISTANT_APPROVER" || role.role_name === "Student Assistant"
    );
    return assistantRole?.department || assistantRole?.office || assistantRole?.college || "Not Assigned";
  }, [profile]);

  React.useEffect(() => {
    fetch("/admin/xu-faculty-clearance/api/active-clearance-timeline")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setTimeline(data))
      .catch(() => setTimeline(null));
  }, []);

  type AnnouncementsResponse = { items: AnnouncementItem[] };

  const [requirementItems, setRequirementItems] = React.useState<RequirementListItem[]>([]);
  const [clearanceItems, setClearanceItems] = React.useState<ClearanceRequestItem[]>([]);

  const [announcementItems, setAnnouncementItems] = React.useState<AnnouncementItem[]>([]);

  React.useEffect(() => {
    fetch("/admin/xu-faculty-clearance/api/ovphe/announcements")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: AnnouncementsResponse) => {
        const active = (data.items ?? []).filter((item) => item.enabled !== false);
        setAnnouncementItems(active);
      })
      .catch(() => setAnnouncementItems([]));
  }, []);

  React.useEffect(() => {
    fetch("/admin/xu-faculty-clearance/api/assistant-approver/requirement-list")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { items?: RequirementListItem[] }) => setRequirementItems(data.items ?? []))
      .catch(() => setRequirementItems([]));
  }, []);

  React.useEffect(() => {
    fetch("/admin/xu-faculty-clearance/api/assistant-approver/clearance")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { items?: ClearanceRequestItem[] }) => setClearanceItems(data.items ?? []))
      .catch(() => setClearanceItems([]));
  }, []);

  const pendingClearance = React.useMemo(
    () => clearanceItems.filter((item) => item.status === "pending").length,
    [clearanceItems]
  );
  const totalClearanceRequests = clearanceItems.length;

  return (
    <div className="min-h-screen bg-primary-foreground text-primary-foreground">
      
      {/* HEADER */}
      <div className="header mb-3">
        <AssistantApproverHeader />
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
            headerActionHref="/assistant-approver-requirement-list"
            headerActionImgSrc="/_WhiteArrowIcon.png"
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
