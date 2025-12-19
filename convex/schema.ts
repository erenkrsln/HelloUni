import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    username: v.string(), // Für Authentifizierung
    passwordHash: v.string(), // Gehashtes Passwort
    image: v.optional(v.string()),
    uni_name: v.optional(v.string()), // Jetzt optional für initiale Registrierung
    major: v.optional(v.string()), // Jetzt optional für initiale Registrierung
    bio: v.optional(v.string()), // Biografie des Benutzers
  }).index("by_username", ["username"]), // Index für schnelle Suche nach Benutzername

  posts: defineTable({
    userId: v.id("users"),
    postType: v.optional(v.union(
      v.literal("normal"),
      v.literal("spontaneous_meeting"),
      v.literal("recurring_meeting"),
      v.literal("announcement"),
      v.literal("poll")
    )),
    title: v.optional(v.string()),
    content: v.string(),
    imageUrl: v.optional(v.string()),
    // Für Treffen
    eventDate: v.optional(v.number()), // Timestamp
    eventTime: v.optional(v.string()), // z.B. "14:00"
    participantLimit: v.optional(v.number()),
    // Für wiederkehrende Treffen
    recurrencePattern: v.optional(v.string()), // z.B. "weekly", "daily"
    // Für Umfragen
    pollOptions: v.optional(v.array(v.string())), // Array von Optionen
    // Allgemein
    tags: v.optional(v.array(v.string())), // Array von Tags
    mentions: v.optional(v.array(v.string())), // Array von Usernames die erwähnt wurden
    likesCount: v.number(),
    commentsCount: v.number(),
    participantsCount: v.optional(v.number()), // Anzahl der Teilnehmer
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_created", ["createdAt"])
    .index("by_type", ["postType"])
    .index("by_tags", ["tags"]),

  likes: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
  })
    .index("by_post", ["postId"])
    .index("by_user_post", ["userId", "postId"]),

  follows: defineTable({
    followerId: v.id("users"), // Der User, der folgt
    followingId: v.id("users"), // Der User, dem gefolgt wird
  })
    .index("by_follower", ["followerId"])
    .index("by_following", ["followingId"])
    .index("by_follower_following", ["followerId", "followingId"]),

  participants: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
    joinedAt: v.number(),
  })
    .index("by_post", ["postId"])
    .index("by_user_post", ["userId", "postId"]),

  pollVotes: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
    optionIndex: v.number(), // Index der gewählten Option
    votedAt: v.number(),
  })
    .index("by_post", ["postId"])
    .index("by_user_post", ["userId", "postId"]),

  conversations: defineTable({
    participants: v.array(v.id("users")), // Array von User IDs
    name: v.optional(v.string()), // Optionaler Gruppenname
    image: v.optional(v.string()), // Storage ID für Gruppenbild
    isGroup: v.optional(v.boolean()), // Flag für Gruppenchat
    adminIds: v.optional(v.array(v.id("users"))), // Array von User IDs die Admins sind
    creatorId: v.optional(v.id("users")), // Ersteller der Gruppe (kann nicht entmachtet werden)
    lastMessageId: v.optional(v.id("messages")),
    updatedAt: v.number(),
  }).index("by_participant", ["participants"]), // Dies könnte ineffizient sein, aber für V1 ok

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    type: v.optional(v.union(v.literal("text"), v.literal("system"))), // Nachrichtentyp
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_created", ["conversationId", "createdAt"]),

  last_reads: defineTable({
    userId: v.id("users"),
    conversationId: v.id("conversations"),
    lastReadAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_conversation", ["conversationId"])
    .index("by_user_conversation", ["userId", "conversationId"]),
});


