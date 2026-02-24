import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useMeters } from "@/lib/meters-context";
import MeterCard from "@/components/MeterCard";
import AddMeterDialog from "@/components/AddMeterDialog";
import NotificationPanel from "@/components/NotificationPanel";
import { Zap, Plus, LogOut, Bell } from "lucide-react";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { meters, removeMeter, notifications } = useMeters();
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold font-heading text-foreground text-lg">Cash Power</span>
          </div>
          <div className="flex items-center gap-3">
            {notifications.length > 0 && (
              <div className="relative">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                  {notifications.length}
                </span>
              </div>
            )}
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold font-heading text-foreground">
            Welcome back, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {meters.length === 0
              ? "Add your first meter to get started"
              : `You have ${meters.length} meter${meters.length > 1 ? "s" : ""} linked`}
          </p>
        </div>

        {/* Notifications */}
        <NotificationPanel />

        {/* Meters Grid */}
        {meters.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {meters.map((meter) => (
              <MeterCard key={meter.id} meter={meter} onRemove={removeMeter} />
            ))}
          </div>
        ) : (
          <div className="gradient-card rounded-2xl border border-border p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold font-heading text-foreground mb-2">No meters linked</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Add your Cash Power meter number to start monitoring your electricity balance.
            </p>
          </div>
        )}

        {/* Add Meter Button */}
        <button
          onClick={() => setDialogOpen(true)}
          className="mt-6 w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Meter
        </button>
      </main>

      <AddMeterDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
};

export default Dashboard;
