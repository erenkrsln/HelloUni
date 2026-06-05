import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { getUserImageUrl } from "./helpers";

/** Hilfsfunktion: User mit aufgelöstem Profilbild zurückgeben */
async function withResolvedImage(ctx: any, user: any) {
  if (!user) return null;
  const image = await getUserImageUrl(ctx, user.image);
  return { ...user, image };
}

/** Dauer in MM:SS formatieren */
function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

/**
 * System-Nachricht im Chat einfügen, sobald ein Call endet.
 * Wird von allen End-Mutationen aufgerufen.
 */
async function insertCallSummaryMessage(
  ctx: any,
  callId: string,
  conversationId: string,
  createdBy: string,
  callType: "voice" | "video",
  createdAt: number,
  endedAt: number,
  wasRejected = false,
) {
  // Prüfen ob irgendjemand außer dem Ersteller verbunden war
  const participants = await ctx.db
    .query("callParticipants")
    .withIndex("by_call", (q: any) => q.eq("callId", callId))
    .collect();

  const anyoneConnected = participants.some(
    (p: any) => p.userId !== createdBy && p.joinedAt !== undefined,
  );

  const typeLabel = callType === "video" ? "Videoanruf" : "Sprachanruf";

  let content: string;
  if (wasRejected) {
    content = `${typeLabel} abgelehnt`;
  } else if (!anyoneConnected) {
    content = `Verpasster ${typeLabel}`;
  } else {
    const duration = formatDuration(endedAt - createdAt);
    content = `${typeLabel} · ${duration}`;
  }

  const now = Date.now();
  const messageId = await ctx.db.insert("messages", {
    conversationId,
    senderId: createdBy,
    content,
    type: "system",
    createdAt: now,
  });

  // Conversation-Vorschau aktualisieren, damit die Nachricht in der Chat-Liste erscheint
  await ctx.db.patch(conversationId, {
    lastMessageId: messageId,
    updatedAt: now,
  });
}

// ─── QUERIES ──────────────────────────────────────────────────────────────────

/** Aktiven (ringing oder active) Call für eine Conversation holen */
export const getActiveCallForConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const call = await ctx.db
      .query("calls")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "ringing"),
          q.eq(q.field("status"), "active"),
        )
      )
      .order("desc")
      .first();
    return call ?? null;
  },
});

/** Alle Gruppen-Chats des Users mit gerade laufendem Gruppenanruf (für Chat-Liste /chat) */
export const getActiveGroupCallsForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const conversations = await ctx.db.query("conversations").collect();

    const isActiveGroupMember = (c: (typeof conversations)[number]) => {
      if (!c.isGroup) return false;
      if (!c.participants.includes(args.userId)) return false;
      if (c.leftParticipants?.includes(args.userId)) return false;
      return true;
    };

    const groupConversations = conversations.filter(isActiveGroupMember);

    const results: {
      conversationId: Id<"conversations">;
      callId: Id<"calls">;
      type: "voice" | "video";
      status: "ringing" | "active";
    }[] = [];

    for (const conv of groupConversations) {
      const callsForConv = await ctx.db
        .query("calls")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
        .order("desc")
        .take(20);

      const live = callsForConv.find(
        (call) =>
          call.scope === "group" &&
          (call.status === "ringing" || call.status === "active"),
      );

      if (
        live &&
        (live.status === "ringing" || live.status === "active")
      ) {
        results.push({
          conversationId: conv._id,
          callId: live._id,
          type: live.type,
          status: live.status,
        });
      }
    }

    return results;
  },
});

/** Eingehende Calls für einen User (Ringing-Einladungen) */
export const getIncomingCalls = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const invitations = await ctx.db
      .query("callParticipants")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "invited"),
          q.eq(q.field("status"), "ringing"),
        )
      )
      .collect();

    const enriched = await Promise.all(
      invitations.map(async (inv) => {
        const call = await ctx.db.get(inv.callId);
        if (!call || call.status !== "ringing") return null;
        const callerRaw = await ctx.db.get(call.createdBy);
        const caller = await withResolvedImage(ctx, callerRaw);
        return { call, caller, participantRecord: inv };
      }),
    );

    return enriched.filter(Boolean) as NonNullable<(typeof enriched)[number]>[];
  },
});

/** Einzelnen Call anhand ID */
export const getCallById = query({
  args: { callId: v.id("calls") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.callId);
  },
});

/** Alle Teilnehmer eines Calls inkl. User-Daten (mit aufgelösten Profilbildern) */
export const getCallParticipants = query({
  args: { callId: v.id("calls") },
  handler: async (ctx, args) => {
    const participants = await ctx.db
      .query("callParticipants")
      .withIndex("by_call", (q) => q.eq("callId", args.callId))
      .collect();

    const withUsers = await Promise.all(
      participants.map(async (p) => {
        const user = await ctx.db.get(p.userId);
        return { ...p, user: await withResolvedImage(ctx, user) };
      }),
    );

    return withUsers;
  },
});

/** Unverbrauchte WebRTC-Signale für einen User in einem Call */
export const getSignalsForUser = query({
  args: {
    callId: v.id("calls"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const signals = await ctx.db
      .query("callSignals")
      .withIndex("by_call", (q) => q.eq("callId", args.callId))
      .filter((q) =>
        q.and(
          q.eq(q.field("toUserId"), args.userId),
          q.neq(q.field("consumed"), true),
        )
      )
      .collect();

    return signals;
  },
});

// ─── MUTATIONS ────────────────────────────────────────────────────────────────

/** Call starten (privat oder Gruppe) */
export const startCall = mutation({
  args: {
    conversationId: v.id("conversations"),
    callerId: v.id("users"),
    type: v.union(v.literal("voice"), v.literal("video")),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation nicht gefunden");

    if (!conversation.participants.includes(args.callerId)) {
      throw new Error("Kein Mitglied dieser Conversation");
    }

    // Bestehenden aktiven Call prüfen
    const existingCall = await ctx.db
      .query("calls")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "ringing"),
          q.eq(q.field("status"), "active"),
        )
      )
      .first();

    if (existingCall) {
      // Laufender Gruppen-Call: „Beitreten“ nutzt dieselbe startCall-Mutation — Teilnehmer muss joined werden,
      // sonst senden andere kein WebRTC-Offer und Kameras bleiben schwarz.
      if (existingCall.scope === "group") {
        const existingParticipant = await ctx.db
          .query("callParticipants")
          .withIndex("by_call_user", (q) =>
            q.eq("callId", existingCall._id).eq("userId", args.callerId),
          )
          .first();

        if (existingParticipant) {
          if (existingParticipant.status !== "joined") {
            await ctx.db.patch(existingParticipant._id, {
              status: "joined",
              joinedAt: Date.now(),
              leftAt: undefined,
              micEnabled: true,
              cameraEnabled: existingCall.type === "video",
            });
          } else if (!existingParticipant.micEnabled) {
            await ctx.db.patch(existingParticipant._id, {
              micEnabled: true,
            });
          }
        } else {
          await ctx.db.insert("callParticipants", {
            callId: existingCall._id,
            userId: args.callerId,
            joinedAt: Date.now(),
            status: "joined",
            micEnabled: true,
            cameraEnabled: existingCall.type === "video",
            screenSharing: false,
          });
        }

        if (existingCall.status === "ringing") {
          await ctx.db.patch(existingCall._id, { status: "active" });
        }

        return existingCall._id;
      }

      return existingCall._id;
    }

    const scope: "private" | "group" = conversation.isGroup ? "group" : "private";

    const callId = await ctx.db.insert("calls", {
      conversationId: args.conversationId,
      type: args.type,
      scope,
      status: "ringing",
      createdBy: args.callerId,
      createdAt: Date.now(),
    });

    // Anrufer als "joined" Teilnehmer hinzufügen
    await ctx.db.insert("callParticipants", {
      callId,
      userId: args.callerId,
      joinedAt: Date.now(),
      status: "joined",
      micEnabled: true,
      cameraEnabled: args.type === "video",
      screenSharing: false,
    });

    // Andere Teilnehmer als "ringing" einladen
    const others = conversation.participants.filter((id) => id !== args.callerId);
    for (const userId of others) {
      await ctx.db.insert("callParticipants", {
        callId,
        userId,
        status: "ringing",
        micEnabled: false,
        cameraEnabled: false,
        screenSharing: false,
      });
    }

    // Bei privatem Call: Auto-Cancel nach 30 Sekunden planen
    if (scope === "private") {
      await ctx.scheduler.runAfter(
        30_000,
        internal.calls.autoCancelRingingCall,
        { callId },
      );
    }

    return callId;
  },
});

/** Eingehenden Call annehmen */
export const acceptCall = mutation({
  args: {
    callId: v.id("calls"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call || (call.status !== "ringing" && call.status !== "active")) {
      throw new Error("Call nicht verfügbar");
    }

    const participant = await ctx.db
      .query("callParticipants")
      .withIndex("by_call_user", (q) =>
        q.eq("callId", args.callId).eq("userId", args.userId)
      )
      .first();

    if (!participant) throw new Error("Nicht eingeladen");

    await ctx.db.patch(participant._id, {
      status: "joined",
      joinedAt: Date.now(),
      micEnabled: true,
      cameraEnabled: call.type === "video",
    });

    // Call auf "active" setzen
    if (call.status === "ringing") {
      await ctx.db.patch(args.callId, { status: "active" });
    }

    return args.callId;
  },
});

/** Eingehenden Call ablehnen */
export const rejectCall = mutation({
  args: {
    callId: v.id("calls"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const participant = await ctx.db
      .query("callParticipants")
      .withIndex("by_call_user", (q) =>
        q.eq("callId", args.callId).eq("userId", args.userId)
      )
      .first();

    if (participant) {
      await ctx.db.patch(participant._id, {
        status: "rejected",
        leftAt: Date.now(),
      });
    }

    // Bei privatem Call: Call beenden wenn abgelehnt
    const call = await ctx.db.get(args.callId);
    if (call?.scope === "private") {
      const now = Date.now();
      await ctx.db.patch(args.callId, { status: "rejected", endedAt: now });
      await insertCallSummaryMessage(
        ctx, args.callId, call.conversationId, call.createdBy,
        call.type, call.createdAt, now, true,
      );
    }
  },
});

/** Ausgehenden Call abbrechen (Anrufer) */
export const cancelCall = mutation({
  args: {
    callId: v.id("calls"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call) return;

    const now = Date.now();
    await ctx.db.patch(args.callId, { status: "ended", endedAt: now });
    await insertCallSummaryMessage(
      ctx, args.callId, call.conversationId, call.createdBy,
      call.type, call.createdAt, now,
    );

    const participants = await ctx.db
      .query("callParticipants")
      .withIndex("by_call", (q) => q.eq("callId", args.callId))
      .collect();

    for (const p of participants) {
      if (p.status !== "left" && p.status !== "rejected") {
        await ctx.db.patch(p._id, { status: "left", leftAt: Date.now() });
      }
    }

    // Signale aufräumen
    const signals = await ctx.db
      .query("callSignals")
      .withIndex("by_call", (q) => q.eq("callId", args.callId))
      .collect();
    for (const s of signals) await ctx.db.delete(s._id);
  },
});

/** Einem laufenden Gruppen-Call beitreten */
export const joinCall = mutation({
  args: {
    callId: v.id("calls"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call || (call.status !== "active" && call.status !== "ringing")) {
      throw new Error("Call nicht joinbar");
    }

    const conversation = await ctx.db.get(call.conversationId);
    if (!conversation?.participants.includes(args.userId)) {
      throw new Error("Kein Mitglied dieser Conversation");
    }

    const existing = await ctx.db
      .query("callParticipants")
      .withIndex("by_call_user", (q) =>
        q.eq("callId", args.callId).eq("userId", args.userId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "joined",
        joinedAt: Date.now(),
        leftAt: undefined,
      });
    } else {
      await ctx.db.insert("callParticipants", {
        callId: args.callId,
        userId: args.userId,
        joinedAt: Date.now(),
        status: "joined",
        micEnabled: true,
        cameraEnabled: call.type === "video",
        screenSharing: false,
      });
    }

    if (call.status === "ringing") {
      await ctx.db.patch(args.callId, { status: "active" });
    }

    return args.callId;
  },
});

/** Call verlassen */
export const leaveCall = mutation({
  args: {
    callId: v.id("calls"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const participant = await ctx.db
      .query("callParticipants")
      .withIndex("by_call_user", (q) =>
        q.eq("callId", args.callId).eq("userId", args.userId)
      )
      .first();

    if (participant) {
      await ctx.db.patch(participant._id, {
        status: "left",
        leftAt: Date.now(),
        screenSharing: false,
      });
    }

    const call = await ctx.db.get(args.callId);
    if (!call || call.status === "ended") return;

    const shouldEnd = (() => {
      // Privater Call: sofort beenden wenn jemand geht
      if (call.scope === "private") return true;
      // Gruppen-Call: beenden wenn niemand mehr aktiv ist
      return false;
    })();

    if (!shouldEnd) {
      // Gruppen-Call: nur beenden wenn keine aktiven Teilnehmer mehr
      const activeParticipants = await ctx.db
        .query("callParticipants")
        .withIndex("by_call", (q) => q.eq("callId", args.callId))
        .filter((q) => q.eq(q.field("status"), "joined"))
        .collect();
      if (activeParticipants.length > 0) return;
    }

    const now = Date.now();
    await ctx.db.patch(args.callId, { status: "ended", endedAt: now });
    await insertCallSummaryMessage(
      ctx, args.callId, call.conversationId, call.createdBy,
      call.type, call.createdAt, now,
    );

    // Alle verbleibenden Teilnehmer auf "left" setzen
    const remaining = await ctx.db
      .query("callParticipants")
      .withIndex("by_call", (q) => q.eq("callId", args.callId))
      .filter((q) => q.eq(q.field("status"), "joined"))
      .collect();
    for (const p of remaining) {
      await ctx.db.patch(p._id, { status: "left", leftAt: now });
    }

    // Signale aufräumen
    const signals = await ctx.db
      .query("callSignals")
      .withIndex("by_call", (q) => q.eq("callId", args.callId))
      .collect();
    for (const s of signals) await ctx.db.delete(s._id);
  },
});

/** Call beenden (alle rauswerfen) */
export const endCall = mutation({
  args: {
    callId: v.id("calls"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call) return;

    const now = Date.now();
    await ctx.db.patch(args.callId, { status: "ended", endedAt: now });
    await insertCallSummaryMessage(
      ctx, args.callId, call.conversationId, call.createdBy,
      call.type, call.createdAt, now,
    );

    const participants = await ctx.db
      .query("callParticipants")
      .withIndex("by_call", (q) => q.eq("callId", args.callId))
      .collect();

    for (const p of participants) {
      if (p.status === "joined") {
        await ctx.db.patch(p._id, { status: "left", leftAt: Date.now() });
      }
    }

    // Signale aufräumen
    const signals = await ctx.db
      .query("callSignals")
      .withIndex("by_call", (q) => q.eq("callId", args.callId))
      .collect();
    for (const s of signals) await ctx.db.delete(s._id);
  },
});

/** Medienstatus eines Teilnehmers aktualisieren */
export const updateParticipantMediaState = mutation({
  args: {
    callId: v.id("calls"),
    userId: v.id("users"),
    micEnabled: v.optional(v.boolean()),
    cameraEnabled: v.optional(v.boolean()),
    screenSharing: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const participant = await ctx.db
      .query("callParticipants")
      .withIndex("by_call_user", (q) =>
        q.eq("callId", args.callId).eq("userId", args.userId)
      )
      .first();

    if (!participant) return;

    const updates: Partial<{
      micEnabled: boolean;
      cameraEnabled: boolean;
      screenSharing: boolean;
    }> = {};

    if (args.micEnabled !== undefined) updates.micEnabled = args.micEnabled;
    if (args.cameraEnabled !== undefined)
      updates.cameraEnabled = args.cameraEnabled;
    if (args.screenSharing !== undefined)
      updates.screenSharing = args.screenSharing;

    await ctx.db.patch(participant._id, updates);

    // screenSharingUserId am Call aktualisieren
    if (args.screenSharing !== undefined) {
      if (args.screenSharing) {
        await ctx.db.patch(args.callId, {
          screenSharingUserId: args.userId,
        });
      } else {
        const call = await ctx.db.get(args.callId);
        if (call?.screenSharingUserId === args.userId) {
          await ctx.db.patch(args.callId, {
            screenSharingUserId: undefined,
          });
        }
      }
    }
  },
});

/** WebRTC-Signal senden */
export const sendSignal = mutation({
  args: {
    callId: v.id("calls"),
    fromUserId: v.id("users"),
    toUserId: v.optional(v.id("users")),
    type: v.union(
      v.literal("offer"),
      v.literal("answer"),
      v.literal("ice-candidate"),
    ),
    payload: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("callSignals", {
      callId: args.callId,
      fromUserId: args.fromUserId,
      toUserId: args.toUserId,
      type: args.type,
      payload: args.payload,
      createdAt: Date.now(),
      consumed: false,
    });
  },
});

/** Signal als verbraucht markieren */
export const markSignalConsumed = mutation({
  args: { signalId: v.id("callSignals") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.signalId, { consumed: true });
  },
});

/** Alle Signale eines Calls löschen */
export const cleanupCallSignals = mutation({
  args: { callId: v.id("calls") },
  handler: async (ctx, args) => {
    const signals = await ctx.db
      .query("callSignals")
      .withIndex("by_call", (q) => q.eq("callId", args.callId))
      .collect();
    for (const s of signals) await ctx.db.delete(s._id);
  },
});

// ─── INTERNAL MUTATIONS (für Scheduler) ──────────────────────────────────────

/** Automatisch klingelnden Call nach Timeout beenden */
export const autoCancelRingingCall = internalMutation({
  args: { callId: v.id("calls") },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call || call.status !== "ringing") return;

    const now = Date.now();
    await ctx.db.patch(args.callId, { status: "ended", endedAt: now });
    await insertCallSummaryMessage(
      ctx, args.callId, call.conversationId, call.createdBy,
      call.type, call.createdAt, now,
    );

    const participants = await ctx.db
      .query("callParticipants")
      .withIndex("by_call", (q) => q.eq("callId", args.callId))
      .collect();

    for (const p of participants) {
      if (p.status !== "left" && p.status !== "rejected") {
        await ctx.db.patch(p._id, { status: "left", leftAt: Date.now() });
      }
    }

    const signals = await ctx.db
      .query("callSignals")
      .withIndex("by_call", (q) => q.eq("callId", args.callId))
      .collect();
    for (const s of signals) await ctx.db.delete(s._id);
  },
});
