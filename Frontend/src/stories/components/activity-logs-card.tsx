import * as React from "react";

import {
  ArrowBigLeft,
  ArrowBigRight,
  Check,
  Download,
  Pencil,
  Plus,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";

import { cn } from "../../components/lib/utils";

export type ActivityLogVariant =
  | "approved_clearance"
  | "rejected_clearance"
  | "create_request"
  | "edited_requirements"
  | "created_requirements"
  | "deleted_requirements"
  | "added_assistant_approver"
  | "updated_assistant_approver"
  | "removed_assistant_approver"
  | "user_logout"
  | "user_login"
  | "exported_clearance_results"
  | "created_guideline"
  | "edited_guideline"
  | "enabled_guideline"
  | "disabled_guideline"
  | "delete_guideline"
  | "set_guideline_status_active"
  | "set_guideline_status_inactive"
  | "archived_guideline"
  | "created_announcement"
  | "enabled_announcement"
  | "disabled_announcement"
  | "deleted_announcement"
  | "set_announcement_status_active"
  | "set_announcement_status_inactive"
  | "edited_announcement"
  | "created_timeline"
  | "edited_timeline"
  | "archived_timeline"
  | "enabled_timeline"
  | "disabled_timeline"
  | "created_college"
  | "edited_college"
  | "deleted_college"
  | "created_department"
  | "edited_department"
  | "deleted_department"
  | "created_office"
  | "edited_office"
  | "deleted_office"
  | "added_to_approver_flow"
  | "edited_approver_flow"
  | "removed_from_approver_flow"
  | "created_approver"
  | "edited_approver"
  | "removed_approver"
  | "uploaded_faculty_data_dump"
  | "removed_faculty_data_dump"
  | "faculty_data_dump_error"
  | "faculty_data_dump_upload"
  | "faculty_data_dump_removed";

export type ActivityLogItem = {
  id: string;
  dateLabel: string;
  timeLabel: string;
  variant: ActivityLogVariant;
  event_type?: string; // Add event_type from backend API
  title?: string;
  description?: string;
  actorFirstName?: string;
  actorLastName?: string;
  actorRole?: string;
  facultyFirstName?: string;
  facultyLastName?: string;
  facultyCollege?: string;
  facultyDepartment?: string;
  universityId?: string;
  requestId?: string;
  details: string[];
  schoolYear?: string;
  semester?: string;
  guidelineTitle?: string;
  announcementTitle?: string;
  requirementTitle?: string;
  collegeName?: string;
  departmentName?: string;
  approverDepartment?: string;
  approverFlowField?: string;
  approverFirstName?: string;
  approverLastName?: string;
  assistantApproverFirstName?: string;
  assistantApproverLastName?: string;
};

export type ActivityLogsCardProps = {
  items: ActivityLogItem[];
  className?: string;
};

function getArchivedGuidelineIcon() {
  return (
    <div className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-success p-0.5">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M3 7V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5 7h14v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7z"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9 11h6"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function getActivityIcon(variant: ActivityLogVariant) {
  if (variant === "approved_clearance") {
    return (
      <div className="flex flex-shrink-0 h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-success p-0.2">
        <Check strokeWidth={4} className="h-3 w-3 text-white transform translate-y-[0.5px]" />
      </div>
    );
  }

  if (variant === "archived_guideline") {
    return getArchivedGuidelineIcon();
  }

  if (
    variant === "rejected_clearance" ||
    variant === "set_guideline_status_inactive" ||
    variant === "set_announcement_status_inactive" ||
    variant === "disabled_announcement" ||
    variant === "disabled_timeline" ||
    variant === "disabled_guideline" 
  ) {
    return (
      <div className="flex flex-shrink-0 h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-[hsl(var(--destructive))] p-0.5">
        <X strokeWidth={4} className="h-3 w-3 text-white transform " />
      </div>
    );
  }

  if (
    variant === "create_request" ||
    variant === "created_requirements" ||
    variant === "created_guideline" ||
    variant === "created_announcement" ||
    variant === "created_timeline" ||
    variant === "created_college" ||
    variant === "created_department" ||
    variant === "added_to_approver_flow" 
  ) {
    return (
      <div className="flex flex-shrink-0 h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-primary p-0.5">
        <Plus strokeWidth={4} className="h-3 w-3  text-white transform" />
      </div>
    );
  }

  if (
    variant === "edited_requirements" ||
    variant === "edited_approver_flow" ||
    variant === "edited_guideline" ||
    variant === "edited_announcement" ||
    variant === "edited_college" ||
    variant === "edited_department" ||
    variant === "edited_office" ||
    variant === "edited_approver" ||
    variant === "edited_timeline"
  ) {
    return (
      <div className="flex flex-shrink-0 h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-primary p-0.5">
        <Pencil strokeWidth={4} className="h-3 w-3 text-white" />
      </div>
    );
  }

  if (variant === "updated_assistant_approver") {
    return (
      <div className="flex flex-shrink-0 h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-primary p-0.5">
        <UserCheck strokeWidth={4} className="h-3 w-3 text-white" />
      </div>
    );
  }

  if (variant === "removed_assistant_approver" || variant === "removed_approver" || variant === "removed_faculty_data_dump") {
    return (
      <div className="flex flex-shrink-0 h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-[hsl(var(--destructive))] p-0.5">
        <UserMinus strokeWidth={4} className="h-3 w-3 text-white" />
      </div>
    );
  }

  if (variant === "created_approver" || variant === "added_assistant_approver") {
    return (
      <div className="flex flex-shrink-0 h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-[#1f2b88] p-0.5">
        <UserPlus strokeWidth={2.5} className="h-4 w-4 text-white" />
      </div>
    );
  }

  if (variant === "user_logout") {
    return (
      <div className="flex flex-shrink-0 h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-primary p-0.5">
        <ArrowBigLeft strokeWidth={4} className="h-3 w-3 text-white" />
      </div>
    );
  }

  if (variant === "user_login") {
    return (
      <div className="flex flex-shrink-0 h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-primary p-0.5">
        <ArrowBigRight strokeWidth={4} className="h-3 w-3 text-white" />
      </div>
    );
  }

  if (variant === "exported_clearance_results") {
    return (
      <div className="flex flex-shrink-0 h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-primary p-0.5">
        <Download strokeWidth={4} className="h-3 w-3 text-white" />
      </div>
    );
  }

  if (
    variant === "enabled_timeline" ||
    variant === "enabled_guideline" ||
    variant === "enabled_announcement" ||
    variant === "set_announcement_status_active"
  ) {
    return (
      <div className="flex flex-shrink-0 h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-success p-0.2">
        <Check strokeWidth={4} className="h-3 w-3 text-white transform translate-y-[0.5px]" />
      </div>
    );
  }

  if (
    variant === "deleted_college" ||
    variant === "deleted_department" ||
    variant === "removed_from_approver_flow" ||
    variant === "deleted_requirements" ||
    variant === "deleted_office" ||
    variant === "deleted_announcement" ||
    variant === "delete_guideline" 
  ) {
    return (
      <div className="flex flex-shrink-0 h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-[hsl(var(--destructive))] p-0.5">
        <Trash2 strokeWidth={3} className="h-3 w-3 text-white" />
      </div>
    );
  }

  if (variant === "faculty_data_dump_upload") {
    return (
      <div className="flex flex-shrink-0 h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-[#1f2b88] p-0.5">
        <Download strokeWidth={4} className="h-3 w-3 text-white" />
      </div>
    );
  }
  if (variant === "faculty_data_dump_error") {
    return (
      <div className="flex flex-shrink-0 h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-destructive p-0.5">
        <X strokeWidth={4} className="h-3 w-3 text-white" />
      </div>
    );
  }

  return (
    <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full">
      <img src="/PrimaryCirclePlusIcon.png" className="h-full w-full object-cover" />
    </div>
  );
}

function formatActivityLogText(item: ActivityLogItem): {
  title: string;
  description: string;
} {
  const actorFirstName =
    item.actorFirstName?.trim() || String((item as any).firstName ?? "").trim();
  const actorLastName =
    item.actorLastName?.trim() || String((item as any).lastName ?? "").trim();

  const actorName = [actorFirstName, actorLastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const facultyName = [item.facultyFirstName, item.facultyLastName].filter(Boolean).join(" ").trim();

  const facultyCollegeDepartment = [item.facultyCollege, item.facultyDepartment]
    .filter(Boolean)
    .join(" - ")
    .trim();

  const assistantApproverName = [item.assistantApproverFirstName, item.assistantApproverLastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const userName = actorName || facultyName;

  const requirementTitle = item.requirementTitle?.trim();
  const requirementTail = requirementTitle ? `: ${requirementTitle}` : "";

  const deptOffice = item.approverDepartment?.trim();
  const deptTail = deptOffice ? ` for ${deptOffice}.` : ".";

  const guidelineTitle = item.guidelineTitle?.trim();
  const guidelineTail = guidelineTitle ? `: **${guidelineTitle}**.` : ".";

  const rawDetails = (item as any).details;
  const detailsText = Array.isArray(rawDetails)
    ? rawDetails.map((d: any) => String(d ?? "").trim()).filter(Boolean).join(" ").trim()
    : String(rawDetails ?? "").trim();

  const guidelineTitleFromDetails = (() => {
    if (!detailsText) return "";
    const m = detailsText.match(/(?:guideline\s*title|title)\s*[:\-]\s*(.+)$/i);
    return (m?.[1] ?? detailsText).trim();
  })();

  const resolvedGuidelineTitleRaw = guidelineTitleFromDetails || guidelineTitle || "";
  const resolvedGuidelineTitle = String(resolvedGuidelineTitleRaw)
    .replace(/^\s*(?:guideline\s*title|guideline|title)\s*[:\-]\s*/i, "")
    .trim();

  const announcementTitle = item.announcementTitle?.trim();
  const resolvedAnnouncementTitleRaw = (() => {
    if (!detailsText) return announcementTitle || "";
    const m = detailsText.match(/(?:announcement\s*title|announcement|title)\s*[:\-]\s*(.+)$/i);
    return (m?.[1] ?? detailsText).trim() || announcementTitle || "";
  })();
  const resolvedAnnouncementTitle = String(resolvedAnnouncementTitleRaw)
    .replace(/^\s*(?:announcement\s*title|announcement|title)\s*[:\-]\s*/i, "")
    .trim();

  const schoolYear = item.schoolYear?.trim();
  const semester = item.semester?.trim();
  const collegeName = item.collegeName?.trim();
  const departmentName = item.departmentName?.trim();

  if (item.variant === "exported_clearance_results") {
    const title = "Exported Clearance Results";
    const firstName = actorFirstName || userName;
    const schoolYearTail = schoolYear ? ` for ${schoolYear}` : "";
    const semesterTail = semester ? ` for ${semester}.` : ".";
    const description = `User ${firstName} exported clearance results${schoolYearTail}${semesterTail}`;
    return { title, description };
  }

  if (item.variant === "created_guideline") {
    const title = "Created Guideline";
    const fullName = [actorFirstName, actorLastName].filter(Boolean).join(" ").trim() || userName;
    const rawDetails = (item as any).details;
    const detailsText = Array.isArray(rawDetails)
      ? rawDetails.map((d: any) => String(d ?? "").trim()).filter(Boolean).join(" ").trim()
      : String(rawDetails ?? "").trim();

    const parsedFromDetails = (() => {
      if (!detailsText) return "";
      const m = detailsText.match(/(?:guideline\s*title|title)\s*[:\-]\s*(.+)$/i);
      return (m?.[1] ?? detailsText).trim();
    })();

    const resolvedGuidelineTitleRaw = parsedFromDetails || guidelineTitle || "";
    const resolvedGuidelineTitle = String(resolvedGuidelineTitleRaw)
      .replace(/^\s*(?:guideline\s*title|guideline|title)\s*[:\-]\s*/i, "")
      .trim();
    const titleTail = resolvedGuidelineTitle ? `: ${resolvedGuidelineTitle}.` : ".";
    const description = `User ${fullName} created guideline${titleTail}`;
    return { title, description };
  }

  if (item.variant === "edited_guideline") {
    const title = "Edited Guideline";
    const fullName = [actorFirstName, actorLastName].filter(Boolean).join(" ").trim() || userName;
    const titleTail = resolvedGuidelineTitle ? `: ${resolvedGuidelineTitle}.` : ".";
    const description = `User ${fullName} edited guideline${titleTail}`;
    return { title, description };
  }

  if (item.variant === "enabled_guideline") {
    const title = "Enabled Guideline";
    const fullName = [actorFirstName, actorLastName].filter(Boolean).join(" ").trim() || userName;
    const guidelineLabel = resolvedGuidelineTitle ? `, ${resolvedGuidelineTitle}` : "";
    const description = `User ${fullName} set guideline${guidelineLabel} status to Active.`;
    return { title, description };
  }

  if (item.variant === "disabled_guideline") {
    const title = "Disabled Guideline";
    const fullName = [actorFirstName, actorLastName].filter(Boolean).join(" ").trim() || userName;
    const guidelineLabel = resolvedGuidelineTitle ? `, ${resolvedGuidelineTitle}` : "";
    const description = `User ${fullName} set guideline${guidelineLabel} status to Inactive.`;
    return { title, description };
  }

  if (item.variant === "delete_guideline") {
    const title = "Deleted Guideline";
    const fullName = [actorFirstName, actorLastName].filter(Boolean).join(" ").trim() || userName;
    const titleTail = resolvedGuidelineTitle ? `: ${resolvedGuidelineTitle}.` : ".";
    const description = `User ${fullName} deleted guideline${titleTail}`;
    return { title, description };
  }

  if (item.variant === "set_guideline_status_active") {
    const title = "Set Guideline Status to \"Active\"";
    const guidelineLabel = resolvedGuidelineTitle ? `, ${resolvedGuidelineTitle}` : guidelineTitle ? `, ${guidelineTitle}` : "";
    const description = `User ${userName} set guideline${guidelineLabel} status to Active.`;
    return { title, description };
  }

  if (item.variant === "set_guideline_status_inactive") {
    const title = "Set Guideline Status to \"Inactive\"";
    const guidelineLabel = resolvedGuidelineTitle ? `, ${resolvedGuidelineTitle}` : guidelineTitle ? `, ${guidelineTitle}` : "";
    const description = `User ${userName} set guideline${guidelineLabel} status to Inactive.`;
    return { title, description };
  }

  if (item.variant === "archived_guideline") {
    const title = "Archived Guideline";
    const fullName = [actorFirstName, actorLastName].filter(Boolean).join(" ").trim() || userName;
    const titleTail = resolvedGuidelineTitle ? `: ${resolvedGuidelineTitle}.` : ".";
    const description = `User ${fullName} archived guideline${titleTail}`;
    return { title, description };
  }

  if (item.variant === "created_announcement") {
    const title = "Created Announcement";
    const fullName = [actorFirstName, actorLastName].filter(Boolean).join(" ").trim() || userName;
    const titleTail = resolvedAnnouncementTitle ? `: ${resolvedAnnouncementTitle}.` : ".";
    const description = `User ${fullName} created announcement${titleTail}`;
    return { title, description };
  }

  if (item.variant === "edited_announcement") {
    const title = "Edited Announcement";
    const fullName = [actorFirstName, actorLastName].filter(Boolean).join(" ").trim() || userName;
    const titleTail = resolvedAnnouncementTitle ? `: ${resolvedAnnouncementTitle}.` : ".";
    const description = `User ${fullName} edited announcement${titleTail}`;
    return { title, description };
  }

  if (item.variant === "set_announcement_status_active") {
    const title = "Enabled Announcement";
    const fullName = [actorFirstName, actorLastName].filter(Boolean).join(" ").trim() || userName;
    const label = resolvedAnnouncementTitle ? `, ${resolvedAnnouncementTitle}` : announcementTitle ? `, ${announcementTitle}` : "";
    const description = `User ${fullName} set announcement${label} status to Active.`;
    return { title, description };
  }

  if (item.variant === "enabled_announcement") {
    const title = "Enabled Announcement";
    const fullName = [actorFirstName, actorLastName].filter(Boolean).join(" ").trim() || userName;
    const label = resolvedAnnouncementTitle ? `, ${resolvedAnnouncementTitle}` : announcementTitle ? `, ${announcementTitle}` : "";
    const description = `User ${fullName} set announcement${label} status to Active.`;
    return { title, description };
  }

  if (item.variant === "set_announcement_status_inactive") {
    const title = "Disabled Announcement";
    const fullName = [actorFirstName, actorLastName].filter(Boolean).join(" ").trim() || userName;
    const label = resolvedAnnouncementTitle ? `, ${resolvedAnnouncementTitle}` : announcementTitle ? `, ${announcementTitle}` : "";
    const description = `User ${fullName} set announcement${label} status to Inactive.`;
    return { title, description };
  }

  if (item.variant === "disabled_announcement") {
    const title = "Disabled Announcement";
    const fullName = [actorFirstName, actorLastName].filter(Boolean).join(" ").trim() || userName;
    const label = resolvedAnnouncementTitle ? `, ${resolvedAnnouncementTitle}` : announcementTitle ? `, ${announcementTitle}` : "";
    const description = `User ${fullName} set announcement${label} status to Inactive.`;
    return { title, description };
  }

  if (item.variant === "deleted_announcement") {
    const title = "Deleted Announcement";
    const fullName = [actorFirstName, actorLastName].filter(Boolean).join(" ").trim() || userName;
    const titleTail = resolvedAnnouncementTitle ? `: ${resolvedAnnouncementTitle}.` : ".";
    const description = `User ${fullName} deleted announcement${titleTail}`;
    return { title, description };
  }

  if (item.variant === "created_timeline") {
    const title = "Created Timeline";
    const fullName = [actorFirstName, actorLastName].filter(Boolean).join(" ").trim() || userName;
    const details = (item as any).details || [];
    const schoolYear = details.find((d: string) => d.includes("S.Y.")) || "";
    const semester = details.find((d: string) => d.includes("Semester:"))?.replace("Semester:", "").trim() || "";
    const timelineLabel = [schoolYear, semester].filter(Boolean).join(" ").trim();
    const description = `User ${fullName} created timeline: ${timelineLabel}.`;
    return { title, description };
  }

  if (item.variant === "edited_timeline") {
    const title = "Edited Timeline";
    const fullName = [actorFirstName, actorLastName].filter(Boolean).join(" ").trim() || userName;
    const details = (item as any).details || [];
    const schoolYear = details.find((d: string) => d.includes("S.Y.")) || "";
    const semester = details.find((d: string) => d.includes("Semester:"))?.replace("Semester:", "").trim() || "";
    const timelineLabel = [schoolYear, semester].filter(Boolean).join(" ").trim();
    const description = `User ${fullName} edited timeline: ${timelineLabel}.`;
    return { title, description };
  }

  if (item.variant === "enabled_timeline") {
    const title = "Set Timeline Status to \"Active\"";
    const details = (item as any).details || [];
    const schoolYear = details.find((d: string) => d.includes("S.Y.")) || "";
    const semester = details.find((d: string) => d.includes("Semester:"))?.replace("Semester:", "").trim() || "";
    const timelineLabel = [schoolYear, semester].filter(Boolean).join(" ").trim();
    const labelTail = timelineLabel ? ` ${timelineLabel}` : "";
    const description = `User ${userName} set timeline,${labelTail} status to Active.`;
    return { title, description };
  }

  if (item.variant === "disabled_timeline") {
    const title = "Set Timeline Status to \"Inactive\"";
    const details = (item as any).details || [];
    const schoolYear = details.find((d: string) => d.includes("S.Y.")) || "";
    const semester = details.find((d: string) => d.includes("Semester:"))?.replace("Semester:", "").trim() || "";
    const timelineLabel = [schoolYear, semester].filter(Boolean).join(" ").trim();
    const labelTail = timelineLabel ? ` ${timelineLabel}` : "";
    const description = `User ${userName} set timeline,${labelTail} status to Inactive, clearance timeline is archived.`;
    return { title, description };
  }

  if (item.variant === "archived_timeline") {
    const title = "Archived Timeline";
    const details = (item as any).details || [];
    const schoolYear = details.find((d: string) => d.includes("S.Y.")) || "";
    const semester = details.find((d: string) => d.includes("Semester:"))?.replace("Semester:", "").trim() || "";
    const timelineLabel = [schoolYear, semester].filter(Boolean).join(" ").trim();
    const labelTail = timelineLabel ? ` ${timelineLabel}` : "";
    const description = `User ${userName} archived timeline,${labelTail}.`;
    return { title, description };
  }

  if (item.variant === "edited_approver_flow") {
    const title = "Edited Approver Flow";
    const fullName = [actorFirstName, actorLastName].filter(Boolean).join(" ").trim() || userName;
    const details = (item as any).details || [];
    const normalizedLines = (Array.isArray(details) ? details : [details])
      .map((d: any) => String(d ?? "").trim())
      .filter(Boolean);
    const sequenceLines = normalizedLines
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean);

    const sequenceBlock = sequenceLines.length
      ? `<br/>New sequence:<br/><br/>${sequenceLines.join("<br/>")}`
      : "";

    const description = `User ${fullName} updated the approver flow.${sequenceBlock}`;
    return { title, description };
  }

  if (item.variant === "edited_approver") {
    const title = "Edited Approver Flow";
    const fullName = [actorFirstName, actorLastName].filter(Boolean).join(" ").trim() || userName;
    const details = (item as any).details || [];
    const normalizedLines = (Array.isArray(details) ? details : [details])
      .map((d: any) => String(d ?? "").trim())
      .filter(Boolean);
    const updated = normalizedLines.find((d) => /^Updated\s*:/i.test(d)) || "";
    const previous = normalizedLines.find((d) => /^Previous\s*:/i.test(d)) || "";
    const scopeRaw = updated || previous || normalizedLines[0] || "";
    const approverScope = String(scopeRaw)
      .replace(/^Updated\s*:\s*/i, "")
      .replace(/^Previous\s*:\s*/i, "")
      .trim() || "Approver";
    const description = `User ${fullName} edited the ${approverScope} for the approver flow.`;
    return { title, description };
  }

  if (item.variant === "added_to_approver_flow") {
    const title = "Added to Approver Flow";
    const fullName = [actorFirstName, actorLastName].filter(Boolean).join(" ").trim() || userName;
    const details = (item as any).details || [];
    const deptFromDetails =
      details.find((d: string) => d.includes("Department/Office"))?.replace(/.*?:\s*/g, "").trim() ||
      details.find((d: string) => d.includes("Department"))?.replace(/.*?:\s*/g, "").trim() ||
      details.find((d: string) => d.includes("Office"))?.replace(/.*?:\s*/g, "").trim() ||
      "";
    const parsedDeptLabel = (() => {
      const raw = String(deptFromDetails || "").trim();
      if (!raw) return "";
      const quoted = raw.match(/"([^"]+)"/);
      if (quoted?.[1]) return quoted[1].trim();
      const paren = raw.match(/\(([^)]+)\)/);
      if (paren?.[1]) return paren[1].replace(/"/g, "").trim();
      const eq = raw.split("=").pop();
      if (eq) return String(eq).replace(/[()\"]/g, "").trim();
      return raw.replace(/[()\"]/g, "").trim();
    })();
    const deptLabel = parsedDeptLabel || deptOffice || "";
    const tail = deptLabel ? ` ${deptLabel}` : "";
    const description = `User ${fullName} added ${tail} to the approver flow.`;
    return { title, description };
  }

  if (item.variant === "removed_from_approver_flow") {
    const title = "Removed from Approver Flow";
    const fullName = [actorFirstName, actorLastName].filter(Boolean).join(" ").trim() || userName;
    const details = (item as any).details || [];
    const deptFromDetails =
      details.find((d: string) => d.includes("Department/Office"))?.replace(/.*?:\s*/g, "").trim() ||
      details.find((d: string) => d.includes("Department"))?.replace(/.*?:\s*/g, "").trim() ||
      details.find((d: string) => d.includes("Office"))?.replace(/.*?:\s*/g, "").trim() ||
      "";
    const parsedDeptLabel = (() => {
      const raw = String(deptFromDetails || "").trim();
      if (!raw) return "";
      const quoted = raw.match(/"([^"]+)"/);
      if (quoted?.[1]) return quoted[1].trim();
      const paren = raw.match(/\(([^)]+)\)/);
      if (paren?.[1]) return paren[1].replace(/"/g, "").trim();
      const eq = raw.split("=").pop();
      if (eq) return String(eq).replace(/[()\"]/g, "").trim();
      return raw.replace(/[()\"]/g, "").trim();
    })();
    const deptLabel = parsedDeptLabel || deptOffice || "";
    const tail = deptLabel ? ` ${deptLabel}` : "";
    const description = `User ${fullName} removed ${tail} to the approver flow.`;
    return { title, description };
  }

  if (item.variant === "edited_college") {
    const title = "Edited College";
    const fullName = [actorFirstName, actorLastName].filter(Boolean).join(" ").trim() || userName;
    const details = (item as any).details || [];
    const updatedCollege = details.find((d: string) => d.includes("Updated:"))?.replace("Updated:", "").trim() || "";
    const finalCollegeName = updatedCollege || collegeName || "";
    const collegeTail = finalCollegeName ? `: ${finalCollegeName}.` : ".";
    const description = `User ${fullName} edited college${collegeTail}`;
    return { title, description };
  }

  if (item.variant === "deleted_college") {
    const title = "Deleted College";
    const fullName = [actorFirstName, actorLastName].filter(Boolean).join(" ").trim() || userName;
    const details = (item as any).details || [];
    const collegeFromDetails = details.find((d: string) => d.includes("College :"))?.replace("College :", "").trim() || "";
    const finalCollegeName = collegeFromDetails || collegeName || "";
    const collegeTail = finalCollegeName ? `: ${finalCollegeName}.` : ".";
    const description = `User ${fullName} deleted college${collegeTail}`;
    return { title, description };
  }

  if (item.variant === "created_college") {
    const title = "Created College";
    const fullName = [actorFirstName, actorLastName].filter(Boolean).join(" ").trim() || userName;
    const details = (item as any).details || [];
    const collegeFromDetails =
      details.find((d: string) => d.includes("College :"))?.replace("College :", "").trim() ||
      details.find((d: string) => d.includes("College:"))?.replace("College:", "").trim() ||
      "";
    const finalCollegeName = collegeFromDetails || collegeName || "";
    const collegeTail = finalCollegeName ? `: ${finalCollegeName}.` : ".";
    const description = `User ${fullName} created college${collegeTail}`;
    return { title, description };
  }

  if (item.variant === "created_department") {
    const title = "Created Department";
    const fullName = [actorFirstName, actorLastName].filter(Boolean).join(" ").trim() || userName;
    const details = (item as any).details || [];
    const deptFromDetails =
      details.find((d: string) => d.includes("Department :"))?.replace("Department :", "").trim() ||
      details.find((d: string) => d.includes("Department:"))?.replace("Department:", "").trim() ||
      "";
    const collegeFromDetails =
      details.find((d: string) => d.includes("College :"))?.replace("College :", "").trim() ||
      details.find((d: string) => d.includes("College:"))?.replace("College:", "").trim() ||
      "";
    const finalDepartmentName = deptFromDetails || departmentName || "";
    const finalCollegeName = collegeFromDetails || collegeName || "";
    const deptTail = finalDepartmentName ? `: ${finalDepartmentName}` : "";
    const collegeTail = finalCollegeName ? ` for ${finalCollegeName}.` : ".";
    const description = `User ${fullName} created department${deptTail}${collegeTail}`;
    return { title, description };
  }

  if (item.variant === "edited_department") {
    const title = "Edited Department";
    const fullName = [actorFirstName, actorLastName].filter(Boolean).join(" ").trim() || userName;
    const details = (item as any).details || [];
    const deptFromDetails =
      details.find((d: string) => d.includes("Updated:"))?.replace("Updated:", "").trim() ||
      details.find((d: string) => d.includes("Department :"))?.replace("Department :", "").trim() ||
      details.find((d: string) => d.includes("Department:"))?.replace("Department:", "").trim() ||
      "";
    const collegeFromDetails =
      details.find((d: string) => d.includes("College :"))?.replace("College :", "").trim() ||
      details.find((d: string) => d.includes("College:"))?.replace("College:", "").trim() ||
      "";
    const finalDepartmentName = deptFromDetails || departmentName || "";
    const finalCollegeName = collegeFromDetails || collegeName || "";
    const deptTail = finalDepartmentName ? `: ${finalDepartmentName}` : "";
    const collegeTail = finalCollegeName ? ` for ${finalCollegeName}.` : ".";
    const description = `User ${fullName} edited department${deptTail}${collegeTail}`;
    return { title, description };
  }

  if (item.variant === "deleted_department") {
    const title = "Deleted Department";
    const fullName = [actorFirstName, actorLastName].filter(Boolean).join(" ").trim() || userName;
    const details = (item as any).details || [];
    const deptFromDetails =
      details.find((d: string) => d.includes("Department :"))?.replace("Department :", "").trim() ||
      details.find((d: string) => d.includes("Department:"))?.replace("Department:", "").trim() ||
      "";
    const collegeFromDetails =
      details.find((d: string) => d.includes("College :"))?.replace("College :", "").trim() ||
      details.find((d: string) => d.includes("College:"))?.replace("College:", "").trim() ||
      "";
    const finalDepartmentName = deptFromDetails || departmentName || "";
    const finalCollegeName = collegeFromDetails || collegeName || "";
    const deptTail = finalDepartmentName ? `: ${finalDepartmentName}` : "";
    const collegeTail = finalCollegeName ? ` for ${finalCollegeName}.` : ".";
    const description = `User ${fullName} deleted department${deptTail}${collegeTail}`;
    return { title, description };
  }

  if (item.variant === "created_office") {
    const title = "Created Office";
    const fullName = [actorFirstName, actorLastName].filter(Boolean).join(" ").trim() || userName;
    const details = (item as any).details || [];
    const officeFromDetails =
      details.find((d: string) => d.includes("Office :"))?.replace("Office :", "").trim() ||
      details.find((d: string) => d.includes("Office:"))?.replace("Office:", "").trim() ||
      "";
    const officeTail = officeFromDetails ? `: ${officeFromDetails}.` : ".";
    const description = `User ${fullName} created office${officeTail}`;
    return { title, description };
  }

  if (item.variant === "edited_office") {
    const title = "Edited Office";
    const fullName = [actorFirstName, actorLastName].filter(Boolean).join(" ").trim() || userName;
    const details = (item as any).details || [];
    const officeFromDetails =
      details.find((d: string) => d.includes("Updated:"))?.replace("Updated:", "").trim() ||
      details.find((d: string) => d.includes("Office :"))?.replace("Office :", "").trim() ||
      details.find((d: string) => d.includes("Office:"))?.replace("Office:", "").trim() ||
      "";
    const officeTail = officeFromDetails ? `: ${officeFromDetails}.` : ".";
    const description = `User ${fullName} edited office${officeTail}`;
    return { title, description };
  }

  if (item.variant === "deleted_office") {
    const title = "Deleted Office";
    const fullName = [actorFirstName, actorLastName].filter(Boolean).join(" ").trim() || userName;
    const details = (item as any).details || [];
    const officeFromDetails =
      details.find((d: string) => d.includes("Office :"))?.replace("Office :", "").trim() ||
      details.find((d: string) => d.includes("Office:"))?.replace("Office:", "").trim() ||
      "";
    const officeTail = officeFromDetails ? `: ${officeFromDetails}.` : ".";
    const description = `User ${fullName} deleted office${officeTail}`;
    return { title, description };
  }

  if (item.variant === "user_logout") {
    const title = "User Logout";
    const fullName = [actorFirstName, actorLastName].filter(Boolean).join(" ").trim() || userName;
    const roleTail = item.actorRole?.trim() ? ` as ${item.actorRole.trim()}` : "";
    const inTail = deptOffice ? ` in ${deptOffice}.` : ".";
    const description = `User ${fullName} logged out${roleTail}${inTail}`;
    return { title, description };
  }

  if (item.variant === "user_login") {
    const title = "User Login";
    const fullName = [actorFirstName, actorLastName].filter(Boolean).join(" ").trim() || userName;
    const roleTail = item.actorRole?.trim() ? ` as ${item.actorRole.trim()}` : "";
    const inTail = deptOffice ? ` in ${deptOffice}.` : ".";
    const description = `User ${fullName} logged in${roleTail}${inTail}`;
    return { title, description };
  }

  if (item.variant === "updated_assistant_approver") {
    const title = "Updated Assistant Approver";
    const assistantTail = assistantApproverName ? ` ${assistantApproverName}` : "";
    const description = `User ${userName} updated assistant approver${assistantTail}${deptTail}`;
    return { title, description };
  }

  if (item.variant === "removed_assistant_approver") {
    const title = "Removed Assistant Approver";
    const assistantTail = assistantApproverName ? ` ${assistantApproverName}` : "";
    const description = `User ${userName} removed assistant approver${assistantTail}${deptTail}`;
    return { title, description };
  }

  if (item.variant === "added_assistant_approver") {
    const title = "Added Assistant Approver";
    const assistantTail = assistantApproverName ? ` ${assistantApproverName}` : "";
    const description = `User ${userName} created assistant approver${assistantTail}${deptTail}`;
    return { title, description };
  }

  if (item.variant === "deleted_requirements") {
    const title = "Deleted Requirements";
    const description = `User ${userName} deleted requirement${requirementTail}${deptTail}`;
    return { title, description };
  }

  if (item.variant === "created_requirements") {
    const title = "Created Requirements";
    const description = `User ${userName} created requirement${requirementTail}${deptTail}`;
    return { title, description };
  }

  if (item.variant === "edited_requirements") {
    const title = "Edited Requirements";
    const description = `User ${userName} edited requirement${requirementTail}${deptTail}`;
    return { title, description };
  }

  if (item.variant === "faculty_data_dump_upload") {
    const title = "Faculty Data Dump Uploaded";
    const details = (item as any).details || [];
    const fileName = details.find((d: string) => d.includes("File name"))?.replace(/.*?=/, "").trim() || "";
    const timeline = details.find((d: string) => d.includes("Timeline"))?.replace(/.*?=/, "").trim() || "";
    const description = `User ${actorName} uploaded ${fileName} in timeline ${timeline}.`;
    return { title, description };
  }

  if (item.variant === "faculty_data_dump_removed") {
    const title = "Faculty Data Dump Removed";
    const details = (item as any).details || [];
    const fileName = details.find((d: string) => d.includes("File name"))?.replace(/.*?=/, "").trim() || "";
    const timeline = details.find((d: string) => d.includes("Timeline"))?.replace(/.*?=/, "").trim() || "";
    const description = `User ${actorName} removed ${fileName} in timeline ${timeline}.`;
    return { title, description };
  }

  if (item.variant === "faculty_data_dump_error") {
    const title = "Faculty Data Dump Error";
    const details = (item as any).details || [];
    const fileName = details.find((d: string) => d.includes("File name"))?.replace(/.*?=/, "").trim() || "";
    const timeline = details.find((d: string) => d.includes("Timeline"))?.replace(/.*?=/, "").trim() || "";
    const description = `User ${actorName} failed to upload ${fileName} in timeline ${timeline}.`;
    return { title, description };
  }

  if (item.variant === "deleted_guideline") {
    const title = "Deleted Guideline";
    const details = (item as any).details || [];
    const guidelineName = details.find((d: string) => d.includes("Guideline:"))?.replace("Guideline: ", "").trim() || "";
    const description = `User ${actorName} deleted guideline${guidelineName ? `: ${guidelineName}` : ""}.`;
    return { title, description };
  }

  if (item.variant === "create_request") {
    const title = "Create Request";
    const description = `Faculty Member ${facultyName || actorName} from ${facultyCollegeDepartment}, requested for clearance.`;
    return { title, description };
  }

  if (item.variant === "approved_clearance") {
    const title = "Approved Clearance";
    const description = `User ${actorName} of Department/Office ${item.approverDepartment || ""}, approved clearance for faculty member ${facultyName}.`;
    return { title, description };
  }

  return {
    title: item.title ?? String(item.variant ?? ""),
    description: item.description ?? "",
  };
}

export function ActivityLogsCard({ items, className }: ActivityLogsCardProps): React.ReactElement {
  const parseDateParts = React.useCallback((dateLabel: string) => {
    const today = new Date();

    const shortMonths = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

    if (dateLabel === "Today") {
      return {
        year: String(today.getFullYear()),
        monthIndex: today.getMonth(),
        monthShort: shortMonths[today.getMonth()],
        day: String(today.getDate()).padStart(2, "0"),
        key: `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`,
      };
    }

    const mmddyyyy = /^\d{2}\/\d{2}\/\d{4}$/.test(dateLabel);
    if (mmddyyyy) {
      const [mm, dd, yyyy] = dateLabel.split("/");
      const monthIndex = Math.max(0, Math.min(11, Number(mm) - 1));
      const dayNum = Number(dd);
      return {
        year: yyyy,
        monthIndex,
        monthShort: shortMonths[monthIndex],
        day: String(dayNum).padStart(2, "0"),
        key: `${yyyy}-${monthIndex}-${dayNum}`,
      };
    }

    return {
      year: "",
      monthIndex: 0,
      monthShort: "",
      day: "",
      key: dateLabel,
    };
  }, []);

  const getItemTimestamp = React.useCallback(
    (item: ActivityLogItem): number => {
      try {
        const createdAt = String((item as any).created_at ?? "").trim();
        if (createdAt) {
          const ms = Date.parse(createdAt);
          if (!Number.isNaN(ms)) return ms;
        }
      } catch {
      }

      try {
        const d = parseDateParts(item.dateLabel);
        const yearNum = Number(d.year);
        if (!yearNum) return 0;

        let hour = 0;
        let minute = 0;
        const t = (item.timeLabel || "").trim();
        if (t) {
          const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
          if (m) {
            hour = Number(m[1]);
            minute = Number(m[2]);
            const ampm = (m[3] || "").toUpperCase();
            if (ampm === "PM" && hour < 12) hour += 12;
            if (ampm === "AM" && hour === 12) hour = 0;
          }
        }

        return new Date(yearNum, d.monthIndex, Number(d.day) || 1, hour, minute).getTime();
      } catch {
        return 0;
      }
    },
    [parseDateParts]
  );

  const normalizedItems = React.useMemo(() => {
    return (items ?? []).map((it) => {
      const evt = String((it as any).event_type ?? "").trim();
      if (!evt) return it;

      const currentVariant = String((it as any).variant ?? "").trim();
      if (currentVariant.toLowerCase() === evt.toLowerCase()) return it;

      return { ...it, variant: evt as any };
    });
  }, [items]);

  const yearGroups = React.useMemo(() => {
    const yearMap: Map<
      string,
      Map<
        string,
        {
          key: string;
          year: string;
          monthShort: string;
          day: string;
          items: ActivityLogItem[];
          sortKey: number;
        }
      >
    > = new Map();

    for (const item of normalizedItems) {
      const ts = getItemTimestamp(item);
      const dateObj = ts ? new Date(ts) : null;

      const parsed = parseDateParts(item.dateLabel);
      const year = dateObj ? String(dateObj.getFullYear()) : parsed.year || "";
      const monthShort = dateObj
        ? ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][dateObj.getMonth()]
        : parsed.monthShort;
      const day = dateObj ? String(dateObj.getDate()).padStart(2, "0") : parsed.day;
      const monthIndex = dateObj ? dateObj.getMonth() : parsed.monthIndex || 0;

      const dateKey = dateObj ? `${year}-${monthIndex}-${dateObj.getDate()}` : parsed.key;
      const sortKey = ts || 0;

      let datesMap = yearMap.get(year);
      if (!datesMap) {
        datesMap = new Map();
        yearMap.set(year, datesMap);
      }

      let d = datesMap.get(dateKey);
      if (!d) {
        d = {
          key: dateKey,
          year,
          monthShort,
          day,
          items: [item],
          sortKey,
        };
        datesMap.set(dateKey, d);
      } else {
        d.items.push(item);
        if (sortKey > d.sortKey) d.sortKey = sortKey;
      }
    }

    const yearEntries = Array.from(yearMap.entries()).sort((a, b) => {
      const an = Number(a[0]) || 0;
      const bn = Number(b[0]) || 0;
      return bn - an;
    });

    return yearEntries.map(([year, datesMap]) => {
      const dates = Array.from(datesMap.values())
        .sort((a, b) => b.sortKey - a.sortKey)
        .map(({ sortKey: _sortKey, ...rest }) => rest);
      return { year, dates };
    });
  }, [getItemTimestamp, normalizedItems, parseDateParts]);

  return (
    <div className={cn("space-y-6", className)}>
      {yearGroups.map((yearGroup) => (
        <div key={yearGroup.year || "no-year"} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <div className="text-xl font-bold tracking-wide text-black">YEAR {yearGroup.year}</div>
            </div>
            <div className="h-[2px] flex-1 bg-[hsl(var(--gray-border))]" />
          </div>

          <div className="space-y-6">
            {yearGroup.dates.map((dateGroup) => (
              <div key={dateGroup.key} className="grid grid-cols-[60px_1fr] gap-0">
                <div className="-ml-4 flex flex-col items-center">
                  <div className="w-full text-center text-lg font-bold text-primary">{dateGroup.monthShort}</div>

                  <div className="mt-1 flex flex-1 flex-col items-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                      {dateGroup.day}
                    </div>
                    <div className="w-1 flex-1 rounded-full bg-primary" />
                  </div>
                </div>

                <div className="ml-1 space-y-5">
                  {dateGroup.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg bg-background p-5 shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
                    >
                      {(() => {
                        const autoText = formatActivityLogText(item);
                        const evt = String((item as any).event_type ?? "").trim();

                        const normalizeKey = (v: string) => v.toLowerCase().replace(/_+/g, "_").trim();

                        const shouldUseAutoTitle =
                          !item.title ||
                          item.title === item.variant ||
                          (evt && item.title === evt) ||
                          (item.title &&
                            /^[a-z0-9_]+$/i.test(item.title) &&
                            (normalizeKey(item.title) === normalizeKey(String(item.variant ?? "")) ||
                              (evt && normalizeKey(item.title) === normalizeKey(evt))));

                        const shouldUseAutoDescription =
                          !item.description ||
                          item.description === item.title ||
                          item.description === item.variant ||
                          (evt && item.description === evt) ||
                          /\[[^\]]+\]/.test(item.description);

                        const title = shouldUseAutoTitle ? autoText.title : item.title;
                        const description =
                          (shouldUseAutoDescription ? autoText.description : item.description) ?? "";

                        return (
                          <>
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-2">
                                {getActivityIcon(item.variant)}
                                <div className="text-xl font-bold text-primary">{title}</div>
                              </div>

                              <div className="whitespace-nowrap text-sm italic text-muted-foreground">{item.timeLabel}</div>
                            </div>

                            <div
                              className="mt-2 text-md text-foreground text-justify"
                              dangerouslySetInnerHTML={{ __html: description }}
                            />
                          </>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
