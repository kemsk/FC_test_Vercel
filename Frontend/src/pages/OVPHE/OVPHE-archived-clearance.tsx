import * as React from "react";

import "../../index.css"; 
import { OVPHEHeader } from "../../stories/components/header";

import {
  type AnnouncementItem,
} from "../../stories/components/cards";

import { Button } from "../../stories/components/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../stories/components/select";

import {
  loadAnnouncementsItems,
} from "../../stories/components/edit-announcements-dialog";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../../stories/components/breadcrumb";
import { Link, useNavigate } from "react-router-dom";
import { SearchInputGroup } from "../../stories/components/input-group";
import { useState } from "react";

type ArchivedTimelineItem = {
  id: string;
  name: string;
  academicYear: string;
  semester: string;
  clearancePeriodStart: string;
  clearancePeriodEnd: string;
  lastUpdated: string;
  archivedDate: string;
};

type ArchivedFacultyItem = {
  id: string;
  employeeId: string;
  name: string;
  college: string;
  department: string;
  facultyType: string;
  status: "COMPLETED" | "INCOMPLETE";
  missingApproval: string;
  lastUpdated: string;
};

function postOVPHEActivityLog(payload: { event_type: string; details?: string[] }) {
  fetch("/admin/xu-faculty-clearance/api/ovphe/activity-logs", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

export default function OVPHEArchiveClearance() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedTerm, setSelectedTerm] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedTimeline, setSelectedTimeline] = React.useState<ArchivedTimelineItem | null>(null);

  type AnnouncementApiItem = AnnouncementItem & { id: number; email?: string };

  const [, setItems] = React.useState<AnnouncementApiItem[]>([]);
  const [timelines, setTimelines] = React.useState<ArchivedTimelineItem[]>([]);
  const [faculty, setFaculty] = React.useState<ArchivedFacultyItem[]>([]);
  const [loading, setLoading] = React.useState(false);

  const loadTimelines = React.useCallback(() => {
    setLoading(true);
    return fetch("/admin/xu-faculty-clearance/api/ovphe/archived-clearance")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { items: ArchivedTimelineItem[] }) => {
        setTimelines(data.items ?? []);
      })
      .catch(() => {
        setTimelines([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const loadFaculty = React.useCallback((timelineId: string, status: string) => {
    setLoading(true);
    const params = new URLSearchParams({ timelineId });
    if (status && status !== "all") {
      params.append("status", status.toUpperCase());
    }
    return fetch(`/admin/xu-faculty-clearance/api/ovphe/view-clearance?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { items: ArchivedFacultyItem[] }) => {
        setFaculty(data.items ?? []);
      })
      .catch(() => {
        setFaculty([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleTimelineClick = (timeline: ArchivedTimelineItem) => {
    setSelectedTimeline(timeline);
    setSelectedStatus("all");
    loadFaculty(timeline.id, "all");
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    if (selectedTimeline) {
      loadFaculty(selectedTimeline.id, status);
    }
  };

  const handleExport = () => {
    if (!selectedTimeline || faculty.length === 0) return;
    
    const headers = ["Employee ID", "Name", "College", "Department", "Faculty Type", "Status", "Missing Approval"];
    const rows = faculty.map(f => [
      f.employeeId,
      f.name,
      f.college,
      f.department,
      f.facultyType,
      f.status,
      f.missingApproval
    ]);
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedTimeline.name}-export.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    postOVPHEActivityLog({
      event_type: "exported_archived_clearance",
      details: [selectedTimeline.id, selectedTimeline.name]
    });
  };

  const refresh = React.useCallback(() => {
    return fetch("/admin/xu-faculty-clearance/api/ovphe/announcements")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { items: AnnouncementApiItem[] }) => {
        const initial = (data.items ?? []).map((item) => ({
          ...item,
          enabled: item.enabled ?? true,
        }));
        setItems(initial);
      });
  }, []);

  React.useEffect(() => {
    loadTimelines();
  }, [loadTimelines]);

  React.useEffect(() => {
    refresh()
      .catch(() => {
        const initial = loadAnnouncementsItems().map((item) => ({
          ...item,
          enabled: item.enabled ?? true,
        }));
        setItems(initial as AnnouncementApiItem[]);
      });
  }, [refresh]);

  const yearOptions = React.useMemo(() => {
    return Array.from(new Set(timelines.map((timeline) => timeline.academicYear))).filter(Boolean);
  }, [timelines]);

  const termOptions = React.useMemo(() => {
    return Array.from(new Set(timelines.map((timeline) => timeline.semester))).filter(Boolean);
  }, [timelines]);

  const filteredTimelines = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return timelines.filter((timeline) => {
      const matchesQuery =
        !normalizedQuery ||
        timeline.name.toLowerCase().includes(normalizedQuery) ||
        timeline.academicYear.toLowerCase().includes(normalizedQuery);
      const matchesYear = selectedYear === "all" || timeline.academicYear === selectedYear;
      const matchesTerm = selectedTerm === "all" || timeline.semester === selectedTerm;
      return matchesQuery && matchesYear && matchesTerm;
    });
  }, [query, selectedTerm, selectedYear, timelines]);

  if (selectedTimeline) {
    return (
      <div className="min-h-screen bg-primary-foreground text-primary-foreground">
        <div className="header mb-3">
          <OVPHEHeader />
        </div>

        <main className="dashboard p-4 mt-2 space-y-3">
          <h1 className="text-2xl text-left text-primary font-bold">{selectedTimeline.name}</h1>

          <Breadcrumb className="mt-2">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/OVPHE-archived-clearance" onClick={() => setSelectedTimeline(null)}>View Archived Clearance</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{selectedTimeline.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="mb-3 mt-2 flex items-center justify-between">
            <Button variant="back" size="back" onClick={() => setSelectedTimeline(null)}>
              <div className="flex items-center gap-2">
                <img src="BlackArrowIcon.png" alt="back" className="h-4 w-4" />Back
              </div>
            </Button>
            <Button variant="default" onClick={handleExport} disabled={faculty.length === 0}>
              <div className="flex items-center gap-2">
                <span>📥 Export Current View</span>
              </div>
            </Button>
          </div>

          <div className="mt-5 space-y-5">
            <div className="w-full mt-5">
              <SearchInputGroup
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                containerClassName="h-10"
                placeholder="Search by name or ID..."
              />
            </div>
          </div>

          <div className="mt-3 space-y-4">
            <div className="w-full flex flex-col sm:flex-row gap-3 justify-start mt-5">
              <div className="flex gap-3">
                <Select value={selectedStatus} onValueChange={handleStatusChange}>
                  <SelectTrigger variant="pill" className="w-max gap-2">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="completed">Complete</SelectItem>
                    <SelectItem value="incomplete">Incomplete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-3 space-y-3">
              {faculty.map((f) => (
                <div key={f.id} className="border rounded-lg p-4 bg-white">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-primary">{f.name}</h3>
                      <p className="text-sm text-gray-600">Employee ID: {f.employeeId}</p>
                      <p className="text-sm text-gray-600">College: {f.college}</p>
                      <p className="text-sm text-gray-600">Department: {f.department}</p>
                      <p className="text-sm text-gray-600">Faculty Type: {f.facultyType}</p>
                      {f.missingApproval && <p className="text-sm text-gray-600">Missing Approval: {f.missingApproval}</p>}
                    </div>
                    <div className="ml-4">
                      <span className={`px-3 py-1 rounded-full text-white text-sm font-semibold ${f.status === 'COMPLETED' ? 'bg-green-500' : 'bg-yellow-500'}`}>
                        {f.status === 'COMPLETED' ? 'COMPLETE' : 'INCOMPLETE'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {faculty.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                  No faculty records found for this timeline.
                </div>
              )}
              {loading && (
                <div className="text-center py-8 text-gray-500">
                  Loading...
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-foreground text-primary-foreground">
      
      {/* HEADER */}
      <div className="header mb-3">
        <OVPHEHeader />
      </div>

      {/* DASHBOARD CONTENT */}
      <main className="dashboard p-4 mt-2 space-y-3">

        <h1 className="text-2xl text-left text-primary font-bold">View Archived Clearance</h1>

        <Breadcrumb className="mt-2">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/OVPHE-tools">Tools</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>View Archived Clearance</BreadcrumbPage>
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
          <div className="w-full mt-5">
            <SearchInputGroup
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              containerClassName="h-10"
              placeholder="Search by name, ID, or email..."
            />
          </div>
        </div>

        <div className="mt-3 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger variant="pill" className="w-full sm:w-[170px] gap-2 rounded-full border-0 bg-[#7c83d6] text-white shadow-none hover:bg-[#6f76cb]">
                <SelectValue placeholder="School Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">School Year</SelectItem>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
              <SelectTrigger variant="pill" className="w-full sm:w-[150px] gap-2 rounded-full border-0 bg-[#7c83d6] text-white shadow-none hover:bg-[#6f76cb]">
                <SelectValue placeholder="Term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Term</SelectItem>
                {termOptions.map((term) => (
                  <SelectItem key={term} value={term}>{term}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {filteredTimelines.map((timeline) => (
              <div
                key={timeline.id}
                className="overflow-hidden rounded-2xl border border-[#d9dde7] bg-white shadow-sm transition-shadow hover:shadow-md cursor-pointer"
                onClick={() => handleTimelineClick(timeline)}
              >
                <div className="flex items-center justify-between border-b border-[#d9dde7] px-5 py-4">
                  <h3 className="text-lg font-bold text-black">{timeline.name}</h3>
                  <span className="text-3xl leading-none text-black">›</span>
                </div>

                <div className="grid gap-x-6 gap-y-2 px-5 py-4 text-sm text-black sm:grid-cols-[160px_1fr]">
                  <span className="font-semibold">Academic Year</span>
                  <span>{timeline.academicYear}</span>

                  <span className="font-semibold">Semester</span>
                  <span>{timeline.semester}</span>

                  <span className="font-semibold">Clearance Period</span>
                  <span>{timeline.clearancePeriodStart} - {timeline.clearancePeriodEnd}</span>

                  <span className="font-semibold">Last Update</span>
                  <span>{timeline.lastUpdated}</span>

                  <span className="font-semibold">Archived</span>
                  <span>{timeline.archivedDate}</span>
                </div>
              </div>
            ))}
            {filteredTimelines.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                No archived timelines found.
              </div>
            )}
            {loading && (
              <div className="text-center py-8 text-gray-500">
                Loading...
              </div>
            )}
          </div>
        </div>


      </main>

    </div>
  );
}
