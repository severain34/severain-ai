import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./auth-context";

export interface Meter {
  id: string;
  meterNumber: string;
  name: string;
  balance: number; // kWh remaining
  lastPurchase: string;
  status: "good" | "warning" | "critical";
}

interface MetersContextType {
  meters: Meter[];
  addMeter: (meterNumber: string, name: string) => void;
  removeMeter: (id: string) => void;
  notifications: Notification[];
  clearNotification: (id: string) => void;
}

interface Notification {
  id: string;
  meterId: string;
  meterName: string;
  message: string;
  type: "warning" | "critical";
  timestamp: string;
}

const MetersContext = createContext<MetersContextType | null>(null);

export const useMeters = () => {
  const ctx = useContext(MetersContext);
  if (!ctx) throw new Error("useMeters must be used within MetersProvider");
  return ctx;
};

const getStatus = (balance: number): "good" | "warning" | "critical" => {
  if (balance <= 5) return "critical";
  if (balance <= 20) return "warning";
  return "good";
};

export const MetersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [meters, setMeters] = useState<Meter[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const storageKey = user ? `cashpower_meters_${user.id}` : null;

  useEffect(() => {
    if (storageKey) {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed: Meter[] = JSON.parse(stored);
        setMeters(parsed);
        // Generate notifications for low balance
        const notifs: Notification[] = [];
        parsed.forEach((m) => {
          if (m.balance <= 20) {
            notifs.push({
              id: crypto.randomUUID(),
              meterId: m.id,
              meterName: m.name,
              message: m.balance <= 5
                ? `⚡ CRITICAL: ${m.name} has only ${m.balance} kWh remaining! Buy power now!`
                : `⚠️ Low balance: ${m.name} has ${m.balance} kWh remaining.`,
              type: m.balance <= 5 ? "critical" : "warning",
              timestamp: new Date().toISOString(),
            });
          }
        });
        setNotifications(notifs);
      }
    } else {
      setMeters([]);
      setNotifications([]);
    }
  }, [storageKey]);

  const save = (updated: Meter[]) => {
    setMeters(updated);
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const addMeter = (meterNumber: string, name: string) => {
    // Simulate a random balance for demo
    const balance = Math.floor(Math.random() * 80) + 2;
    const newMeter: Meter = {
      id: crypto.randomUUID(),
      meterNumber,
      name,
      balance,
      lastPurchase: new Date().toLocaleDateString(),
      status: getStatus(balance),
    };
    const updated = [...meters, newMeter];
    save(updated);

    if (balance <= 20) {
      setNotifications((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          meterId: newMeter.id,
          meterName: name,
          message: balance <= 5
            ? `⚡ CRITICAL: ${name} has only ${balance} kWh remaining!`
            : `⚠️ Low balance: ${name} has ${balance} kWh remaining.`,
          type: balance <= 5 ? "critical" : "warning",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  const removeMeter = (id: string) => {
    save(meters.filter((m) => m.id !== id));
    setNotifications((prev) => prev.filter((n) => n.meterId !== id));
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <MetersContext.Provider value={{ meters, addMeter, removeMeter, notifications, clearNotification }}>
      {children}
    </MetersContext.Provider>
  );
};
