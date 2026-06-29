import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getChatEvent = query({
  args: { chatEventId: v.id("chatEvents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.chatEventId);
  },
});

export const getChatEventVotes = query({
  args: { chatEventId: v.id("chatEvents") },
  handler: async (ctx, args) => {
    return await ctx.db.query("chatEventVotes")
      .withIndex("by_event", (q) => q.eq("chatEventId", args.chatEventId))
      .collect();
  },
});

export const getMyVotes = query({
  args: { chatEventId: v.id("chatEvents"), userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.query("chatEventVotes")
      .withIndex("by_event_user", (q) => q.eq("chatEventId", args.chatEventId).eq("userId", args.userId))
      .collect();
  },
});

export const createChatEvent = mutation({
  args: {
    conversationId: v.id("conversations"),
    creatorId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    timeSlots: v.array(v.object({
      startTime: v.number(),
      endTime: v.number()
    })),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    if (!conversation.participants.includes(args.creatorId)) {
      throw new Error("User is not a participant of this conversation");
    }

    const chatEventId = await ctx.db.insert("chatEvents", {
      conversationId: args.conversationId,
      creatorId: args.creatorId,
      title: args.title.trim(),
      description: args.description?.trim(),
      timeSlots: args.timeSlots,
      createdAt: Date.now(),
    });

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: args.creatorId,
      content: args.title.trim(),
      type: "event_invite",
      chatEventId: chatEventId,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.conversationId, {
      lastMessageId: messageId,
      updatedAt: Date.now(),
    });

    return chatEventId;
  },
});

export const voteChatEvent = mutation({
  args: {
    chatEventId: v.id("chatEvents"),
    userId: v.id("users"),
    slotIndex: v.number(),
    vote: v.union(v.literal("yes"), v.literal("maybe"), v.literal("no")),
  },
  handler: async (ctx, args) => {
    const existingVotes = await ctx.db.query("chatEventVotes")
      .withIndex("by_event_user", (q) => q.eq("chatEventId", args.chatEventId).eq("userId", args.userId))
      .collect();

    const existingVote = existingVotes.find(v => v.slotIndex === args.slotIndex);
    const chatEvent = await ctx.db.get(args.chatEventId);
    
    if (!chatEvent) throw new Error("Chat event not found");

    let eventId: any = undefined;

    // Handle auto calendar sync if the slot has already been confirmed
    if (chatEvent.confirmedTimeSlotIndex === args.slotIndex) {
      if (args.vote === "yes") {
        if (!existingVote || !existingVote.eventId) {
          eventId = await ctx.db.insert("events", {
            title: chatEvent.title,
            description: chatEvent.description,
            startTime: chatEvent.timeSlots[args.slotIndex].startTime,
            endTime: chatEvent.timeSlots[args.slotIndex].endTime,
            createdBy: args.userId,
            isPrivate: true,
          });
        } else {
          eventId = existingVote.eventId;
        }
      } else {
        if (existingVote?.eventId) {
          await ctx.db.delete(existingVote.eventId);
        }
        eventId = undefined;
      }
    }

    if (existingVote) {
      await ctx.db.patch(existingVote._id, {
        vote: args.vote,
        eventId: eventId,
        votedAt: Date.now()
      });
    } else {
      await ctx.db.insert("chatEventVotes", {
        chatEventId: args.chatEventId,
        userId: args.userId,
        slotIndex: args.slotIndex,
        vote: args.vote,
        eventId: eventId,
        votedAt: Date.now()
      });
    }
  },
});

export const confirmChatEvent = mutation({
  args: {
    chatEventId: v.id("chatEvents"),
    userId: v.id("users"),
    slotIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const chatEvent = await ctx.db.get(args.chatEventId);
    if (!chatEvent) throw new Error("Event not found");

    if (chatEvent.creatorId !== args.userId) {
      throw new Error("Only the creator can confirm a time slot");
    }

    await ctx.db.patch(args.chatEventId, {
      confirmedTimeSlotIndex: args.slotIndex,
    });

    const slot = chatEvent.timeSlots[args.slotIndex];

    const yesVotes = await ctx.db.query("chatEventVotes")
      .withIndex("by_event", (q) => q.eq("chatEventId", args.chatEventId))
      .filter((q) => q.and(
         q.eq(q.field("slotIndex"), args.slotIndex), 
         q.eq(q.field("vote"), "yes")
      ))
      .collect();

    for (const vote of yesVotes) {
      if (!vote.eventId) {
        const newEventId = await ctx.db.insert("events", {
          title: chatEvent.title,
          description: chatEvent.description,
          startTime: slot.startTime,
          endTime: slot.endTime,
          createdBy: vote.userId,
          isPrivate: true,
        });
        await ctx.db.patch(vote._id, { eventId: newEventId });
      }
    }
    
    // Create a system message announcing the confirmation
    const user = await ctx.db.get(args.userId);
    if (user) {
        await ctx.db.insert("messages", {
          conversationId: chatEvent.conversationId,
          senderId: args.userId,
          content: `${user.name} hat einen Termin für "${chatEvent.title}" bestätigt`,
          type: "system",
          createdAt: Date.now(),
        });
        
        await ctx.db.patch(chatEvent.conversationId, {
           updatedAt: Date.now()
        });
    }
  },
});
