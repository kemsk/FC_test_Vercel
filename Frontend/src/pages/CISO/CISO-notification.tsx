import React from "react";
import "../../index.css"; // ensure index.css is accessible from src
import { Button } from "../../stories/components/button";
import { CISOHeader } from "../../stories/components/header";

import {
  NotificationsCard,
  type NotificationItem,
} from "../../stories/components/cards";


export default function CISONotification() {
  const [readAll, setReadAll] = React.useState(false);

  const [items, setItems] = React.useState<NotificationItem[]>([]);

  React.useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch("/admin/xu-faculty-clearance/api/ciso/notifications", {
          credentials: "include",
        });

        const text = await r.text();
        if (!r.ok) {
          console.error("CISO notifications fetch failed", r.status, text);
          setItems([]);
          return;
        }

        try {
          const data = JSON.parse(text) as { items?: NotificationItem[] };
          setItems(data.items ?? []);
        } catch (e) {
          console.error("CISO notifications response was not JSON", r.status, text);
          setItems([]);
        }
      } catch (e) {
        console.error("CISO notifications fetch threw", e);
        setItems([]);
      }
    };

    void load();
  }, []);

  return (
    <div className="min-h-screen bg-primary-foreground text-primary-foreground">
      
      {/* HEADER */}
      <div className="header mb-3">
        <CISOHeader />
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
