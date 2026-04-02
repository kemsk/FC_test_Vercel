import React from "react";
import "../../index.css"; // ensure index.css is accessible from src
import { Button } from "../../stories/components/button";
import { AssistantApproverHeader } from "../../stories/components/header";

import {
  NotificationsCard,
  type NotificationItem,
} from "../../stories/components/cards";


export default function AssistantApproverNotification() {
  const [readAll, setReadAll] = React.useState(false);

  const items: NotificationItem[] = [
    {
      title: "Department Chair",
      status: "approved",
      details: ["Submission of Syllabus", "Submission of Grades"],
      timestamp: "December 3, 2025, 9:30 AM",
    },
    {
      title: "University Registrar",
      status: "rejected",
      details: ["Submission of Grades", "Remarks: incomplete submission"],
      timestamp: "December 1, 2025, 9:30 AM",
    },
    {
      title: "University Registrar",
      status: "submitted",
      details: ["Submission of Grades"],
      timestamp: "November 28, 2025, 9:30 AM",
    },
    {
      title: "University Registrar",
      status: "submitted",
      details: ["Submission of Grades"],
      timestamp: "November 28, 2025, 9:30 AM",
    },
    {
      title: "University Registrar",
      status: "submitted",
      details: ["Submission of Grades"],
      timestamp: "November 28, 2025, 9:30 AM",
    },
  ];

  return (
    <div className="min-h-screen bg-primary-foreground text-primary-foreground">
      
      {/* HEADER */}
      <div className="header mb-3">
        <AssistantApproverHeader />
      </div>

      {/* DASHBOARD CONTENT */}
      <main className="dashboard p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">Notifications</h1>
        </div>

        <div className="flex items-center justify-end">
          <Button
            className="h-8 px-3 text-xs"
            variant="default"
            type="button"
            onClick={() => setReadAll(true)}
          >
            Mark as Read
          </Button>
        </div>
        <div className="mt-4">
          <NotificationsCard
            items={items}
            showMarkAsReadButton={false}
            readAll={readAll}
            onReadAllChange={setReadAll}
          />
        </div>
      </main>
    </div>
  );
}
