import React from "react";
import "../../index.css"; // ensure index.css is accessible from src
import { Button } from "../../stories/components/button";
import { OVPHEHeader } from "../../stories/components/header";

import {
  NotificationsCard,
  type NotificationItem,
} from "../../stories/components/cards";


export default function OVPHENotification() {
  const [readAll, setReadAll] = React.useState(false);

  const [items, setItems] = React.useState<NotificationItem[]>([]);

  React.useEffect(() => {
    fetch("/admin/xu-faculty-clearance/api/ovphe/notifications")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { items: NotificationItem[] }) => setItems(data.items ?? []))
      .catch(() => setItems([]));
  }, []);

  return (
    <div className="min-h-screen bg-primary-foreground text-primary-foreground">
      
      {/* HEADER */}
      <div className="header mb-3">
        <OVPHEHeader />
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
