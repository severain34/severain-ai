import { useMeters } from "@/lib/meters-context";
import { X, Bell } from "lucide-react";

const NotificationPanel = () => {
  const { notifications, clearNotification } = useMeters();

  if (notifications.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Bell className="w-4 h-4" />
        <span className="text-sm font-medium">Notifications ({notifications.length})</span>
      </div>
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`flex items-start gap-3 p-4 rounded-xl border ${
            n.type === "critical"
              ? "bg-destructive/10 border-destructive/20"
              : "bg-warning/10 border-warning/20"
          }`}
        >
          <span className="text-sm flex-1">{n.message}</span>
          <button
            onClick={() => clearNotification(n.id)}
            className="shrink-0 p-1 rounded hover:bg-secondary text-muted-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationPanel;
