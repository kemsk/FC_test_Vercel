import * as React from "react";

import "../../index.css";
import { Link, useNavigate } from "react-router-dom";

import { OVPHEHeader } from "../../stories/components/header";
import {
  AnalyticsDonutCard,
  DepartmentCompletionRateCard,
  type DepartmentCompletionRateSection,
} from "../../stories/components/cards";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../../stories/components/breadcrumb";
import { Button } from "../../stories/components/button";
import { Card, CardContent } from "../../stories/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../stories/components/select";

function postOVPHEActivityLog(payload: { event_type: string; details?: string[] }) {
  fetch("/admin/xu-faculty-clearance/api/ovphe/activity-logs", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

export default function SystemAnalytics() {
  const navigate = useNavigate();

  const [selectedTerm, setSelectedTerm] = React.useState("Term");
  const [selectedClearance, setSelectedClearance] = React.useState("All Clearances");
  const [selectedCollege, setSelectedCollege] = React.useState("College");
  const [timelineReady, setTimelineReady] = React.useState(false);

  const [timelineOptions, setTimelineOptions] = React.useState<
    { value: string; label: string }[]
  >([]);
  const [timelineTermsByYear, setTimelineTermsByYear] = React.useState<Record<string, string[]>>({});
  const [colleges, setColleges] = React.useState<{ id: string; name: string }[]>([]);
  const [donutTitle, setDonutTitle] = React.useState("Overall Count");
  const [donutCompleted, setDonutCompleted] = React.useState(0);
  const [donutTotal, setDonutTotal] = React.useState(100);
  const [completionSections, setCompletionSections] = React.useState<DepartmentCompletionRateSection[]>([]);

  const buildAnalyticsParams = React.useCallback(() => {
    const params = new URLSearchParams();

    if (selectedClearance && selectedClearance !== "All Clearances") {
      const m = selectedClearance.match(/(\d{4})/);
      if (m) params.set("academic_year", m[1]);
    }

    if (selectedTerm && selectedTerm !== "Term") {
      const map: Record<string, string> = {
        "First Semester": "FIRST",
        "Second Semester": "SECOND",
        Intersession: "INTERSESSION",
      };
      if (map[selectedTerm]) params.set("term", map[selectedTerm]);
    }

    if (selectedCollege && selectedCollege !== "College") {
      const found = colleges.find((c) => c.name === selectedCollege);
      if (found?.id) params.set("college_id", found.id);
    }

    return params;
  }, [selectedClearance, selectedTerm, selectedCollege, colleges]);

  React.useEffect(() => {
    fetch("/admin/xu-faculty-clearance/api/ovphe/analytics-timelines")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(
        (data: {
          items?: {
            academicYearStart?: string;
            academicYearEnd?: string;
            term?: string;
            setAsActive?: boolean;
            isArchived?: boolean;
          }[];
        }) => {
          const items = data.items ?? [];
          const optionMap = new Map<string, { value: string; label: string; active: boolean; archived: boolean }>();
          const termsByYear = new Map<string, Set<string>>();

          items.forEach((item) => {
            const startYear = (item.academicYearStart ?? "").trim();
            const endYear = (item.academicYearEnd ?? "").trim();
            const term = (item.term ?? "").trim();
            if (!startYear || !endYear) {
              return;
            }

            const value = `S.Y. ${startYear}-${endYear}`;
            const existing = optionMap.get(value);
            const next = {
              value,
              label: value,
              active: Boolean(item.setAsActive) || Boolean(existing?.active),
              archived: Boolean(item.isArchived) || Boolean(existing?.archived),
            };
            optionMap.set(value, next);

            if (term) {
              if (!termsByYear.has(value)) {
                termsByYear.set(value, new Set<string>());
              }
              termsByYear.get(value)?.add(term);
            }
          });

          const options = Array.from(optionMap.values()).sort(
            (a, b) => Number(b.active) - Number(a.active) || b.value.localeCompare(a.value),
          );

          setTimelineOptions(options.map(({ value, label }) => ({ value, label })));
          setTimelineTermsByYear(
            Array.from(termsByYear.entries()).reduce<Record<string, string[]>>((acc, [year, terms]) => {
              acc[year] = Array.from(terms.values()).sort((a, b) => a.localeCompare(b));
              return acc;
            }, {}),
          );
        },
      )
      .catch(() => {
        setTimelineOptions([]);
        setTimelineTermsByYear({});
      });
  }, []);

  React.useEffect(() => {
    if (!selectedClearance || selectedClearance === "All Clearances") {
      return;
    }

    const availableTerms = timelineTermsByYear[selectedClearance] ?? [];
    if (!availableTerms.length) {
      return;
    }

    if (selectedTerm === "Term" || !availableTerms.includes(selectedTerm)) {
      setSelectedTerm(availableTerms[0]);
    }
  }, [selectedClearance, selectedTerm, timelineTermsByYear]);

  React.useEffect(() => {
    fetch("/admin/xu-faculty-clearance/api/active-clearance-timeline")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { academicYear?: string; semester?: string }) => {
        const academicYear = (data.academicYear ?? "").trim();
        const semester = (data.semester ?? "").trim();

        if (academicYear) {
          const normalizedAcademicYear = academicYear.replace(/[–—]/g, "-");
          setSelectedClearance(`S.Y. ${normalizedAcademicYear}`);
        }
        if (semester) {
          setSelectedTerm(semester);
        }
      })
      .catch(() => {})
      .finally(() => setTimelineReady(true));
  }, []);

  React.useEffect(() => {
    fetch("/admin/xu-faculty-clearance/api/ovphe/org-structure")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { colleges: { id: string; name: string }[] }) => {
        setColleges(data.colleges ?? []);
      })
      .catch(() => setColleges([]));
  }, []);

  React.useEffect(() => {
    if (!timelineReady) {
      return;
    }

    const params = buildAnalyticsParams();

    fetch(`/admin/xu-faculty-clearance/api/ovphe/system-analytics?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(
        (data: {
          summary?: {
            label?: string;
            completedCount?: number;
            totalCount?: number;
          };
          sections?: DepartmentCompletionRateSection[];
          rows: {
            collegeName: string;
            completionRate: number;
            completedCount?: number;
            totalCount?: number;
          }[];
        }) => {
        const summary = data.summary;
        const rows = data.rows ?? [];
        const fallback = rows[0];

        setDonutTitle(summary?.label || fallback?.collegeName || "Overall Count");
        setDonutCompleted(
          Math.max(
            0,
            typeof summary?.completedCount === "number"
              ? summary.completedCount
              : typeof fallback?.completedCount === "number"
                ? fallback.completedCount
                : 0,
          ),
        );
        setDonutTotal(
          Math.max(
            0,
            typeof summary?.totalCount === "number"
              ? summary.totalCount
              : typeof fallback?.totalCount === "number"
                ? fallback.totalCount
                : 0,
          ),
        );

        setCompletionSections(data.sections ?? []);
      })
      .catch(() => {
        setDonutTitle("Overall Count");
        setDonutCompleted(0);
        setDonutTotal(0);
        setCompletionSections([]);
      });
  }, [buildAnalyticsParams, timelineReady]);

  return (
    <div className="min-h-screen bg-primary-foreground text-primary-foreground">
      
      {/* HEADER */}
      <div className="header mb-3">
        <OVPHEHeader />
      </div>

      {/* DASHBOARD CONTENT */}
      <main className="dashboard p-4">
        
        <h1 className="text-2xl text-left text-primary font-bold">System Analytics</h1>

        <Breadcrumb className="mt-2">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/OVPHE-tools">Tools</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>System Analytics</BreadcrumbPage>
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

        <div className="mt-2 space-y-3">
          <div className="flex flex-wrap items-left gap-3 overflow-x-auto mt-4">

            <Select value={selectedClearance} onValueChange={setSelectedClearance}>
              <SelectTrigger className="w-max" variant="pill">
                <SelectValue placeholder="School Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Clearances">School Year</SelectItem>
                {timelineOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
              <SelectTrigger  variant="pill" className="w-max">
                <SelectValue placeholder="Term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Term">Term</SelectItem>
                <SelectItem value="First Semester">First Semester</SelectItem>
                <SelectItem value="Second Semester">Second Semester</SelectItem>
                <SelectItem value="Intersession">Intersession</SelectItem>
              </SelectContent>
            </Select>

          
            <Select value={selectedCollege} onValueChange={setSelectedCollege}>
              <SelectTrigger className="w-max" variant="pill">
                <SelectValue placeholder="College" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="College">College</SelectItem>
                {colleges.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start gap-5 mb-2 mt-2">
                <div className="text-primary">
                  <img src="/PrimaryExportIcon.png" alt="Export" className="h-9 w-10 object-contain ml-2 mt-2 " />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-primary">Export Analytics</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Export faculty clearance analytics for chosen College in .csv
                  </div>
                </div>

                <Button 
                  type="button" 
                  variant="icon" 
                  size="icon"
                  onClick={() => {
                    postOVPHEActivityLog({
                      event_type: "exported_clearance_results",
                      details: [
                        selectedCollege !== "College" ? `College: ${selectedCollege}` : "",
                        selectedClearance !== "All Clearances" ? `School Year: ${selectedClearance}` : "",
                        selectedTerm !== "Term" ? `Term: ${selectedTerm}` : "",
                      ].filter(Boolean),
                    });
                    const params = buildAnalyticsParams();
                    const url = `/admin/xu-faculty-clearance/api/ovphe/export-clearance-results?${params.toString()}`;
                    fetch(url, { credentials: "include" })
                      .then((response) => {
                        if (!response.ok) {
                          return Promise.reject();
                        }
                        const disposition = response.headers.get("content-disposition") || "";
                        const match = disposition.match(/filename="?([^";]+)"?/i);
                        const fallbackYear =
                          selectedClearance && selectedClearance !== "All Clearances"
                            ? selectedClearance.replace(/[^\d-]+/g, "_").replace(/^_+|_+$/g, "")
                            : "active";
                        const filename = match?.[1] || `clearance_results_${fallbackYear}.csv`;
                        return response.blob().then((blob) => ({ blob, filename }));
                      })
                      .then(({ blob, filename }) => {
                        const blobUrl = window.URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = blobUrl;
                        link.download = filename;
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                        window.URL.revokeObjectURL(blobUrl);
                      })
                      .catch(() => {});
                  }}
                >
                  <img src="/PrimaryChevronIcon.png" alt="Export analytics" className="h-5 w-5 object-contain" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr]">
            <AnalyticsDonutCard title={donutTitle} completed={donutCompleted} total={donutTotal} />

            <DepartmentCompletionRateCard sections={completionSections} />
          </div>
        </div>

      </main>

    </div>
  );
}
