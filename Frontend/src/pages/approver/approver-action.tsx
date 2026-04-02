import "../../index.css";
import { ApprovalHeader } from "../../stories/components/header";
import { ActionNavCard } from "../../stories/components/cards";
import { Eye, Users } from "lucide-react";

export default function Action() {
  return (
    <div className="min-h-screen bg-primary-foreground text-primary-foreground">
      {/* HEADER */}
      <div className="header mb-3">
        <ApprovalHeader />
      </div>

      {/* DASHBOARD CONTENT */}
      <main className="dashboard p-4">

        <div className="mt-0 grid gap-4">
          <ActionNavCard
            icon={<Users className="h-7 w-7" />}
            title="View Student Assistants"
            description="Check the list of Student Assistants\nin your department"
            to="/approver-assistant-list"
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
            to="/approver-archived-clearance"
          />

          <ActionNavCard
            icon={<Eye className="h-7 w-7" />}
            title="Check Activity Logs"
            description="Check the previous actions"
            to="/approver-activity-logs"
          />
        </div>
      </main>
    </div>
  );
}
