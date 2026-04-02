import * as React from "react";

import "../../index.css"; 
import { CISOHeader } from "../../stories/components/header";

import {
  AnnouncementsCard,
  type AnnouncementItem,
  WelcomeAcademicCard,
  SystemGuidlinesCard,
  type SystemGuidlinesItem,
} from "../../stories/components/cards";

type CISOGuidelinesResponse = { items: SystemGuidlinesItem[] };
type CISOAnnouncementsResponse = { items: AnnouncementItem[] };

export default function CISODashboard() {
  const [me, setMe] = React.useState<{
    email: string;
    university_id: string;
    first_name: string | null;
    middle_name: string | null;
    last_name: string | null;
    role_value: number | null;
  } | null>(null);

  const [timeline, setTimeline] = React.useState<{ academicYear: string; semester: string } | null>(null);
  const [profile, setProfile] = React.useState<{
    email: string;
    university_id: string;
    first_name: string | null;
    middle_name: string | null;
    last_name: string | null;
    role: string;
  } | null>(null);

  const [items, setItems] = React.useState<SystemGuidlinesItem[]>([]);
  const [announcementItems, setAnnouncementItems] = React.useState<AnnouncementItem[]>([]);

  const dashboardGuidelines = React.useMemo(() => {
    return items.filter((g) => g.enabled ?? true);
  }, [items]);

  const dashboardGuidelinesNoEmail = React.useMemo(() => {
    return dashboardGuidelines.map((g) => ({
      ...g,
      email: "",
    }));
  }, [dashboardGuidelines]);

  const dashboardAnnouncements = React.useMemo(() => {
    return announcementItems
      .filter((a) => a.enabled ?? true)
      .slice()
      .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
  }, [announcementItems]);

  React.useEffect(() => {
    fetch("/admin/xu-faculty-clearance/api/me")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load profile");
        return res.json();
      })
      .then((data) => setMe(data))
      .catch(() => setMe(null));
    fetch("/admin/xu-faculty-clearance/api/active-clearance-timeline")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setTimeline(data))
      .catch(() => setTimeline(null));

    fetch("/admin/xu-faculty-clearance/api/ciso/system-guidelines")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: CISOGuidelinesResponse) => setItems(data.items ?? []))
      .catch(() => setItems([]));

    fetch("/admin/xu-faculty-clearance/api/ciso/announcements")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: CISOAnnouncementsResponse) => setAnnouncementItems(data.items ?? []))
      .catch(() => setAnnouncementItems([]));

    fetch("/admin/xu-faculty-clearance/api/ciso-profile")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load profile");
        return res.json();
      })
      .then((data) => {
        setProfile(data);
      })
      .catch(() => {
        setProfile(null);
      });
  }, []);

  const roleLabel = React.useMemo(() => {
    if (profile?.role) return profile.role;
    if (me?.role_value === 2) return "CISO";
    if (me?.role_value === 3) return "OVPHE";
    if (me?.role_value === 1) return "HRO";
    if (me?.role_value === 4) return "APPROVER";
    if (me?.role_value === 5) return "ASSISTANT_APPROVER";
    if (me?.role_value === 6) return "FACULTY";
    if (me?.role_value === 7) return "DUAL_ROLE";
    return "";
  }, [me, profile]);

  const displayName = React.useMemo(() => {
    if (!me) return "";
    const parts = [me.first_name, me.middle_name, me.last_name]
      .map((p) => (p ?? "").trim())
      .filter(Boolean);
    return parts.length ? parts.join(" ") : me.email;
  }, [me]);

  return (
    <div className="min-h-screen bg-primary-foreground text-primary-foreground">
      
      {/* HEADER */}
      <div className="header mb-3">
        <CISOHeader />
      </div>

      {/* DASHBOARD CONTENT */}
      <main className="dashboard p-4 mt-2 space-y-3">
        <WelcomeAcademicCard
          name={displayName}
          topLeft={{ label: "Academic Year", value: timeline?.academicYear || "" }}
          topRight={{ label: "Semester", value: timeline?.semester || "" }}
          rows={[{ label: "System Admin Role", value: roleLabel }]}
        />
        

          <SystemGuidlinesCard
            items={dashboardGuidelinesNoEmail}
            headerActionHref="/CISO-system-guideline"
            headerActionImgSrc="/_WhiteArrowIcon.png"
            headerActionImgAlt="Open Requirements"
            cardName="System Guidelines"
          />
  


          <AnnouncementsCard 
          items={dashboardAnnouncements} 
          headerActionHref="/CISO-announcement"
          headerActionImgSrc="/BlackChevronIcon.png"
          headerActionImgAlt="Open Announcements"
          
          />



      </main>

    </div>
  );
}
