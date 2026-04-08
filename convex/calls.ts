import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Einen neuen Anruf starten
export const initiateCall = mutation({
  args: {
    conversationId: v.id("conversations"),
    initiatorId: v.id("users"),
    invitedParticipants: v.array(v.id("users")),
    type: v.union(v.literal("voice"), v.literal("video")),
  },
  handler: async (ctx, args) => {
    // Alte laufende Anrufe für diesen Gesprächskanal beenden
    const existingCalls = await ctx.db
      .query("callSessions")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .filter((q) => q.neq(q.field("status"), "ended"))
      .collect();

    for (const call of existingCalls) {
      await ctx.db.patch(call._id, { status: "ended", endedAt: Date.now() });
    }

    // Name direkt mitschreiben damit kein Extra-Query nötig ist
    const initiator = await ctx.db.get(args.initiatorId);

    const callId = await ctx.db.insert("callSessions", {
      conversationId: args.conversationId,
      initiatorId: args.initiatorId,
      initiatorName: initiator?.name ?? "Unbekannt",
      invitedParticipants: args.invitedParticipants,
      activeParticipants: [args.initiatorId],
      status: "calling",
      type: args.type,
      createdAt: Date.now(),
    });

    return callId;
  },
});

// Einem Anruf beitreten
export const joinCall = mutation({
  args: {
    callId: v.id("callSessions"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call || call.status === "ended") throw new Error("Call not found or ended");

    if (!call.activeParticipants.includes(args.userId)) {
      await ctx.db.patch(args.callId, {
        activeParticipants: [...call.activeParticipants, args.userId],
        status: "active",
      });
    }

    // Allen vorhandenen aktiven Teilnehmern mitteilen, dass ein neuer Teilnehmer beigetreten ist
    for (const participantId of call.activeParticipants) {
      if (participantId !== args.userId) {
        await ctx.db.insert("webrtcSignals", {
          callId: args.callId,
          fromUserId: args.userId,
          toUserId: participantId,
          type: "webrtc_start",
          data: JSON.stringify({}),
          processed: false,
          createdAt: Date.now(),
        });
      }
    }
  },
});

// Einen Anruf verlassen / beenden
export const leaveCall = mutation({
  args: {
    callId: v.id("callSessions"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call) return;

    const newParticipants = call.activeParticipants.filter((id) => id !== args.userId);

    if (newParticipants.length === 0) {
      await ctx.db.patch(args.callId, {
        activeParticipants: [],
        status: "ended",
        endedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(args.callId, {
        activeParticipants: newParticipants,
      });
    }
  },
});

// Einen Anruf ablehnen (Status: ended wenn alle abgelehnt haben)
export const declineCall = mutation({
  args: {
    callId: v.id("callSessions"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call) return;

    // Wenn der Anrufer selbst ablehnt oder nur noch einer übrig ist → beenden
    const remainingInvited = call.invitedParticipants.filter((id) => id !== args.userId);
    if (call.status === "calling" && remainingInvited.length === 0) {
      await ctx.db.patch(args.callId, {
        status: "ended",
        endedAt: Date.now(),
      });
    }
  },
});

// WebRTC-Signal senden (Offer, Answer, ICE-Candidate)
export const sendSignal = mutation({
  args: {
    callId: v.id("callSessions"),
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    type: v.union(
      v.literal("webrtc_start"),
      v.literal("offer"),
      v.literal("answer"),
      v.literal("ice-candidate")
    ),
    data: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("webrtcSignals", {
      callId: args.callId,
      fromUserId: args.fromUserId,
      toUserId: args.toUserId,
      type: args.type,
      data: args.data,
      processed: false,
      createdAt: Date.now(),
    });
  },
});

// Signal als verarbeitet markieren
export const markSignalProcessed = mutation({
  args: {
    signalId: v.id("webrtcSignals"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.signalId, { processed: true });
  },
});

// Alle alten verarbeiteten Signale eines Anrufs löschen (Cleanup)
export const cleanupSignals = mutation({
  args: {
    callId: v.id("callSessions"),
  },
  handler: async (ctx, args) => {
    const signals = await ctx.db
      .query("webrtcSignals")
      .withIndex("by_call", (q) => q.eq("callId", args.callId))
      .filter((q) => q.eq(q.field("processed"), true))
      .collect();

    for (const signal of signals) {
      await ctx.db.delete(signal._id);
    }
  },
});

// Aktiven Anruf für einen Gesprächskanal abfragen
export const getActiveCall = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("callSessions")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .filter((q) => q.neq(q.field("status"), "ended"))
      .first();
  },
});

// Ausstehende Signale für einen Nutzer in einem Anruf abfragen
export const getPendingSignals = query({
  args: {
    callId: v.id("callSessions"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("webrtcSignals")
      .withIndex("by_call_to_user", (q) =>
        q.eq("callId", args.callId).eq("toUserId", args.userId).eq("processed", false)
      )
      .order("asc")
      .collect();
  },
});

// Anruf-Session nach ID abfragen
export const getCallSession = query({
  args: {
    callId: v.id("callSessions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.callId);
  },
});

// Alle eingehenden Anrufe für einen Nutzer (status: "calling")
export const getIncomingCalls = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const callingSessions = await ctx.db
      .query("callSessions")
      .withIndex("by_status", (q) => q.eq("status", "calling"))
      .collect();

    return callingSessions.filter(
      (call) =>
        call.invitedParticipants.includes(args.userId) &&
        !call.activeParticipants.includes(args.userId)
    );
  },
});
