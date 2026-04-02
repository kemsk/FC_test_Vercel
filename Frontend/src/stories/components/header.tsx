import * as React from "react"
import { Link, useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "./sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";

import { Divider } from "./divider";

import { authService } from "../../services/authService";

type HeaderVariantProps = {
  sheetTitle?: string;
  sheetDescription?: string;
  children?: React.ReactNode;
};

function HeaderVariant({ sheetTitle, sheetDescription, children }: HeaderVariantProps) {
  return (
    <header className="w-full border-b bg-background">
      <div className="flex w-full items-center justify-between px-4 py-4 md:py-6">
        
        {/* Left section */}
        <div className="flex items-center gap-2">
          {/* Mobile logo + label (use flexible container so text doesn't get clipped) */}

            <img
              src="/Pen Swish Dark Blue_FacultyClearTrack.png"
              alt="Faculty ClearTrack"
              className="h-9 w-auto object-contain"
            />

            <span className="text-primary font-bold leading-[1.1] text-[clamp(1rem,3.5vw,1.4rem)]">
              XU Faculty <br /> ClearTrack
            </span>

        </div>


        {/* Right section */}
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger >
              <img
              src="/PrimaryMenuIcon.png"
              alt="Menu Icon"
              className="h-7 w-7 object-contain"
            />
            </SheetTrigger>
          <SheetContent>
            {sheetTitle || sheetDescription ? (
              <SheetHeader>
                {sheetTitle ? <SheetTitle>{sheetTitle}</SheetTitle> : null}
                {sheetDescription ? (
                  <SheetDescription>{sheetDescription}</SheetDescription>
                ) : null}
              </SheetHeader>
            ) : null}
            {children}
          </SheetContent>
        </Sheet>
        

        </div>
      </div>
    </header>
  )
}

export function Header() {
  return (
    <HeaderVariant
      sheetTitle="Are you absolutely sure?"
      sheetDescription={
        "This action cannot be undone. This will permanently delete your account and remove your data from our servers."
      }
    />
  );
}

export function FacultyHeader() {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    let mounted = true;
    fetch("/admin/xu-faculty-clearance/api/notifications/unread-count", {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    })
      .then(async (resp) => {
        if (!resp.ok) {
          return null;
        }
        return resp.json();
      })
      .then((data) => {
        if (!mounted || !data) return;
        const count = Number(data.unreadCount);
        setUnreadCount(Number.isFinite(count) ? count : 0);
      })
      .catch(() => {
        if (!mounted) return;
        setUnreadCount(0);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    console.log("LOGOUT: FacultyHeader handleLogout called!");
    try {
      console.log("LOGOUT: Calling authService.logout...");
      await authService.logout();
      console.log("LOGOUT: authService.logout completed, navigating to /");
      navigate("/");
    } catch (error) {
      console.error("LOGOUT: Logout failed:", error);
      // Still navigate to login even if logout API fails
      console.log("LOGOUT: Navigating to / despite error");
      navigate("/");
    }
  };

  return (
    <HeaderVariant>
      <div className="mt-4 flex h-full flex-col">
        <div className="flex flex-col gap-4">

          <div className="flex items-center gap-4">
            <img
              src="/Pen Swish Dark Blue_FacultyClearTrack.png"
              alt="Faculty ClearTrack"
              className="h-10 w-auto object-contain"
            />

            <span className="text-primary font-bold leading-[1.1] text-[clamp(1rem,3.5vw,1.4rem)]">
              XU Faculty <br /> ClearTrack
            </span>
          </div>

        <Divider className="-mx-6 mt-2 w-[calc(100%+3rem)] border-[hsl(var(--gray-border))]" />

          <nav className="flex flex-col gap-4 mt-2">
            <div>
              <SheetClose asChild>
                <Link
                  to="/faculty-dashboard"
                  className="flex items-center gap-3  font-semibold text-primary text-xl"
                >
                  <img
                    src="/PrimaryHomeIcon.png"
                    alt="Dashboard"
                    className="h-5 w-5 object-contain"
                  />
                  <span>Dashboard</span>
                </Link>
              </SheetClose>
            </div>

            <div className="mt-2">
            <SheetClose asChild>
              <Link
                to="/faculty-archive-clearance"
                className="flex items-center gap-3 text-xl font-semibold text-primary"
              >
                <img
                  src="/PrimaryArchiveIcon.png"
                  alt="View Archived Clearance"
                  className="h-5 w-5 object-contain"
                />
                <span>View Archived Clearance</span>
              </Link>
            </SheetClose>
            </div>

            <div className="mt-2">
            <SheetClose asChild>
              <Link
                to="/faculty-notification"
                className="flex items-center gap-3 text-xl font-semibold text-primary"
              >
                <img
                  src="/PrimaryNotificationsIcon.png"
                  alt="Notifications"
                  className="h-5 w-5 object-contain"
                />
                <span>Notifications</span>
                {unreadCount > 0 ? (
                  <div className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                    {unreadCount}
                  </div>
                ) : null}
              </Link>
            </SheetClose>
            </div>
          </nav>
        </div>

        <Divider className="-mx-6 mt-6 w-[calc(100%+3rem)] border-[hsl(var(--gray-border))]" />

        <div className="pt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-3 text-left text-xl font-semibold text-primary"
              >
                <img
                  src="/PrimaryLogoutIcon.png"
                  alt="Logout"
                  className="h-5 w-5 object-contain"
                />
                <span>Logout</span>
              </button>
            </AlertDialogTrigger>

            <AlertDialogContent className="max-w-xs">
              <AlertDialogHeader className="items-center text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-red-500 text-red-500">
                  <span className="text-2xl font-bold">!</span>
                </div>
                <AlertDialogTitle className="mt-2 text-base font-semibold">
                  You are logging out
                </AlertDialogTitle>
                <div className="text-sm font-semibold text-muted-foreground">
                  XU Faculty ClearTrack
                </div>
              </AlertDialogHeader>

              <AlertDialogFooter className="mt-2 flex flex-col gap-2 sm:flex-col sm:space-x-0">
                <AlertDialogAction
                  className="w-full"
                  onClick={handleLogout}
                >                 
                  Logout
                </AlertDialogAction>
                <AlertDialogCancel className="w-full">Cancel</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </HeaderVariant>
  );
}

export function AdminHeader() {
  return (
    <HeaderVariant
      sheetTitle="System Admin Menu"
      sheetDescription="Administrator navigation"
    />
  );
}

export function ApprovalHeader() {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    let mounted = true;
    fetch("/admin/xu-faculty-clearance/api/notifications/unread-count", {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    })
      .then(async (resp) => {
        if (!resp.ok) {
          return null;
        }
        return resp.json();
      })
      .then((data) => {
        if (!mounted || !data) return;
        const count = Number(data.unreadCount);
        setUnreadCount(Number.isFinite(count) ? count : 0);
      })
      .catch(() => {
        if (!mounted) return;
        setUnreadCount(0);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      console.log("LOGOUT(UI): Clearing current session...");
      const response = await fetch(
        "/admin/xu-faculty-clearance/api/auth/logout",
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        console.error("LOGOUT(UI): Logout request failed", response.status);
      } else {
        console.log("LOGOUT(UI): Session cleared");
      }
    } catch (err) {
      console.error("LOGOUT(UI): Logout request error", err);
    } finally {
      navigate("/");
    }
  };

  return (
    <HeaderVariant>
      <div className="mt-4 flex h-full flex-col">
        <div className="flex flex-col gap-4">

          <div className="flex items-center gap-4">
            <img
              src="/Pen Swish Dark Blue_FacultyClearTrack.png"
              alt="Faculty ClearTrack"
              className="h-10 w-auto object-contain"
            />

            <span className="text-primary font-bold leading-[1.1] text-[clamp(1rem,3.5vw,1.4rem)]">
              XU Faculty <br /> ClearTrack
            </span>
          </div>

        <Divider className="-mx-6 mt-2 w-[calc(100%+3rem)] border-[hsl(var(--gray-border))]" />

          <nav className="flex flex-col gap-4 mt-2">
            <div>
              <SheetClose asChild>
                <Link
                  to="/approver-dashboard"
                  className="flex items-center gap-3  font-semibold text-primary text-xl"
                >
                  <img
                    src="/PrimaryHomeIcon.png"
                    alt="Dashboard"
                    className="h-5 w-5 object-contain"
                  />
                  <span>Dashboard</span>
                </Link>
              </SheetClose>

              <div className="mt-5 flex gap-3">
                <div className="flex w-5 justify-center">
                  <div className="w-px bg-[hsl(var(--gray-border))]" />
                </div>
                
                <div className="flex flex-col space-y-3">
                  <SheetClose asChild>
                    <Link
                      to="/approver-requirement-list"
                      className="text-xl font-regular text-primary"
                    >
                      Requirement List
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      to="/approver-dashboard"
                      className="text-xl font-regular text-primary"
                    >
                      Announcements
                    </Link>
                  </SheetClose>
                </div>
              </div>
            </div>

            <div className="mt-2">
            <SheetClose asChild>
              <Link
                to="/approver-clearance"
                className="flex items-center gap-3 text-xl font-semibold text-primary"
              >
                <img
                  src="/PrimaryPenIcon.png"
                  alt="Clearance"
                  className="h-5 w-5 object-contain"
                />
                <span>Clearance Requests</span>
              </Link>
            </SheetClose>
            </div>

           <div className="mt-2">
              <SheetClose asChild>
                <Link
                  to="/approver-action"
                  className="flex items-center gap-3 text-xl font-semibold text-primary"
                >
                  <img
                    src="/PrimaryClockIcon.png"
                    alt="Actions"
                    className="h-5 w-5 object-contain"
                  />
                  <span>Actions</span>
                </Link>
              </SheetClose>

              <div className="mt-5 flex gap-3">
                <div className="flex w-5 justify-center">
                  <div className="w-px bg-[hsl(var(--gray-border))]" />
                </div>
                <div className=" flex flex-col space-y-3">
                  <SheetClose asChild>
                    <Link
                      to="/approver-assistant-list"
                      className="text-xl font-regular text-primary"
                    >
                      View Approver Assistants
                    </Link>
                  </SheetClose>

                  <SheetClose asChild>
                    <Link
                      to="/approver-archived-clearance"
                      className="text-xl font-regular text-primary"
                    >
                      View Archived Clearance
                    </Link>
                  </SheetClose>

                  <SheetClose asChild>
                    <Link
                      to="/approver-activity-logs"
                      className="text-xl font-regular text-primary"
                    >
                      Check Activity Logs
                    </Link>
                  </SheetClose>
                </div>
              </div>
            </div>

            <div className="mt-2">
            <SheetClose asChild>
              <Link
                to="/approver-notification"
                className="flex items-center gap-3 text-xl font-semibold text-primary"
              >
                <img
                  src="/PrimaryNotificationsIcon.png"
                  alt="Notifications"
                  className="h-5 w-5 object-contain"
                />
                <span>Notifications</span>
                {unreadCount > 0 ? (
                  <div className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                    {unreadCount}
                  </div>
                ) : null}
              </Link>
            </SheetClose>
            </div>
          </nav>
        </div>

        <Divider className="-mx-6 mt-6 w-[calc(100%+3rem)] border-[hsl(var(--gray-border))]" />

        <div className="pt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-3 text-left text-xl font-semibold text-primary"
              >
                <img
                  src="/PrimaryLogoutIcon.png"
                  alt="Logout"
                  className="h-5 w-5 object-contain"
                />
                <span>Logout</span>
              </button>
            </AlertDialogTrigger>

            <AlertDialogContent className="max-w-xs">
              <AlertDialogHeader className="items-center text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-red-500 text-red-500">
                  <span className="text-2xl font-bold">!</span>
                </div>
                <AlertDialogTitle className="mt-2 text-base font-semibold">
                  You are logging out
                </AlertDialogTitle>
                <div className="text-sm font-semibold text-muted-foreground">
                  XU Faculty ClearTrack
                </div>
              </AlertDialogHeader>

              <AlertDialogFooter className="mt-2 flex flex-col gap-2 sm:flex-col sm:space-x-0">
                <AlertDialogAction
                  className="w-full"
                  onClick={async () => {
                    try {
                      const r = await fetch("/admin/xu-faculty-clearance/api/approver/activity-logs", {
                        method: "POST",
                        credentials: "include",
                        keepalive: true,
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          event_type: "user_logout",
                          user_role: "Approver",
                          details: ["Approver Logout"],
                        }),
                      });
                      if (!r.ok) {
                        const text = await r.text().catch(() => "");
                        console.error("[Approver] activity log POST failed:", r.status, text);
                      }
                    } catch {
                    }
                    await handleLogout();
                  }}
                >
                  Logout
                </AlertDialogAction>
                <AlertDialogCancel className="w-full">Cancel</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
          </HeaderVariant>
  );
}


export function HROHeader() {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    let mounted = true;
    fetch("/admin/xu-faculty-clearance/api/notifications/unread-count", {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    })
      .then(async (resp) => {
        if (!resp.ok) {
          return null;
        }
        return resp.json();
      })
      .then((data) => {
        if (!mounted || !data) return;
        const count = Number(data.unreadCount);
        setUnreadCount(Number.isFinite(count) ? count : 0);
      })
      .catch(() => {
        if (!mounted) return;
        setUnreadCount(0);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      console.log("LOGOUT(UI): Clearing current session...");
      const response = await fetch(
        "/admin/xu-faculty-clearance/api/auth/logout",
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        console.error("LOGOUT(UI): Logout request failed", response.status);
      } else {
        console.log("LOGOUT(UI): Session cleared");
      }
    } catch (err) {
      console.error("LOGOUT(UI): Logout request error", err);
    } finally {
      navigate("/");
    }
  };

  return (
    <HeaderVariant>
      <div className="mt-4 flex h-full flex-col">
        <div className="flex flex-col gap-4">

          <div className="flex items-center gap-4">
            <img
              src="/Pen Swish Dark Blue_FacultyClearTrack.png"
              alt="Faculty ClearTrack"
              className="h-10 w-auto object-contain"
            />

            <span className="text-primary font-bold leading-[1.1] text-[clamp(1rem,3.5vw,1.4rem)]">
              XU Faculty <br /> ClearTrack
            </span>
          </div>

        <Divider className="-mx-6 mt-2 w-[calc(100%+3rem)] border-[hsl(var(--gray-border))]" />

          <nav className="flex flex-col gap-4 mt-2">
            <div>
              <SheetClose asChild>
                <Link
                  to="/HRO-dashboard"
                  className="flex items-center gap-3  font-semibold text-primary text-xl"
                >
                  <img
                    src="/PrimaryHomeIcon.png"
                    alt="Dashboard"
                    className="h-5 w-5 object-contain"
                  />
                  <span>Dashboard</span>
                </Link>
              </SheetClose>

              <div className="mt-5 flex gap-3">
                <div className="flex w-5 justify-center">
                  <div className="w-px bg-[hsl(var(--gray-border))]" />
                </div>
                
                <div className="flex flex-col space-y-3">
                  <SheetClose asChild>
                    <Link
                      to="/HRO-dashboard"
                      className="text-xl font-regular text-primary"
                    >
                      Approver View
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      to="/HRO-dashboard"
                      className="text-xl font-regular text-primary"
                    >
                      Announcements
                    </Link>
                  </SheetClose>
                </div>
              </div>
            </div>

            <div className="mt-2">
            <SheetClose asChild>
              <Link
                to="/HRO-clearance"
                className="flex items-center gap-3 text-xl font-semibold text-primary"
              >
                <img
                  src="/PrimaryPenIcon.png"
                  alt="Clearance"
                  className="h-5 w-5 object-contain"
                />
                <span>Clearance</span>
              </Link>
            </SheetClose>
            </div>

           <div className="mt-2">
              <SheetClose asChild>
                <Link
                  to="/HRO-action"
                  className="flex items-center gap-3 text-xl font-semibold text-primary"
                >
                  <img
                    src="/PrimaryClockIcon.png"
                    alt="Actions"
                    className="h-5 w-5 object-contain"
                  />
                  <span>Actions</span>
                </Link>
              </SheetClose>

              <div className="mt-5 flex gap-3">
                <div className="flex w-5 justify-center">
                  <div className="w-px bg-[hsl(var(--gray-border))]" />
                </div>
                <div className=" flex flex-col space-y-3">
                  <SheetClose asChild>
                    <Link
                      to="/HRO-assistant-list"
                      className="text-xl font-regular text-primary"
                    >
                      View Approver Assistants
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      to="/HRO-export-archive-clearance"
                      className="text-xl font-regular text-primary"
                    >
                      Export & Archive Clearance
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      to="/HRO-activity-logs"
                      className="text-xl font-regular text-primary"
                    >
                      Check Activity Logs
                    </Link>
                  </SheetClose>
                </div>
              </div>
            </div>

            <div className="mt-2">
            <SheetClose asChild>
              <Link
                to="/HRO-notification"
                className="flex items-center gap-3 text-xl font-semibold text-primary"
              >
                <img
                  src="/PrimaryNotificationsIcon.png"
                  alt="Notifications"
                  className="h-5 w-5 object-contain"
                />
                <span>Notifications</span>
                {unreadCount > 0 ? (
                  <div className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                    {unreadCount}
                  </div>
                ) : null}
              </Link>
            </SheetClose>
            </div>
          </nav>
        </div>

        <Divider className="-mx-6 mt-6 w-[calc(100%+3rem)] border-[hsl(var(--gray-border))]" />

        <div className="pt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-3 text-left text-xl font-semibold text-primary"
              >
                <img
                  src="/PrimaryLogoutIcon.png"
                  alt="Logout"
                  className="h-5 w-5 object-contain"
                />
                <span>Logout</span>
              </button>
            </AlertDialogTrigger>

            <AlertDialogContent className="max-w-xs">
              <AlertDialogHeader className="items-center text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-red-500 text-red-500">
                  <span className="text-2xl font-bold">!</span>
                </div>
                <AlertDialogTitle className="mt-2 text-base font-semibold">
                  You are logging out
                </AlertDialogTitle>
                <div className="text-sm font-semibold text-muted-foreground">
                  XU Faculty ClearTrack
                </div>
              </AlertDialogHeader>

              <AlertDialogFooter className="mt-2 flex flex-col gap-2 sm:flex-col sm:space-x-0">
                <AlertDialogAction
                  className="w-full"
                  onClick={handleLogout}
                >
                  Logout
                </AlertDialogAction>
                <AlertDialogCancel className="w-full">Cancel</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </HeaderVariant>
  );
}

export function CISOHeader() {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    let mounted = true;
    fetch("/admin/xu-faculty-clearance/api/notifications/unread-count", {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    })
      .then(async (resp) => {
        if (!resp.ok) {
          return null;
        }
        return resp.json();
      })
      .then((data) => {
        if (!mounted || !data) return;
        const count = Number(data.unreadCount);
        setUnreadCount(Number.isFinite(count) ? count : 0);
      })
      .catch(() => {
        if (!mounted) return;
        setUnreadCount(0);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      console.log("LOGOUT(UI): Clearing current session...");
      const response = await fetch(
        "/admin/xu-faculty-clearance/api/auth/logout",
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        console.error("LOGOUT(UI): Logout request failed", response.status);
      } else {
        console.log("LOGOUT(UI): Session cleared");
      }
    } catch (err) {
      console.error("LOGOUT(UI): Logout request error", err);
    } finally {
      navigate("/");
    }
  };

  return (
    <HeaderVariant>
      <div className="mt-4 flex h-full flex-col">
        <div className="flex flex-col gap-4 flex-1 min-h-0">

          <div className="flex items-center gap-4">
            <img
              src="/Pen Swish Dark Blue_FacultyClearTrack.png"
              alt="Faculty ClearTrack"
              className="h-10 w-auto object-contain"
            />

            <span className="text-primary font-bold leading-[1.1] text-[clamp(1rem,3.5vw,1.4rem)]">
              XU Faculty <br /> ClearTrack
            </span>
          </div>

        <Divider className="-mx-6 mt-2 w-[calc(100%+3rem)] border-[hsl(var(--gray-border))]" />

          <nav className="flex flex-col gap-4 mt-2 overflow-y-auto flex-1 min-h-0 pr-2">
            <div>
              <SheetClose asChild>
                <Link
                  to="/CISO-dashboard"
                  className="flex items-center gap-3  font-semibold text-primary text-xl"
                >
                  <img
                    src="/PrimaryHomeIcon.png"
                    alt="Dashboard"
                    className="h-5 w-5 object-contain"
                  />
                  <span>Dashboard</span>
                </Link>
              </SheetClose>

              <div className="mt-5 flex gap-3">
                <div className="flex w-5 justify-center">
                  <div className="w-px bg-[hsl(var(--gray-border))]" />
                </div>
                
                <div className="flex flex-col space-y-3">
                  <SheetClose asChild>
                    <Link
                      to="/CISO-system-guideline"
                      className="text-xl font-regular text-primary"
                    >
                      System Guidlines
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      to="/CISO-announcement"
                      className="text-xl font-regular text-primary"
                    >
                      Announcements
                    </Link>
                  </SheetClose>
                </div>
              </div>
            </div>


           <div className="mt-2">
              <SheetClose asChild>
                <Link
                  to="/CISO-tools"
                  className="flex items-center gap-3 text-xl font-semibold text-primary"
                >
                  <img
                    src="/PrimaryToolIcon.png"
                    alt="Actions"
                    className="h-5 w-5 object-contain"
                  />
                  <span>Tools</span>
                </Link>
              </SheetClose>

              <div className="mt-5 flex gap-3">
                <div className="flex w-5 justify-center">
                  <div className="w-px bg-[hsl(var(--gray-border))]" />
                </div>
                <div className=" flex flex-col space-y-3">
                  <SheetClose asChild>
                    <Link
                      to="/CISO-clearance-timeline"
                      className="text-xl font-regular text-primary"
                    >
                      Set Clearance Timeline
                    </Link>
                  </SheetClose>

                  <SheetClose asChild>
                    <Link
                      to="/CISO-college-office-configuration"
                      className="text-xl font-regular text-primary"
                    >
                      College & Office Configuration
                    </Link>
                  </SheetClose> 

                  <SheetClose asChild>
                    <Link
                      to="/CISO-faculty-data-dump"
                      className="text-xl font-regular text-primary"
                    >
                      Faculty Data Dump
                    </Link>
                  </SheetClose>

                  <SheetClose asChild>
                    <Link
                      to="/CISO-manage-system-user"
                      className="text-xl font-regular text-primary"
                    >
                      Manage System Users
                    </Link>
                  </SheetClose>

                  <SheetClose asChild>
                    <Link
                      to="/CISO-archived-clearance"
                      className="text-xl font-regular text-primary"
                    >
                      View Archived Clearance
                    </Link>
                  </SheetClose>

                  <SheetClose asChild>
                    <Link
                      to="/CISO-archived-faculty"
                      className="text-xl font-regular text-primary"
                    >
                      View Archived Faculty
                    </Link>
                  </SheetClose>

                  <SheetClose asChild>
                    <Link
                      to="/CISO-activity-logs"
                      className="text-xl font-regular text-primary"
                    >
                      Check Activity Logs
                    </Link>
                  </SheetClose>

                </div>
              </div>
            </div>

            <div className="mt-2">
            <SheetClose asChild>
              <Link
                to="/CISO-notification"
                className="flex items-center gap-3 text-xl font-semibold text-primary"
              >
                <img
                  src="/PrimaryNotificationsIcon.png"
                  alt="Notifications"
                  className="h-5 w-5 object-contain"
                />
                <span>Notifications</span>
                {unreadCount > 0 ? (
                  <div className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                    {unreadCount}
                  </div>
                ) : null}
              </Link>
            </SheetClose>
            </div>
          </nav>
        </div>

        <Divider className="-mx-6 mt-6 w-[calc(100%+3rem)] border-[hsl(var(--gray-border))]" />

        <div className="pt-4 flex-shrink-0">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-3 text-left text-xl font-semibold text-primary"
              >
                <img
                  src="/PrimaryLogoutIcon.png"
                  alt="Logout"
                  className="h-5 w-5 object-contain"
                />
                <span>Logout</span>
              </button>
            </AlertDialogTrigger>

            <AlertDialogContent className="max-w-xs">
              <AlertDialogHeader className="items-center text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-red-500 text-red-500">
                  <span className="text-2xl font-bold">!</span>
                </div>
                <AlertDialogTitle className="mt-2 text-base font-semibold">
                  You are logging out
                </AlertDialogTitle>
                <div className="text-sm font-semibold text-muted-foreground">
                  XU Faculty ClearTrack
                </div>
              </AlertDialogHeader>

              <AlertDialogFooter className="mt-2 flex flex-col gap-2 sm:flex-col sm:space-x-0">
                <AlertDialogAction
                  className="w-full"
                  onClick={async () => {
                    try {
                      const r = await fetch("/admin/xu-faculty-clearance/api/ciso/activity-logs", {
                        method: "POST",
                        credentials: "include",
                        keepalive: true,
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          event_type: "user_logout",
                          user_role: "CISO",
                          details: ["CISO Logout"],
                        }),
                      });
                      if (!r.ok) {
                        const text = await r.text().catch(() => "");
                        console.error("[CISO] activity log POST failed:", r.status, text);
                      }
                    } catch {
                    }
                    await handleLogout();
                  }}
                >
                  Logout
                </AlertDialogAction>
                <AlertDialogCancel className="w-full">Cancel</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </HeaderVariant>
  );
}

export function OVPHEHeader() {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    let mounted = true;
    fetch("/admin/xu-faculty-clearance/api/notifications/unread-count", {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    })
      .then(async (resp) => {
        if (!resp.ok) {
          return null;
        }
        return resp.json();
      })
      .then((data) => {
        if (!mounted || !data) return;
        const count = Number(data.unreadCount);
        setUnreadCount(Number.isFinite(count) ? count : 0);
      })
      .catch(() => {
        if (!mounted) return;
        setUnreadCount(0);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      console.log("LOGOUT(UI): Clearing current session...");
      const response = await fetch(
        "/admin/xu-faculty-clearance/api/auth/logout",
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        console.error("LOGOUT(UI): Logout request failed", response.status);
      } else {
        console.log("LOGOUT(UI): Session cleared");
      }
    } catch (err) {
      console.error("LOGOUT(UI): Logout request error", err);
    } finally {
      navigate("/");
    }
  };

  return (
    <HeaderVariant>
      <div className="mt-4 flex h-full flex-col">
        <div className="flex flex-col gap-4">

          <div className="flex items-center gap-4">
            <img
              src="/Pen Swish Dark Blue_FacultyClearTrack.png"
              alt="Faculty ClearTrack"
              className="h-10 w-auto object-contain"
            />

            <span className="text-primary font-bold leading-[1.1] text-[clamp(1rem,3.5vw,1.4rem)]">
              XU Faculty <br /> ClearTrack
            </span>
          </div>

        <Divider className="-mx-6 mt-2 w-[calc(100%+3rem)] border-[hsl(var(--gray-border))]" />

          <nav className="flex flex-col gap-4 mt-2">
            <div>
              <SheetClose asChild>
                <Link
                  to="/OVPHE-dashboard"
                  className="flex items-center gap-3  font-semibold text-primary text-xl"
                >
                  <img
                    src="/PrimaryHomeIcon.png"
                    alt="Dashboard"
                    className="h-5 w-5 object-contain"
                  />
                  <span>Dashboard</span>
                </Link>
              </SheetClose>

              <div className="mt-5 flex gap-3">
                <div className="flex w-5 justify-center">
                  <div className="w-px bg-[hsl(var(--gray-border))]" />
                </div>
                
                <div className="flex flex-col space-y-3">
                  <SheetClose asChild>
                    <Link
                      to="/OVPHE-system-guideline"
                      className="text-xl font-regular text-primary"
                    >
                      System Guidlines
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      to="/OVPHE-announcements"
                      className="text-xl font-regular text-primary"
                    >
                      Announcements
                    </Link>
                  </SheetClose>
                </div>
              </div>
            </div>


           <div className="mt-2">
              <SheetClose asChild>
                <Link
                  to="/OVPHE-tools"
                  className="flex items-center gap-3 text-xl font-semibold text-primary"
                >
                  <img
                    src="/PrimaryToolIcon.png"
                    alt="Actions"
                    className="h-5 w-5 object-contain"
                  />
                  <span>Tools</span>
                </Link>
              </SheetClose>

              <div className="mt-5 flex gap-3">
                <div className="flex w-5 justify-center">
                  <div className="w-px bg-[hsl(var(--gray-border))]" />
                </div>
                <div className=" flex flex-col space-y-3">

                  <SheetClose asChild>
                    <Link
                      to="/OVPHE-system-analytics"
                      className="text-xl font-regular text-primary"
                    >
                      System Analytics
                    </Link>
                  </SheetClose>

                  <SheetClose asChild>
                    <Link
                      to="/OVPHE-archived-clearance"
                      className="text-xl font-regular text-primary"
                    >
                      View Archived Clearance
                    </Link>
                  </SheetClose>

                  <SheetClose asChild>
                    <Link
                      to="/OVPHE-activity-logs"
                      className="text-xl font-regular text-primary"
                    >
                      Check Activity Logs
                    </Link>
                  </SheetClose>
                </div>
              </div>
            </div>

            <div className="mt-2">
            <SheetClose asChild>
              <Link
                to="/OVPHE-notification"
                className="flex items-center gap-3 text-xl font-semibold text-primary"
              >
                <img
                  src="/PrimaryNotificationsIcon.png"
                  alt="Notifications"
                  className="h-5 w-5 object-contain"
                />
                <span>Notifications</span>
                {unreadCount > 0 ? (
                  <div className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                    {unreadCount}
                  </div>
                ) : null}
              </Link>
            </SheetClose>
            </div>
          </nav>
        </div>

        <Divider className="-mx-6 mt-6 w-[calc(100%+3rem)] border-[hsl(var(--gray-border))]" />

        <div className="pt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-3 text-left text-xl font-semibold text-primary"
              >
                <img
                  src="/PrimaryLogoutIcon.png"
                  alt="Logout"
                  className="h-5 w-5 object-contain"
                />
                <span>Logout</span>
              </button>
            </AlertDialogTrigger>

            <AlertDialogContent className="max-w-xs">
              <AlertDialogHeader className="items-center text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-red-500 text-red-500">
                  <span className="text-2xl font-bold">!</span>
                </div>
                <AlertDialogTitle className="mt-2 text-base font-semibold">
                  You are logging out
                </AlertDialogTitle>
                <div className="text-sm font-semibold text-muted-foreground">
                  XU Faculty ClearTrack
                </div>
              </AlertDialogHeader>

              <AlertDialogFooter className="mt-2 flex flex-col gap-2 sm:flex-col sm:space-x-0">
                <AlertDialogAction
                  className="w-full" 
                  onClick={async () => {
                    try {
                      const r = await fetch("/admin/xu-faculty-clearance/api/ovphe/activity-logs", {
                        method: "POST",
                        credentials: "include",
                        keepalive: true,
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          event_type: "user_logout",
                          user_role: "OVPHE",
                          details: ["OVPHE Logout"],
                        }),
                      });
                      if (!r.ok) {
                        const text = await r.text().catch(() => "");
                        console.error("[OVPHE] activity log POST failed:", r.status, text);
                      }
                    } catch {
                    }
                    await handleLogout();
                  }}
                >
                  Logout
                </AlertDialogAction>
                <AlertDialogCancel className="w-full">Cancel</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </HeaderVariant>
  );
}

export function AssistantApproverHeader() {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    let mounted = true;
    fetch("/admin/xu-faculty-clearance/api/notifications/unread-count", {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    })
      .then(async (resp) => {
        if (!resp.ok) {
          return null;
        }
        return resp.json();
      })
      .then((data) => {
        if (!mounted || !data) return;
        const count = Number(data.unreadCount);
        setUnreadCount(Number.isFinite(count) ? count : 0);
      })
      .catch(() => {
        if (!mounted) return;
        setUnreadCount(0);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      console.log("LOGOUT(UI): Clearing current session...");
      const response = await fetch(
        "/admin/xu-faculty-clearance/api/auth/logout",
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        console.error("LOGOUT(UI): Logout request failed", response.status);
      } else {
        console.log("LOGOUT(UI): Session cleared");
      }
    } catch (err) {
      console.error("LOGOUT(UI): Logout request error", err);
    } finally {
      navigate("/");
    }
  };

  return (
    <HeaderVariant>
      <div className="mt-4 flex h-full flex-col">
        <div className="flex flex-col gap-4">

          <div className="flex items-center gap-4">
            <img
              src="/Pen Swish Dark Blue_FacultyClearTrack.png"
              alt="Faculty ClearTrack"
              className="h-10 w-auto object-contain"
            />

            <span className="text-primary font-bold leading-[1.1] text-[clamp(1rem,3.5vw,1.4rem)]">
              XU Faculty <br /> ClearTrack
            </span>
          </div>

        <Divider className="-mx-6 mt-2 w-[calc(100%+3rem)] border-[hsl(var(--gray-border))]" />

          <nav className="flex flex-col gap-4 mt-2">
            <div>
              <SheetClose asChild>
                <Link
                  to="/assistant-approver-dashboard"
                  className="flex items-center gap-3  font-semibold text-primary text-xl"
                >
                  <img
                    src="/PrimaryHomeIcon.png"
                    alt="Dashboard"
                    className="h-5 w-5 object-contain"
                  />
                  <span>Dashboard</span>
                </Link>
              </SheetClose>

              <div className="mt-5 flex gap-3">
                <div className="flex w-5 justify-center">
                  <div className="w-px bg-[hsl(var(--gray-border))]" />
                </div>
                
                <div className="flex flex-col space-y-3">
                  <SheetClose asChild>
                    <Link
                      to="/assistant-approver-requirement-list"
                      className="text-xl font-regular text-primary"
                    >
                      Requirement List
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      to="/assistant-approver-dashboard"
                      className="text-xl font-regular text-primary"
                    >
                      Announcements
                    </Link>
                  </SheetClose>
                </div>
              </div>
            </div>

            <div className="mt-2">
            <SheetClose asChild>
              <Link
                to="/assistant-approver-clearance"
                className="flex items-center gap-3 text-xl font-semibold text-primary"
              >
                <img
                  src="/PrimaryPenIcon.png"
                  alt="Clearance"
                  className="h-5 w-5 object-contain"
                />
                <span>Clearance Request</span>
              </Link>
            </SheetClose>
            </div>
            

            <div className="mt-2">
              <SheetClose asChild>
                <Link
                  to="/assistant-approver-archived-clearance"
                  className="flex items-center gap-3 text-xl font-semibold text-primary"
                >
                <img
                  src="/PrimaryArchiveIcon.png"
                  alt="View Archived Clearance"
                  className="h-5 w-5 object-contain"
                />
                <span>View Archived Clearance</span>
                </Link>
              </SheetClose>
            </div>

            <div className="mt-2">
            <SheetClose asChild>
              <Link
                to="/assistant-approver-notification"
                className="flex items-center gap-3 text-xl font-semibold text-primary"
              >
                <img
                  src="/PrimaryNotificationsIcon.png"
                  alt="Notifications"
                  className="h-5 w-5 object-contain"
                />
                <span>Notifications</span>

                {unreadCount > 0 ? (
                  <div className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                    {unreadCount}
                  </div>
                ) : null}
              </Link>
            </SheetClose>
            </div>
          </nav>
        </div>

        <Divider className="-mx-6 mt-6 w-[calc(100%+3rem)] border-[hsl(var(--gray-border))]" />

        <div className="pt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-3 text-left text-xl font-semibold text-primary"
              >
                <img
                  src="/PrimaryLogoutIcon.png"
                  alt="Logout"
                  className="h-5 w-5 object-contain"
                />
                <span>Logout</span>
              </button>
            </AlertDialogTrigger>

            <AlertDialogContent className="max-w-xs">
              <AlertDialogHeader className="items-center text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-red-500 text-red-500">
                  <span className="text-2xl font-bold">!</span>
                </div>
                <AlertDialogTitle className="mt-2 text-base font-semibold">
                  You are logging out
                </AlertDialogTitle>
                <div className="text-sm font-semibold text-muted-foreground">
                  XU Faculty ClearTrack
                </div>
              </AlertDialogHeader>

              <AlertDialogFooter className="mt-2 flex flex-col gap-2 sm:flex-col sm:space-x-0">
                <AlertDialogAction
                  className="w-full"
                  onClick={async () => {
                    try {
                      const r = await fetch(
                        "/admin/xu-faculty-clearance/api/approver/activity-logs",
                        {
                          method: "POST",
                          credentials: "include",
                          keepalive: true,
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            event_type: "user_logout",
                            user_role: "Assistant",
                            details: ["Assistant Logout"],
                          }),
                        }
                      );
                      if (!r.ok) {
                        const text = await r.text().catch(() => "");
                        console.error("[Assistant] activity log POST failed:", r.status, text);
                      }
                    } catch {
                    }
                    await handleLogout();
                  }}
                >
                  Logout
                </AlertDialogAction>
                <AlertDialogCancel className="w-full">Cancel</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </HeaderVariant>
  );
}
