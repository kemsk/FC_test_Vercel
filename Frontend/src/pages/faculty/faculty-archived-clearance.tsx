import * as React from "react";

import "../../index.css"; 
import { FacultyHeader } from "../../stories/components/header";
import { useNavigate } from "react-router-dom";
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

export default function FacultyArchiveClearance() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [timelines, setTimelines] = React.useState<ArchivedTimelineItem[]>([]);
  const [loading, setLoading] = React.useState(false);

  const loadTimelines = React.useCallback(() => {
    setLoading(true);
    return fetch("/admin/xu-faculty-clearance/api/faculty/archived-clearance")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { items: ArchivedTimelineItem[] }) => {
        setTimelines(data.items ?? []);
      })
      .catch(() => {
        setTimelines([]);
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    loadTimelines();
  }, [loadTimelines]);

  const filteredTimelines = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return timelines;
    }

    return timelines.filter((timeline) =>
      [
        timeline.name,
        timeline.academicYear,
        timeline.semester,
        timeline.clearancePeriodStart,
        timeline.clearancePeriodEnd,
        timeline.lastUpdated,
        timeline.archivedDate,
      ].some((value) => value.toLowerCase().includes(needle))
    );
  }, [query, timelines]);

  return (
    <div className="min-h-screen bg-primary-foreground text-primary-foreground">
      
      {/* HEADER */}
      <div className="header mb-3">
        <FacultyHeader />
      </div>

      {/* DASHBOARD CONTENT */}
      <main className="dashboard p-4 mt-2 space-y-3">

        <h1 className="text-2xl text-left text-primary font-bold">View Archived Clearance</h1>


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
          <div className="space-y-3">
            {filteredTimelines.map((timeline) => (
              <div
                key={timeline.id}
                className="cursor-pointer rounded-2xl border border-[#D5DBEB] bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
                onClick={() => navigate(`/faculty-view-clearance?timelineId=${timeline.id}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-foreground">{timeline.name}</h3>
                    <div className="mt-5 grid grid-cols-[max-content_1fr] gap-x-8 gap-y-2 text-sm text-foreground">
                      <div className="font-semibold">Academic Year</div>
                      <div>{timeline.academicYear}</div>
                      <div className="font-semibold">Semester</div>
                      <div>{timeline.semester}</div>
                      <div className="font-semibold">Clearance Period</div>
                      <div>{timeline.clearancePeriodStart} - {timeline.clearancePeriodEnd}</div>
                      <div className="font-semibold">Last Update</div>
                      <div>{timeline.lastUpdated}</div>
                      <div className="font-semibold">Archived</div>
                      <div>{timeline.archivedDate}</div>
                    </div>
                  </div>
                  <div className="pt-1 text-xl font-semibold text-foreground">
                    ›
                  </div>
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
