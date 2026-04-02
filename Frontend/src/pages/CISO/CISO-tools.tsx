import "../../index.css";
import { CISOHeader } from "../../stories/components/header";
import { ActionNavCard } from "../../stories/components/cards";
import { Eye, Users } from "lucide-react";

export default function CISOTools() {
  return (
    <div className="min-h-screen bg-primary-foreground text-primary-foreground">
      {/* HEADER */}
      <div className="header mb-3">
        <CISOHeader />
      </div>

      {/* DASHBOARD CONTENT */}
      <main className="dashboard p-4">

        <div className="mt-0 grid gap-4">

          <ActionNavCard
            icon={
                <img
                  src="/PrimaryCalendarIcon.png"
                  alt="activity logs icon"
                  className="h-9 w-9"
                />
            }
            title="Set Clearance Timeline"
            description="Set system’s Clearance Timeline"
            to="/CISO-clearance-timeline"
          />

          <ActionNavCard
            icon={
                <img
                  src="/PrimarySliderIcon.png"
                  alt="activity logs icon"
                  className="h-9 w-9"
                />
            }
            title="College & Office Configuration"
            description="Configure Colleges & Offices"
            to="/CISO-college-office-configuration"
          />

          <ActionNavCard
            icon={
                <img
                  src="/PrimaryUploadIcon.png"
                  alt="activity logs icon"
                  className="h-9 w-9"
                />
            }
            title="Faculty Data Dump"
            description="Check current system user dump"
            to="/CISO-faculty-data-dump"
          />


          <ActionNavCard
            icon={
                <img
                  src="/PrimaryPersonIcon.png"
                  alt="activity logs icon"
                  className="h-9 w-9"
                />
            }
            title="Manage System Users"
            description="View and set the system approvers"
            to="/CISO-manage-system-user"
          />

          <ActionNavCard
            icon={
                <img
                  src="/PrimaryArchiveIcon.png"
                  alt="activity logs icon"
                  className="h-9 w-9"
                />
            }
            title="View Archived Clearance"
            description="Check clearance requests from the previous terms"
            to="/CISO-archived-clearance"
          />

          <ActionNavCard
            icon={
                <img
                  src="/PrimaryFolderIcon.png"
                  alt="activity logs icon"
                  className="h-9 w-9"
                />
            }
            title="View Archived Faculty"
            description="Access previously uploaded .csv files"
            to="/CISO-archived-faculty"
          />

          <ActionNavCard
            icon={<Eye className="h-9 w-9" />}
            title="Check Activity Logs"
            description="Check the previous actions"
            to="/CISO-activity-logs"
          />
        </div>
      </main>
    </div>
  );
}
