import "../../index.css"; 
import { CISOHeader } from "../../stories/components/header";


import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../../stories/components/breadcrumb";
import { Link, useNavigate } from "react-router-dom";
import { SearchInputGroup } from "../../stories/components/input-group";
import * as React from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../stories/components/select";

import { Button } from "../../stories/components/button";
import {
  SystemUsersCard,
  type SystemUser,
} from "../../stories/components/cards";
import {
  ManageSystemAdminDialog,
  ManageSystemApproverDialog,
  RemoveSystemUserDialog,
  type ManageSystemAdminPayload,
  type ManageSystemApproverPayload,
} from "../../stories/components/manage-system-user-dialogs";

 export default function CISOManageSystemUser() {
  const navigate = useNavigate();
  const [page, setPage] = React.useState(1);
  const pageSize = 2;

  const [users, setUsers] = React.useState<SystemUser[]>([]);
  const [filteredUsers, setFilteredUsers] = React.useState<SystemUser[]>([]);
  const [orgColleges, setOrgColleges] = React.useState<string[]>([]);
  const [orgDepartments, setOrgDepartments] = React.useState<string[]>([]);
  const [orgOffices, setOrgOffices] = React.useState<string[]>([]);
  const [collegeDepartmentsMap, setCollegeDepartmentsMap] = React.useState<Record<string, string[]>>({});
  const [adminEmail, setAdminEmail] = React.useState<string>("");

  const apiBase = "/admin/xu-faculty-clearance/api/ciso/system-users";
  const orgStructureApi = "/admin/xu-faculty-clearance/api/ciso/org-structure";

  function isXuEmail(email: string) {
    const e = (email || "").trim().toLowerCase();
    return e.endsWith("@xu.edu.ph") || e.endsWith("@my.xu.edu.ph");
  }

  async function readErrorDetail(r: Response) {
    try {
      const data = (await r.json()) as { detail?: string };
      if (data?.detail) return data.detail;
    } catch {
      // ignore
    }

    try {
      const t = (await r.text()) || "";
      if (t.trim()) return t;
    } catch {
      // ignore
    }

    return `Request failed (HTTP ${r.status})`;
  }

  const fetchUsers = React.useCallback(async () => {
    try {
      const r = await fetch(apiBase, { method: "GET", credentials: "include" });
      if (!r.ok) throw new Error("Failed to load users");
      const data = (await r.json()) as { items?: SystemUser[] };
      setUsers(Array.isArray(data.items) ? data.items : []);
    } catch {
      setUsers([]);
    }
  }, [apiBase]);

  // Filter out Assistant Approvers from the displayed users
  React.useEffect(() => {
    const filtered = users.filter(user => {
      const userRole = user.userRole.toLowerCase();
      return userRole !== "assistant approver";
    });
    setFilteredUsers(filtered);
  }, [users]);

  const fetchOrgStructure = React.useCallback(async () => {
    try {
      const r = await fetch(orgStructureApi, { method: "GET", credentials: "include" });
      if (!r.ok) throw new Error("Failed to load org structure");

      const data = (await r.json()) as {
        colleges?: Array<{ id?: string; name?: string; short?: string }>;
        departments?: Array<{ id?: string; collegeId?: string; name?: string; short?: string }>;
        offices?: Array<{ id?: string; name?: string; short?: string }>;
      };

      const colleges = (data.colleges || [])
        .map((c) => (c?.name || "").trim())
        .filter(Boolean);
      const departments = (data.departments || [])
        .map((d) => (d?.name || "").trim())
        .filter(Boolean);
      const offices = (data.offices || [])
        .map((o) => (o?.name || "").trim())
        .filter(Boolean);

      // Build college-departments map: college name -> array of department names
      const collegeMap: Record<string, string[]> = {};
      
      // Initialize all colleges with empty arrays
      (data.colleges || []).forEach((c) => {
        const collegeName = (c?.name || "").trim();
        if (collegeName) {
          collegeMap[collegeName] = [];
        }
      });
      
      // Map departments to their colleges using collegeId
      (data.departments || []).forEach((d) => {
        const departmentName = (d?.name || "").trim();
        const collegeId = d?.collegeId;
        
        if (departmentName && collegeId) {
          // Find college by ID
          const college = (data.colleges || []).find(c => c?.id === collegeId);
          const collegeName = college?.name?.trim();
          
          if (collegeName && collegeMap[collegeName]) {
            collegeMap[collegeName].push(departmentName);
          }
        }
      });

      setOrgColleges(colleges);
      setOrgDepartments(departments);
      setOrgOffices(offices);
      setCollegeDepartmentsMap(collegeMap);
    } catch {
      setOrgColleges([]);
      setOrgDepartments([]);
      setOrgOffices([]);
      setCollegeDepartmentsMap({});
    }
  }, [orgStructureApi]);

  const fetchAdminEmail = React.useCallback(async () => {
    try {
      const r = await fetch("/admin/xu-faculty-clearance/api/ciso-profile", { method: "GET", credentials: "include" });
      if (!r.ok) throw new Error("Failed to load admin profile");
      const data = (await r.json()) as { email?: string };
      if (data.email) {
        setAdminEmail(data.email);
      }
    } catch {
      setAdminEmail("");
    }
  }, []);

  React.useEffect(() => {
    fetchUsers();
    fetchOrgStructure();
    fetchAdminEmail();
  }, [fetchUsers, fetchOrgStructure, fetchAdminEmail]);

  React.useEffect(() => {
    fetch("/admin/xu-faculty-clearance/api/ciso/system-users")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { items: SystemUser[] }) => {
        setUsers(Array.isArray(data.items) ? data.items : []);
      })
      .catch(() => {
        setUsers([]);
      });
  }, []);

  const [addApproverOpen, setAddApproverOpen] = React.useState(false);
  const [addAdminOpen, setAddAdminOpen] = React.useState(false);
  const [editApproverOpen, setEditApproverOpen] = React.useState(false);
  const [editAdminOpen, setEditAdminOpen] = React.useState(false);
  const [removeOpen, setRemoveOpen] = React.useState(false);
  const [activeUserId, setActiveUserId] = React.useState<string | null>(null);

  const activeUser = React.useMemo(
    () => users.find((u) => u.id === activeUserId) ?? null,
    [activeUserId, users]
  );

  function isSystemLevelRole(user: SystemUser) {
    const role = user.userRole.toLowerCase();
    return role.includes("admin") || role === "ciso" || role === "ovphe";
  }

  function splitName(name: string) {
    const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { firstName: "", middleName: "", lastName: "" };
    if (parts.length === 1) return { firstName: parts[0], middleName: "", lastName: "" };
    if (parts.length === 2) return { firstName: parts[0], middleName: "", lastName: parts[1] };
    return {
      firstName: parts[0],
      middleName: parts.slice(1, -1).join(" "),
      lastName: parts[parts.length - 1],
    };
  }

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(pageCount, Math.max(1, page));
  const pagedUsers = filteredUsers.slice((safePage - 1) * pageSize, safePage * pageSize);

  const onPrevPage = () => setPage((p) => Math.max(1, p - 1));
  const onNextPage = () => setPage((p) => Math.min(pageCount, p + 1));

  return (
    <div className="min-h-screen bg-primary-foreground text-primary-foreground">
      
      {/* HEADER */}
      <div className="header mb-3">
        <CISOHeader />
      </div>

      {/* DASHBOARD CONTENT */}
      <main className="dashboard p-4">
        
        <h1 className="text-2xl text-left text-primary font-bold">Manage System Users</h1>

        <Breadcrumb className="mt-2">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/CISO-tools">Tools</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Manage System Users</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mb-3 mt-2 flex items-center justify-end">
          <Button variant="back" size="back" onClick={() => navigate("/CISO-tools")}> 
            <div className="flex items-center gap-2">
              <img src="BlackArrowIcon.png" alt="back" className="h-4 w-4" />Back
            </div>
          </Button>
        </div>
       
       <div className="mt-4 space-y-3">
            <div className="w-full max-w-[520px]">
            <SearchInputGroup
              containerClassName="h-10"
              placeholder="Search by name, ID, or email..."
            />
          </div>
        
        <div className="flex flex-wrap items-start gap-3 mt-4">

            <Select onValueChange={(v) => console.log(v)}>
                <SelectTrigger variant="pill" className="w-max">
                    <SelectValue placeholder="User Role" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="SystemAdmin">System Admin</SelectItem>
                    <SelectItem value="Approver">Approver</SelectItem>
                </SelectContent>
            </Select>


            <Select onValueChange={(v) => console.log(v)}>
                <SelectTrigger variant="pill" className="w-max">
                    <SelectValue placeholder="Approver Type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="SystemAdmin">System Admin</SelectItem>
                    <SelectItem value="Approver">Approver</SelectItem>
                </SelectContent>
            </Select>

            <Select defaultValue="name">
              <SelectTrigger variant="pill" className="w-max gap-2">
                <span>Sort by:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="college">College</SelectItem>
                <SelectItem value="department">Department</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="SystemID">System ID</SelectItem>
                <SelectItem value="UniversityID">University ID</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-3">
            <SystemUsersCard
              users={pagedUsers}
              onAddApprover={() => setAddApproverOpen(true)}
              onAddAdmin={() => setAddAdminOpen(true)}
              currentUserEmail={adminEmail}
              onEditUser={(user) => {
                if (user.email.trim().toLowerCase() === adminEmail.trim().toLowerCase()) {
                  window.alert("You cannot edit your own account from Manage System Users.");
                  return;
                }
                setActiveUserId(user.id);
                if (isSystemLevelRole(user)) {
                  setEditAdminOpen(true);
                } else {
                  setEditApproverOpen(true);
                }
              }}
              onRemoveUser={(user) => {
                if (user.email.trim().toLowerCase() === adminEmail.trim().toLowerCase()) {
                  window.alert("You cannot remove your own account from Manage System Users.");
                  return;
                }
                setActiveUserId(user.id);
                setRemoveOpen(true);
              }}
            />
          </div>
       </div>

        <ManageSystemApproverDialog
          open={addApproverOpen}
          onOpenChange={setAddApproverOpen}
          title="Add System Approver"
          submitLabel="Create"
          colleges={orgColleges}
          departments={orgDepartments}
          offices={orgOffices.filter(office => office !== "Office of the Vice President for Higher Education")}
          collegeDepartmentsMap={collegeDepartmentsMap}
          onSubmit={(payload: ManageSystemApproverPayload) => {
            (async () => {
              if (!isXuEmail(payload.email)) {
                window.alert("Email must be an XU email (@xu.edu.ph or @my.xu.edu.ph)");
                return;
              }
              const r = await fetch(apiBase, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  firstName: payload.firstName,
                  middleName: payload.middleName,
                  lastName: payload.lastName,
                  universityId: payload.universityId,
                  email: payload.email,
                  isActive: payload.isActive,
                  approverType: payload.approverType,
                  college: payload.college,
                  department: payload.department,
                  office: payload.office,
                }),
              });

              if (!r.ok) {
                window.alert(await readErrorDetail(r));
                return;
              }

              setAddApproverOpen(false);
              setPage(1);
              await fetchUsers();
              window.alert("Approver created successfully!");
            })();
          }}
        />

        <ManageSystemApproverDialog
          open={editApproverOpen}
          onOpenChange={(o) => {
            setEditApproverOpen(o);
            if (!o) setActiveUserId(null);
          }}
          title="Edit Approver"
          submitLabel="Create"
          colleges={orgColleges}
          departments={orgDepartments}
          offices={orgOffices.filter(office => office !== "Office of the Vice President for Higher Education")}
          collegeDepartmentsMap={collegeDepartmentsMap}
          initialValues={
            activeUser
              ? {
                  ...splitName(activeUser.name),
                  universityId: activeUser.universityId,
                  email: activeUser.email,
                  approverType: activeUser.college === "N/A" ? "Office" : "College",
                  college: activeUser.college === "N/A" ? "" : activeUser.college,
                  department: activeUser.college === "N/A" ? "" : activeUser.department,
                  office: activeUser.college === "N/A" ? activeUser.department : "",
                  isActive: Boolean(activeUser.isActive),
                }
              : undefined
          }
          onSubmit={(payload: ManageSystemApproverPayload) => {
            if (!activeUser) return;
            (async () => {
              if (!isXuEmail(payload.email)) {
                window.alert("Email must be an XU email (@xu.edu.ph or @my.xu.edu.ph)");
                return;
              }
              const r = await fetch(`${apiBase}/${activeUser.id}`, {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  firstName: payload.firstName,
                  middleName: payload.middleName,
                  lastName: payload.lastName,
                  universityId: payload.universityId,
                  email: payload.email,
                  isActive: payload.isActive,
                  approverType: payload.approverType,
                  college: payload.college,
                  department: payload.department,
                  office: payload.office,
                }),
              });

              if (!r.ok) {
                window.alert(await readErrorDetail(r));
                return;
              }

              setEditApproverOpen(false);
              setActiveUserId(null);
              await fetchUsers();
              window.alert("Approver updated successfully!");
            })();
          }}
        />

        <ManageSystemAdminDialog
          open={addAdminOpen}
          onOpenChange={setAddAdminOpen}
          title="Add System Admin"
          submitLabel="Create"
          onSubmit={(payload: ManageSystemAdminPayload) => {
            (async () => {
              if (!isXuEmail(payload.email)) {
                window.alert("Email must be an XU email (@xu.edu.ph or @my.xu.edu.ph)");
                return;
              }
              const r = await fetch(apiBase, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  firstName: payload.firstName,
                  middleName: payload.middleName,
                  lastName: payload.lastName,
                  universityId: payload.universityId,
                  email: payload.email,
                  isActive: payload.isActive,
                  systemAdminOffice: payload.systemAdminOffice,
                }),
              });

              if (!r.ok) {
                window.alert(await readErrorDetail(r));
                return;
              }

              setAddAdminOpen(false);
              setPage(1);
              await fetchUsers();
              window.alert("System Admin created successfully!");
            })();
          }}
        />

        <ManageSystemAdminDialog
          open={editAdminOpen}
          onOpenChange={(o) => {
            setEditAdminOpen(o);
            if (!o) setActiveUserId(null);
          }}
          title="Edit System Admin"
          submitLabel="Create"
          initialValues={
            activeUser
              ? {
                  ...splitName(activeUser.name),
                  universityId: activeUser.universityId,
                  email: activeUser.email,
                  systemAdminOffice: activeUser.college === "CISO" ? "CISO" : "OVPHE",
                  isActive: Boolean(activeUser.isActive),
                }
              : undefined
          }
          onSubmit={(payload: ManageSystemAdminPayload) => {
            if (!activeUser) return;
            (async () => {
              if (!isXuEmail(payload.email)) {
                window.alert("Email must be an XU email (@xu.edu.ph or @my.xu.edu.ph)");
                return;
              }
              const r = await fetch(`${apiBase}/${activeUser.id}`, {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  firstName: payload.firstName,
                  middleName: payload.middleName,
                  lastName: payload.lastName,
                  universityId: payload.universityId,
                  email: payload.email,
                  isActive: payload.isActive,
                  systemAdminOffice: payload.systemAdminOffice,
                }),
              });

              if (!r.ok) {
                window.alert(await readErrorDetail(r));
                return;
              }

              setEditAdminOpen(false);
              setActiveUserId(null);
              await fetchUsers();
              window.alert("System Admin updated successfully!");
            })();
          }}
        />

        <RemoveSystemUserDialog
          open={removeOpen}
          onOpenChange={(o) => {
            setRemoveOpen(o);
            if (!o) setActiveUserId(null);
          }}
          userName={activeUser?.name ?? ""}
          userEmail={activeUser?.email ?? ""}
          adminEmail={adminEmail}
          onRemove={() => {
            if (!activeUser) return;
            (async () => {
              const r = await fetch(`${apiBase}/${activeUser.id}`, {
                method: "DELETE",
                credentials: "include",
              });

              if (!r.ok) {
                window.alert(await readErrorDetail(r));
                return;
              }

              setRemoveOpen(false);
              setActiveUserId(null);
              await fetchUsers();
              window.alert("User removed successfully!");
            })();
          }}
        />

         <div className="flex items-center justify-center gap-3  px-4 py-3">
          <div className="text-sm text-muted-foreground">Page</div>

          <Button type="button" variant="icon" size="icon" className="h-9 w-9" onClick={onNextPage}>
            <img src="/BlackArrowIcon.png" alt="Next" className="h-5 w-5" />
          </Button>

          <div className="flex h-9 min-w-[44px] items-center justify-center rounded-md border border-muted-foreground/30 bg-background px-3 text-sm font-semibold text-foreground">
            {safePage}
          </div>

          <Button type="button" variant="icon" size="icon" className="h-9 w-9" onClick={onPrevPage}>
            <img src="/BlackArrowIcon.png" alt="Prev" className="h-5 w-5 rotate-180" />
          </Button>

          <div className="text-sm text-muted-foreground">of {pageCount}</div>

        </div>

      </main>

    </div>
  );
}
