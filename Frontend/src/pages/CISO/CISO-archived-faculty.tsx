import * as React from "react";

import "../../index.css"; 
import { CISOHeader} from "../../stories/components/header";

import {
  ViewArchivedFacultyCard,
} from "../../stories/components/cards";

import { Button } from "../../stories/components/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../stories/components/select";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../../stories/components/breadcrumb";
import { Link, useNavigate } from "react-router-dom";
import { SearchInputGroup } from "../../stories/components/input-group";
import { useState } from "react";

interface ArchivedFacultyData {
  id: string;
  academicYear: string;
  semester: string;
  clearancePeriod: string;
  archivedDate: string;
  csvFileName: string;
  csvFileSize: string;
  totalFaculty: string;
  completedClearances: string;
  status: string;
  facultyId: string;
  facultyName: string;
  employeeId: string;
  csvDumpPath: string;
}

export default function CISOArchivedFaculty() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [archivedData, setArchivedData] = React.useState<ArchivedFacultyData[]>([]);
  const [loading, setLoading] = React.useState(false);

  const fetchArchivedFaculty = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/xu-faculty-clearance/api/ciso/archived-faculty");
      if (!res.ok) {
        throw new Error("Failed to fetch archived faculty data");
      }
      const data = await res.json();
      setArchivedData(data.items || []);
    } catch (error) {
      console.error("Error fetching archived faculty:", error);
      setArchivedData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchArchivedFaculty();
  }, [fetchArchivedFaculty]);

  const handleDownloadCSV = async (archivedId: string, fileName: string) => {
    try {
      const res = await fetch(`/admin/xu-faculty-clearance/api/ciso/archived-faculty/${archivedId}/download`);
      if (!res.ok) {
        throw new Error("Failed to download CSV");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading CSV:", error);
      alert("Failed to download CSV file");
    }
  };

  const handleViewDetails = (archivedId: string) => {
    // Navigate to detailed view or open modal
    navigate(`/CISO-archived-faculty/${archivedId}`);
  };

  // Filter data based on search query and selected year
  const filteredData = archivedData.filter(item => {
    const matchesSearch = !query || 
      item.facultyName.toLowerCase().includes(query.toLowerCase()) ||
      item.employeeId.toLowerCase().includes(query.toLowerCase()) ||
      item.academicYear.toLowerCase().includes(query.toLowerCase()) ||
      item.semester.toLowerCase().includes(query.toLowerCase());
    
    const matchesYear = selectedYear === "all" || item.academicYear === selectedYear;
    
    return matchesSearch && matchesYear;
  });

  // Get unique years for filter
  const uniqueYears = Array.from(new Set(archivedData.map(item => item.academicYear))).sort();

  return (
    <div className="min-h-screen bg-primary-foreground text-primary-foreground">
      
      {/* HEADER */}
      <div className="header mb-3">
        <CISOHeader />
      </div>

      {/* DASHBOARD CONTENT */}
      <main className="dashboard p-4 mt-2 space-y-3">

        <h1 className="text-2xl text-left text-primary font-bold">View Archived Faculty</h1>

        <Breadcrumb className="mt-2">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/CISO-tools">Tools</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>View Archived Faculty</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mb-3 mt-2 flex items-center justify-end">
          <Button variant="back" size="back" onClick={() => navigate("/CISO-archived-clearance")}> 
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
              placeholder="Search by name, ID, academic year, or semester..."
            />
          </div>
        </div>

        <div className="mt-3 space-y-4">
          <div className="w-full flex flex-col sm:flex-row gap-3 justify-start mt-5" style={{ marginLeft: '0', paddingLeft: '0' }}>
            <div className="flex gap-3">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger variant="pill" className="w-max gap-2">
                  <SelectValue placeholder="Academic Year" /> 
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {uniqueYears.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="mt-3 space-y-4">
            {loading ? (
              <div className="text-center py-8">Loading archived faculty data...</div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-8">No archived faculty data found</div>
            ) : (
              filteredData.map((item) => (
                <ViewArchivedFacultyCard
                  key={item.id}
                  academicYear={item.academicYear}
                  semester={item.semester}
                  clearancePeriod={item.clearancePeriod}
                  archivedDate={item.archivedDate}
                  csvFileName={item.csvFileName}
                  csvFileSize={item.csvFileSize}
                  onDownloadCSV={() => handleDownloadCSV(item.id, item.csvFileName)}
                  onIconClick={() => handleViewDetails(item.id)}
                />
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
