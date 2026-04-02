import * as React from "react";

import "../../index.css"; 
import { ApprovalHeader } from "../../stories/components/header";

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

export default function ApproverAchivedClearance() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedTerm, setSelectedTerm] = useState("all");

  type AnnouncementApiItem = AnnouncementItem & { id: number; email?: string };

  const [, setItems] = React.useState<AnnouncementApiItem[]>([]);
  const [timelines, setTimelines] = React.useState<ArchivedTimelineItem[]>([]);
  const [loading, setLoading] = React.useState(false);

  const loadTimelines = React.useCallback(() => {
    setLoading(true);
    return fetch("/admin/xu-faculty-clearance/api/approver/archived-clearance")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { items: ArchivedTimelineItem[] }) => {
        setTimelines(data.items ?? []);
      })
      .catch(() => {
        setTimelines([]);
      })
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <div className="min-h-screen bg-primary-foreground text-primary-foreground">
      
      {/* HEADER */}
      <div className="header mb-3">
        <ApprovalHeader />
      </div>

      {/* DASHBOARD CONTENT */}
      <main className="dashboard p-4 mt-2 space-y-3">

        <h1 className="text-2xl text-left text-primary font-bold">View Archived Clearance</h1>

        <Breadcrumb className="mt-2">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/approver-action">Action</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>View Archived Clearance</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mb-3 mt-2 flex items-center justify-end">
          <Button variant="back" size="back" onClick={() => navigate("/approver-action")}> 
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
                onClick={() => navigate(`/approver-view-clearance?timelineId=${timeline.id}`)}
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
