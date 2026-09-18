import {
  getVapidPublicKey,
  removePushSubscription,
  savePushSubscription,
} from "@/lib/push.functions";

export type PushStatus =
  | "enabled"
  | "unsupported"
  | "open-in-new-tab"
  | "denied"
  | "not-configured"
  | "off";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalised = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalised);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

function bufferToBase64Url(buffer: ArrayBuffer | null) {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Current state without prompting the user. */
export async function currentPushStatus(): Promise<PushStatus> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const existing = await registration?.pushManager.getSubscription();
  return existing ? "enabled" : "off";
}

export async function enablePush(): Promise<PushStatus> {
  if (!pushSupported()) return "unsupported";
  if (window.top !== window.self && Notification.permission !== "granted") {
    return "open-in-new-tab";
  }

  const permission =
    Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  const { key } = await getVapidPublicKey();
  if (!key) return "not-configured";

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    }));

  await savePushSubscription({
    data: {
      endpoint: subscription.endpoint,
      p256dh: bufferToBase64Url(subscription.getKey("p256dh")),
      auth: bufferToBase64Url(subscription.getKey("auth")),
    },
  });
  return "enabled";
}

export async function disablePush(): Promise<PushStatus> {
  if (!pushSupported()) return "unsupported";
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await removePushSubscription({ data: { endpoint: subscription.endpoint } }).catch(() => {});
    await subscription.unsubscribe().catch(() => {});
  }
  return "off";
}
