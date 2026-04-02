import "../../index.css";
import { OVPHEHeader } from "../../stories/components/header";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../../stories/components/breadcrumb";

import { SearchInputGroup } from "../../stories/components/input-group";

import {
  ActivityLogsCard,
  type ActivityLogItem,
  type ActivityLogVariant,
} from "../../stories/components/activity-logs-card";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { useEffect, useMemo, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import { Button } from "../../stories/components/button";

function mapEventNameToVariant(eventName: string): ActivityLogVariant {
  const eventMapping: Record<string, ActivityLogVariant> = {
    approved_clearance: "approved_clearance",
    rejected_clearance: "rejected_clearance",
    create_request: "create_request",
    edited_requirements: "edited_requirements",
    created_requirements: "created_requirements",
    deleted_requirements: "deleted_requirements",
    added_assistant_approver: "added_assistant_approver",
    updated_assistant_approver: "updated_assistant_approver",
    removed_assistant_approver: "removed_assistant_approver",
    user_logout: "user_logout",
    user_login: "user_login",
    google_login: "user_login",
    exported_clearance_results: "exported_clearance_results",
    created_guideline: "created_guideline",
    edited_guideline: "edited_guideline",
    delete_guideline: "delete_guideline",
    deleted_guideline: "deleted_guideline",
    enabled_guideline: "enabled_guideline",
    disabled_guideline: "disabled_guideline",
    archived_guideline: "archived_guideline",
    created_announcement: "created_announcement",
    edited_announcement: "edited_announcement",
    enabled_announcement: "enabled_announcement",
    disabled_announcement: "disabled_announcement",
    deleted_announcement: "deleted_announcement",
    set_announcement_status_active: "set_announcement_status_active",
    set_announcement_status_inactive: "set_announcement_status_inactive",
    created_timeline: "created_timeline",
    edited_timeline: "edited_timeline",
    archived_timeline: "archived_timeline",
    enabled_timeline: "enabled_timeline",
    disabled_timeline: "disabled_timeline",
    set_timeline_status_active: "enabled_timeline",
    set_timeline_status_inactive: "disabled_timeline",
    created_approver: "created_approver",
    edited_approver: "edited_approver",
    removed_approver: "removed_approver",
    uploaded_faculty_data_dump: "uploaded_faculty_data_dump",
    removed_faculty_data_dump: "removed_faculty_data_dump",
  };

  return eventMapping[eventName] ?? "create_request";
}

export default function OVPHEActivityLogs() {
  
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 40;

  const [items, setItems] = useState<ActivityLogItem[]>([]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("query", query.trim());
    params.set("page", "1");
    params.set("pageSize", "500");

    fetch(`/admin/xu-faculty-clearance/api/ovphe/activity-logs?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { items: ActivityLogItem[] }) => {
        const roleNeedle = "OVPHE";
        const onlyOvphe = (data.items ?? []).filter((it) => {
          const role = String((it as any).actorRole ?? "").trim();
          if (!role) return false;
          return role.toLowerCase() === roleNeedle.toLowerCase() || role.toLowerCase().startsWith(roleNeedle.toLowerCase());
        });

        const mappedItems = onlyOvphe.map((it) => {
          const evt = String((it as any).event_type ?? "").trim();
          const raw = evt || String((it as any).variant ?? "").trim() || String((it as any).title ?? "").trim();
          const variant = mapEventNameToVariant(raw);
          return {
            ...it,
            event_type: evt || (it as any).event_type,
            variant,
          };
        });

        setItems(mappedItems);
      })
      .catch(() => setItems([]));
  }, [query]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const haystack = [
        it.title,
        it.description,
        it.actorFirstName,
        it.actorLastName,
        it.facultyFirstName,
        it.facultyLastName,
        it.approverDepartment,
        it.facultyCollege,
        it.facultyDepartment,
        it.universityId,
        it.requestId,
        it.dateLabel,
        it.timeLabel,
        ...it.details,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query]);

  // Reset to first page whenever the filtered set changes
  // (we'll reset on the sorted list below)

  // Parse dateLabel + timeLabel into a comparable timestamp.
  const parseItemTimestamp = (it: ActivityLogItem) => {
    try {
      const today = new Date();

      // Date part
      let year = 0;
      let monthIndex = 0;
      let day = 1;

      if (it.dateLabel === "Today") {
        year = today.getFullYear();
        monthIndex = today.getMonth();
        day = today.getDate();
      } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(it.dateLabel)) {
        const [mm, dd, yyyy] = it.dateLabel.split("/");
        monthIndex = Math.max(0, Math.min(11, Number(mm) - 1));
        day = Number(dd) || 1;
        year = Number(yyyy) || 0;
      }

      // Time part (e.g. "1:40 PM")
      let hour = 0;
      let minute = 0;
      if (it.timeLabel) {
        const m = it.timeLabel.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
        if (m) {
          hour = Number(m[1]);
          minute = Number(m[2]);
          const ampm = (m[3] || "").toUpperCase();
          if (ampm === "PM" && hour < 12) hour += 12;
          if (ampm === "AM" && hour === 12) hour = 0;
        }
      }

      // If year is missing (unparseable), return epoch 0 so it sorts last.
      if (!year) return 0;

      return new Date(year, monthIndex, day, hour, minute).getTime();
    } catch (e) {
      return 0;
    }
  };

  // Sort filtered items by timestamp (most recent first)
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      return parseItemTimestamp(b) - parseItemTimestamp(a);
    });
  }, [filteredItems]);

  useEffect(() => {
    setPage(1);
  }, [sortedItems]);

  // Group sorted items by year so a year appears only once.
  const yearGroups = useMemo(() => {
    const map = new Map<string, ActivityLogItem[]>();
    for (const it of sortedItems) {
      const ts = parseItemTimestamp(it);
      const year = ts ? String(new Date(ts).getFullYear()) : parseItemTimestamp(it) ? String(new Date(parseItemTimestamp(it)).getFullYear()) : "";
      const k = year || "";
      const arr = map.get(k) ?? [];
      arr.push(it);
      map.set(k, arr);
    }
    // sort years descending
    const entries = Array.from(map.entries()).sort((a, b) => {
      const an = Number(a[0]) || 0;
      const bn = Number(b[0]) || 0;
      return bn - an;
    });
    return entries.map(([year, items]) => ({ year, items }));
  }, [sortedItems]);

  // Paginate by year groups so a year isn't split across pages.
  // Show all year-groups on one page so all logs are visible.
  const yearsPerPage = yearGroups.length;
  const totalPages = Math.max(1, Math.ceil(yearGroups.length / yearsPerPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startYearIndex = (safePage - 1) * yearsPerPage;
  const pagedYearGroups = yearGroups.slice(startYearIndex, startYearIndex + yearsPerPage);
  const pagedItems = pagedYearGroups.flatMap((g) => g.items);

  // Ensure rendered items have unique ids to avoid React key collisions
  const renderedItems = pagedItems.map((it, i) => ({ ...it, id: `${it.id}-${startYearIndex}-${i}` }));

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  return (
    <div className="min-h-screen bg-primary-foreground text-primary-foreground">
      
      {/* HEADER */}
      <div className="header mb-3">
        <OVPHEHeader />
      </div>

      {/* DASHBOARD CONTENT */}
      <main className="dashboard p-4">
        
        <h1 className="text-2xl text-left text-primary font-bold">Check Activity Logs</h1>

        
        <Breadcrumb className="mt-2">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/OVPHE-tools">Tools</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Check Activity Logs</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      
        <div className="mb-3 mt-2 flex items-center justify-end">
          <Button variant="back" size="back" onClick={() => navigate("/OVPHE-tools")}> 
            <div className="flex items-center gap-2">
              <img src="BlackArrowIcon.png" alt="back" className="h-4 w-4" />Back
            </div>
          </Button>
        </div>
       
       <div className="mt-5 space-y-5">
          <div className="w-full max-w-[520px]">
            <SearchInputGroup
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              containerClassName="h-10"
              placeholder="Search by name, ID, or email..."
            />
          </div>
        </div>

        <div className="mt-4">
          <ActivityLogsCard items={renderedItems} />

          <div className="mt-8 h-px w-full bg-[hsl(var(--gray-border))]"  />

          <div className="px-6 pb-4">
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span>Page</span>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-foreground disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                value={safePage}
                onChange={(e) => setPage(Number(e.target.value))}
              >
                {Array.from({ length: totalPages }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-foreground disabled:opacity-50"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <span>of {totalPages}</span>
            </div>
          </div>
        </div>

        

        
      </main>
    </div>
  );
}
