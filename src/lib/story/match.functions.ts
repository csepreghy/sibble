// Authoritative multiplayer Story server functions. Clients send intents only;
// the server validates turns, letters, words, scoring and purchases, and writes
// with an optimistic version check so retries and double clicks can't apply twice.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import type { PendingPlacement } from "./types";
import {
  abandon, buy, createMatch, discard, joinMatch, passTurn, playMove, privateView, publicView, rematch, reorderPens,
  seatOf, sell, setReady, statusOf, type MatchState, type Seat,
} from "./multiplayer";

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

async function displayName(userId: string): Promise<string> {
  const db = await admin();
  const { data } = await db.from("profiles").select("display_name, email").eq("id", userId).maybeSingle();
  return data?.display_name || data?.email?.split("@")[0] || "Player";
}

async function load(id: string) {
  const db = await admin();
  const { data, error } = await db.from("story_matches").select("id, version, state").eq("id", id).maybeSingle();
  if (error) throw new Error("Could not load the match.");
  if (!data) throw new Error("This match doesn't exist.");
  return { version: data.version, match: data.state as unknown as MatchState };
}

// The sanitized public view is written in the same row update; a database trigger
// mirrors it to the participant feed atomically and never lets an older version win.
function row(match: MatchState, finishedAt: string | null) {
  const status = statusOf(match);
  return {
    state: match as unknown as Json, public_view: publicView(match) as unknown as Json, status,
    player2: match.players[1]?.userId ?? null, updated_at: new Date().toISOString(),
    finished_at: finishedAt ?? (status === "finished" ? new Date().toISOString() : null),
  };
}

async function save(id: string, version: number, match: MatchState) {
  const db = await admin();
  const { data: cur } = await db.from("story_matches").select("finished_at").eq("id", id).maybeSingle();
  const { data, error } = await db.from("story_matches")
    .update({ ...row(match, cur?.finished_at ?? null), version: version + 1 })
    .eq("id", id).eq("version", version).select("id");
  if (error) throw new Error("Could not save the move.");
  if (!data?.length) throw new Error("The match changed — refreshing.");
}

function snapshot(id: string, version: number, match: MatchState, seat: Seat) {
  return { id, version, seat, public: publicView(match), me: privateView(match, seat) };
}
export type MatchSnapshot = ReturnType<typeof snapshot>;

async function insert(match: MatchState, id?: string) {
  const db = await admin();
  const { data, error } = await db.from("story_matches")
    .upsert({ ...(id ? { id } : {}), player1: match.players[0].userId, ...row(match, null) }, { onConflict: "id", ignoreDuplicates: true })
    .select("id");
  if (error) throw new Error("Could not create the match.");
  return data?.[0]?.id ?? id!;
}

export const createStoryMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ({ id: await insert(createMatch(context.userId, await displayName(context.userId))) }));

export const getStoryMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .handler(async ({ data, context }) => {
    const { version, match } = await load(data.id);
    const seat = seatOf(match, context.userId);
    if (seat === null) {
      // Limited invitation view: only who is inviting and whether it's still open.
      return { invite: { host: match.players[0].name, open: match.phase === "lobby" && !match.players[1], cancelled: match.phase === "cancelled" } } as const;
    }
    return { snapshot: snapshot(data.id, version, match, seat) } as const;
  });

export const joinStoryMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .handler(async ({ data, context }) => {
    const { version, match } = await load(data.id);
    const r = joinMatch(match, context.userId, await displayName(context.userId));
    if ("error" in r) throw new Error(r.error);
    await save(data.id, version, r.match);
    return snapshot(data.id, version + 1, r.match, 1);
  });

export type MatchAction =
  | { type: "play"; placements: PendingPlacement[] }
  | { type: "pass" }
  | { type: "discard"; tileIds: string[] }
  | { type: "buy"; offerIndex: number; letter?: string }
  | { type: "sell"; penId: string }
  | { type: "reorder"; order: string[] }
  | { type: "ready" }
  | { type: "abandon" };

export const actStoryMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; version: number; action: MatchAction }) => {
    if (!d || typeof d.id !== "string" || !Number.isInteger(d.version) || !d.action || typeof d.action.type !== "string") throw new Error("Invalid request.");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { version, match } = await load(data.id);
    const seat = seatOf(match, context.userId);
    if (seat === null) throw new Error("You're not in this match.");
    // Stale versions are rejected: a retried or doubled request can never apply twice.
    if (data.version !== version) return { stale: true as const, snapshot: snapshot(data.id, version, match, seat) };
    const a = data.action;
    let r;
    switch (a.type) {
      case "play": {
        const placements = (Array.isArray(a.placements) ? a.placements : []).slice(0, 20).map((p) => ({
          index: Number(p.index), tileId: String(p.tileId), letter: String(p.letter).toUpperCase(), blank: !!p.blank,
        }));
        const { serverDictionary } = await import("./dictionary.server");
        const dict = await serverDictionary();
        r = playMove(match, seat, placements, (w) => dict.has(w.toUpperCase()));
        break;
      }
      case "pass": r = passTurn(match, seat); break;
      case "discard": r = discard(match, seat, (a.tileIds ?? []).map(String).slice(0, 8)); break;
      case "buy": r = buy(match, seat, Number(a.offerIndex), a.letter ? String(a.letter) : undefined); break;
      case "sell": r = sell(match, seat, String(a.penId)); break;
      case "reorder": r = reorderPens(match, seat, (a.order ?? []).map(String)); break;
      case "ready": r = setReady(match, seat); break;
      case "abandon": r = abandon(match, seat); break;
      default: throw new Error("Unknown action.");
    }
    if ("error" in r) return { error: r.error, snapshot: snapshot(data.id, version, match, seat) };
    await save(data.id, version, r.match);
    return { snapshot: snapshot(data.id, version + 1, r.match, seat) };
  });

export const rematchStoryMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .handler(async ({ data, context }) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const { version, match } = await load(data.id);
      const seat = seatOf(match, context.userId);
      if (seat === null || !match.players[1]) throw new Error("Rematch isn't available.");
      const pa = match.players[0], pb = match.players[1];
      const child = () => rematch({ userId: pa.userId, name: pa.name }, { userId: pb.userId, name: pb.name });
      // Existing claim: make sure the child exists (heals a crash between claim and insert).
      if (match.rematchId) { await insert(child(), match.rematchId); return { id: match.rematchId }; }
      if (match.phase !== "finished") throw new Error("Rematch isn't available.");
      // Claim the child id with the versioned parent write first: only one racer wins.
      const id = crypto.randomUUID();
      try { await save(data.id, version, { ...match, rematchId: id }); } catch { continue; }
      await insert(child(), id);
      return { id };
    }
    throw new Error("Rematch is busy — try again.");
  });
