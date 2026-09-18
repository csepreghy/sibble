import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** The public key browsers need to register for notifications. */
export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return { key: process.env["VAPID_PUBLIC_KEY"] ?? null };
});

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => subscriptionSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("push_subscriptions").upsert(
      {
        user_id: context.userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
      } as never,
      { onConflict: "endpoint" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ endpoint: z.string().url() }).parse(data))
  .handler(async ({ data, context }) => {
    await context.supabase.from("push_subscriptions").delete().eq("endpoint", data.endpoint);
    return { ok: true };
  });

/**
 * Tells the other player it's their move. Silent by design: a failed
 * notification must never break a turn that was already saved.
 */
export const notifyOpponentTurn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ gameId: z.string().uuid(), summary: z.string().max(120).optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { buildPushPayload } = await import("@block65/webcrypto-web-push");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const vapid = {
      subject: process.env["VAPID_SUBJECT"] ?? "mailto:hello@tile-table.app",
      publicKey: process.env["VAPID_PUBLIC_KEY"],
      privateKey: process.env["VAPID_PRIVATE_KEY"],
    };
    if (!vapid.publicKey || !vapid.privateKey) return { sent: 0 };

    const { data: game } = await supabaseAdmin
      .from("games")
      .select("id, player1, player2, player1_name, player2_name, solo")
      .eq("id", data.gameId)
      .maybeSingle();
    if (!game || game.solo) return { sent: 0 };

    const me = context.userId;
    if (game.player1 !== me && game.player2 !== me) return { sent: 0 };
    const opponentId = game.player1 === me ? game.player2 : game.player1;
    if (!opponentId) return { sent: 0 };
    const myName = (game.player1 === me ? game.player1_name : game.player2_name) || "Your opponent";

    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", opponentId);
    if (!subs || subs.length === 0) return { sent: 0 };

    const message = {
      data: {
        title: `🖕 ${myName} played their turn`,
        body: data.summary ? `${data.summary} Your move now — get even.` : "Your move now — get even.",
        url: `/game/${game.id}`,
        tag: `game-${game.id}`,
      },
      options: { ttl: 60 * 60 * 24, urgency: "high" as const, topic: game.id.slice(0, 20) },
    };

    let sent = 0;
    for (const sub of subs) {
      const subscription = {
        endpoint: sub.endpoint,
        expirationTime: null,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      try {
        const payload = await buildPushPayload(message, subscription, vapid);
        const response = await fetch(sub.endpoint, payload);
        if (response.status === 404 || response.status === 410) {
          await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        } else if (response.ok) {
          sent += 1;
        } else {
          console.error(`Push failed [${response.status}]: ${await response.text()}`);
        }
      } catch (error) {
        console.error("Push send error", error);
      }
    }
    return { sent };
  });
