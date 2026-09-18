import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  currentPushStatus,
  disablePush,
  enablePush,
  pushSupported,
  type PushStatus,
} from "@/lib/push-client";

export function NotificationToggle() {
  const [status, setStatus] = useState<PushStatus>("off");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    currentPushStatus()
      .then((next) => {
        if (active) setStatus(next);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (!pushSupported() || status === "unsupported") return null;

  async function toggle() {
    setBusy(true);
    try {
      if (status === "enabled") {
        setStatus(await disablePush());
        toast.message("Nudges turned off.");
        return;
      }
      const next = await enablePush();
      setStatus(next === "enabled" ? "enabled" : "off");
      if (next === "enabled") toast.success("You'll get a nudge when it's your move.");
      if (next === "denied")
        toast.error("Notifications are blocked — allow them for this site in your browser settings.");
      if (next === "open-in-new-tab")
        toast.error("Open the app in its own tab first, then turn notifications on.");
      if (next === "not-configured") toast.error("Notifications aren't set up yet.");
    } catch {
      toast.error("Couldn't change your notification setting.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={toggle}
      title={status === "enabled" ? "Turn off turn notifications" : "Notify me when it's my move"}
      className="rounded-full"
    >
      {status === "enabled" ? <Bell className="size-4" /> : <BellOff className="size-4" />}
      <span className="hidden sm:inline">{status === "enabled" ? "Nudges on" : "Nudges off"}</span>
    </Button>
  );
}
