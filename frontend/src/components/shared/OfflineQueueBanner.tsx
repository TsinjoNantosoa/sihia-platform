import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CloudOff, RefreshCw, Wifi } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { replayQueuedAppointmentMutations } from "@/lib/api/services";
import { useAuth } from "@/lib/auth/store";
import { useT } from "@/lib/i18n/store";
import {
  loadOfflineAppointmentQueue,
  OFFLINE_QUEUE_EVENT,
  setObservedNetworkOnline,
  type OfflineAppointmentMutation,
} from "@/lib/offline/appointmentQueue";

export function OfflineQueueBanner() {
  const t = useT();
  const qc = useQueryClient();
  const user = useAuth((state) => state.user);
  const userKey = user?.id || user?.email || "anonymous";
  const syncingRef = useRef(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [queue, setQueue] = useState<OfflineAppointmentMutation[]>([]);

  const refreshQueue = useCallback(() => {
    if (typeof window === "undefined") return;
    setQueue(loadOfflineAppointmentQueue(window.localStorage, userKey));
  }, [userKey]);

  const synchronize = useCallback(async () => {
    if (typeof window === "undefined" || !window.navigator.onLine || syncingRef.current) return;
    const pending = loadOfflineAppointmentQueue(window.localStorage, userKey);
    if (pending.length === 0) return;
    syncingRef.current = true;
    setIsSyncing(true);
    try {
      const summary = await replayQueuedAppointmentMutations(userKey);
      if (summary.processed > 0) {
        qc.invalidateQueries({ queryKey: ["appts"] });
        toast.success(t("offline.syncedToast").replace("{count}", String(summary.processed)));
      }
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
      refreshQueue();
    }
  }, [qc, refreshQueue, t, userKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => {
      setObservedNetworkOnline(true);
      setIsOnline(true);
      void synchronize();
    };
    const handleOffline = () => {
      setObservedNetworkOnline(false);
      setIsOnline(false);
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener(OFFLINE_QUEUE_EVENT, refreshQueue);
    setObservedNetworkOnline(window.navigator.onLine);
    setIsOnline(window.navigator.onLine);
    refreshQueue();
    if (window.navigator.onLine) void synchronize();
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(OFFLINE_QUEUE_EVENT, refreshQueue);
    };
  }, [refreshQueue, synchronize]);

  if (isOnline && queue.length === 0) return null;

  const failedCount = queue.filter((item) => item.attempts > 0).length;

  return (
    <div
      role="status"
      className={`flex flex-wrap items-center justify-center gap-2 border-b px-4 py-2 text-xs font-medium ${
        isOnline
          ? "border-warning/30 bg-warning-soft text-warning"
          : "border-destructive/30 bg-destructive-soft text-destructive"
      }`}
    >
      {isOnline ? <Wifi className="size-4" /> : <CloudOff className="size-4" />}
      <span>
        {isOnline
          ? t("offline.pending").replace("{count}", String(queue.length))
          : t("offline.active").replace("{count}", String(queue.length))}
      </span>
      {failedCount > 0 ? (
        <span>{t("offline.failed").replace("{count}", String(failedCount))}</span>
      ) : null}
      {isOnline && queue.length > 0 ? (
        <Button size="sm" variant="outline" disabled={isSyncing} onClick={() => void synchronize()}>
          <RefreshCw className={`size-3.5 ${isSyncing ? "animate-spin" : ""}`} />
          {t("offline.sync")}
        </Button>
      ) : null}
    </div>
  );
}
