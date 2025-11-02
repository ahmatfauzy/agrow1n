"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle, Clock, X } from "lucide-react";

interface Reminder {
  id: string;
  reminderType: string;
  message: string;
  scheduledDate: string;
  isCompleted: boolean;
  cropName?: string;
}

const LS_PREFIX = "dismissed:";

function isAutoId(id: string) {
  return id.startsWith("auto-");
}

function wasDismissedToday(id: string): boolean {
  const ts = localStorage.getItem(LS_PREFIX + id);
  if (!ts) return false;
  return Date.now() - Number(ts) < 24 * 60 * 60 * 1000;
}

function markDismissed(id: string) {
  localStorage.setItem(LS_PREFIX + id, String(Date.now()));
}

export function ReminderNotification() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchReminders = async () => {
    try {
      const res = await fetch("/api/reminders/upcoming");
      const raw: Reminder[] = await res.json();

      const filtered = raw.filter((r) => {
        if (!isAutoId(r.id)) return true;               
        return !wasDismissedToday(r.id);                 
      });

      setReminders(filtered.filter((r) => !r.isCompleted));  
    } catch (e) {
      console.error("Error fetching reminders:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
    const i = setInterval(fetchReminders, 5 * 60 * 1000); 
    return () => clearInterval(i);
  }, []);

  const handleCompleteReminder = async (id: string) => {
    if (isAutoId(id)) {                 
      markDismissed(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
      return;
    }
    // reminder DB → update server
    try {
      await fetch(`/api/reminders/${id}/complete`, { method: "POST" });
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDismiss = (id: string) => {
    if (isAutoId(id)) markDismissed(id);
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  const getIcon = (t: string) => {
    switch (t) {
      case "watering": return "Siram Tanaman";
      case "fertilizing": return "Beri Pupuk";
      case "disease_check": return "Periksa Penyakit";
      case "harvest": return "Waktu Panen";
      default: return "Pengingat";
    }
  };

  const getColor = (t: string) => {
    switch (t) {
      case "watering": return "bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700";
      case "fertilizing": return "bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700";
      case "disease_check": return "bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700";
      case "harvest": return "bg-yellow-50 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-700";
      default: return "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700";
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowNotifications((s) => !s)}
        className="relative p-2 hover:bg-muted rounded-lg transition-colors"
        title="Pengingat"
      >
        <Bell className="w-5 h-5" />
        {reminders.length > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {reminders.length > 9 ? "9+" : reminders.length}
          </span>
        )}
      </button>

      {showNotifications && (
        <div className="fixed md:absolute top-12 left-4 right-4 md:right-0 md:left-auto md:w-96 max-h-96 bg-background border border-border rounded-lg shadow-xl overflow-hidden flex flex-col z-50">
          <div className="bg-green-50 dark:bg-green-900 p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Pengingat & Notifikasi
            </h3>
            <button onClick={() => setShowNotifications(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {loading ? (
            <div className="p-4 text-center text-muted-foreground">Memuat pengingat...</div>
          ) : reminders.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Tidak ada pengingat. Semua tugas selesai!</p>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1">
              {reminders.map((r) => (
                <div
                  key={r.id}
                  className={`p-4 border-b border-border last:border-b-0 ${getColor(r.reminderType)}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{getIcon(r.reminderType)}</p>
                      <p className="text-sm text-muted-foreground mt-1">{r.message}</p>
                      {r.cropName && (
                        <p className="text-xs text-muted-foreground mt-1">Tanaman: {r.cropName}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(r.scheduledDate).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDismiss(r.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={() => handleCompleteReminder(r.id)}
                      size="sm"
                      className="flex-1 h-8 text-xs"
                    >
                      Selesai
                    </Button>
                    <button
                      onClick={() => handleDismiss(r.id)}
                      className="flex-1 px-2 py-1 text-xs border rounded-md text-muted-foreground hover:bg-muted"
                    >
                      Abaikan
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showNotifications && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setShowNotifications(false)} />
      )}
    </div>
  );
}