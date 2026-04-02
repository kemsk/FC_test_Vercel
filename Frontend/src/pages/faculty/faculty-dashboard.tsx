import React from "react";
import "../../index.css"; 
import { FacultyHeader } from "../../stories/components/header";

import {
  WelcomeAcademicCard,
  ClearanceStatusCard,
  ClearanceProgressCard,
  ApprovedCard,
  ExpandableClearanceStepCard,
} from "../../stories/components/cards";

export default function Facultydashboard() {
  const [expandedStepIndex, setExpandedStepIndex] = React.useState<number | null>(1);

  const [profile, setProfile] = React.useState<null | {
    faculty: {
      email: string;
      universityId: string;
      firstName: string;
      middleName: string;
      lastName: string;
      college: string;
      department: string;
      facultyType: string;
    };
    timeline: { academicYear: number | null; term: string | null };
    clearance: { status: string; approvedCount: number; totalCount: number };
    steps?: Array<{
      index: number;
      title: string;
      statusLabel?: string;
      statusVariant?: any;
      collapsedType?: "status" | "dropdownOnly" | "locked";
      submittedTo?: string;
      submittedOn?: string;
      requirements?: Array<{ id: string; title: string; description: string; completed?: boolean; submitted?: boolean; requestId?: string; status?: string; submissionNotes?: string; required_physical?: boolean }>;
    }>;
  }>(null);

  React.useEffect(() => {
    fetch("/admin/xu-faculty-clearance/api/faculty/dashboard")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setProfile(data))
      .catch(() => {
        setProfile(null);
      });
  }, []);

  const stepsToRender = profile?.steps || [];
  const clearanceCurrent = profile?.clearance.approvedCount ?? 0;
  const clearanceTotal = stepsToRender.length > 0 ? stepsToRender.length : 6;
  const clearancePercent =
    clearanceTotal > 0
      ? Math.round((clearanceCurrent / clearanceTotal) * 100)
      : 0;
  const isClearanceApproved = clearancePercent >= 100;

  const [meProfile, setMeProfile] = React.useState<{
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
      .then((data) => setMeProfile(data))
      .catch(() => setMeProfile(null));
  }, []);

  const displayName = React.useMemo(() => {
    if (!meProfile) return "";
    const parts = [meProfile.first_name, meProfile.middle_name, meProfile.last_name]
      .map((p) => (p ?? "").trim())
      .filter(Boolean);
    return parts.length ? parts.join(" ") : meProfile.email;
  }, [meProfile]);

  const collegeLabel = profile?.faculty.college ?? "";
  const departmentLabel = profile?.faculty.department ?? "";
  const facultyTypeLabel = profile?.faculty.facultyType ?? "";
  const statusLabel = profile?.clearance.status ?? "";


  const [timeline, setTimeline] = React.useState<{ academicYear: string; semester: string } | null>(null);

  React.useEffect(() => {
    fetch("/admin/xu-faculty-clearance/api/active-clearance-timeline")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setTimeline(data))
      .catch(() => setTimeline(null));
  }, []);


  return (
    <div className="min-h-screen bg-primary-foreground text-primary-foreground">
      
      {/* HEADER */}
      <div className="header mb-3">
        <FacultyHeader />
      </div>

      {/* DASHBOARD CONTENT */}
      <main className="dashboard p-4">
        <WelcomeAcademicCard
          name={displayName}
          topLeft={{ label: "Academic Year", value: timeline?.academicYear || "" }}
          topRight={{ label: "Semester", value: timeline?.semester || "" }}
          rows={[
            { label: "College", value: collegeLabel },
            { label: "Department", value: departmentLabel },
            { label: "Faculty Type", value: facultyTypeLabel },
          ]}
          afterRows={
          <ClearanceStatusCard statusLabel={statusLabel}
          statusVariant="warning" className="mb-6"
/>}
        />
        
        <div className="mt-5">
          <ClearanceProgressCard
            value={clearancePercent}
            current={clearanceCurrent}
            total={clearanceTotal}
          />
        </div>

        {stepsToRender.length ? (
          <div className="mt-5 space-y-3">
            {stepsToRender.map((step) => (
              <ExpandableClearanceStepCard
                key={step.index}
                index={step.index}
                title={step.title}
                statusLabel={step.statusLabel}
                statusVariant={step.statusVariant}
                collapsedType={step.collapsedType}
                submittedTo={step.submittedTo}
                submittedOn={step.submittedOn}
                requirements={step.requirements}
                expanded={expandedStepIndex === step.index}
                onToggle={() =>
                  setExpandedStepIndex((prev) => (prev === step.index ? null : step.index))
                }
              />
            ))}
          </div>
        ) : null}
        


        {isClearanceApproved ? (
          <div className="mt-5">
            <ApprovedCard />
          </div>
        ) : null}

      </main>

    </div>
  );
}


