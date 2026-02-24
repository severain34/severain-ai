import { Meter } from "@/lib/meters-context";
import { Zap, Trash2, ExternalLink } from "lucide-react";

interface MeterCardProps {
  meter: Meter;
  onRemove: (id: string) => void;
}

const statusConfig = {
  good: { label: "Good", dotClass: "bg-success", glowClass: "glow-accent", barColor: "bg-success" },
  warning: { label: "Low", dotClass: "bg-warning", glowClass: "glow-warning", barColor: "bg-warning" },
  critical: { label: "Critical", dotClass: "bg-destructive animate-pulse-glow", glowClass: "glow-destructive", barColor: "bg-destructive" },
};

const MeterCard = ({ meter, onRemove }: MeterCardProps) => {
  const config = statusConfig[meter.status];
  const barWidth = Math.min((meter.balance / 100) * 100, 100);

  return (
    <div className={`gradient-card rounded-2xl border border-border p-6 transition-all hover:border-primary/30 ${meter.status === "critical" ? "border-destructive/30" : ""}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${meter.status === "critical" ? "bg-destructive/20" : "bg-primary/20"}`}>
            <Zap className={`w-5 h-5 ${meter.status === "critical" ? "text-destructive" : "text-primary"}`} />
          </div>
          <div>
            <h3 className="font-semibold font-heading text-foreground">{meter.name}</h3>
            <p className="text-sm text-muted-foreground">Meter: {meter.meterNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${config.dotClass}`} />
          <span className="text-xs text-muted-foreground">{config.label}</span>
        </div>
      </div>

      {/* Balance */}
      <div className="mb-4">
        <div className="flex items-end justify-between mb-2">
          <span className="text-3xl font-bold font-heading text-foreground">{meter.balance}</span>
          <span className="text-sm text-muted-foreground">kWh</span>
        </div>
        <div className="w-full h-2 rounded-full bg-secondary">
          <div
            className={`h-full rounded-full ${config.barColor} transition-all duration-500`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-4">Last purchase: {meter.lastPurchase}</p>

      {/* Actions */}
      <div className="flex gap-2">
        <a
          href="https://www.eucl.rw/buy-electricity"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <ExternalLink className="w-4 h-4" />
          Buy Power
        </a>
        <button
          onClick={() => onRemove(meter.id)}
          className="px-3 py-2.5 rounded-lg bg-secondary text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default MeterCard;
