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
    content: v.string(),
    imageUrl: v.optional(v.string()),
    likesCount: v.number(),
    commentsCount: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_created", ["createdAt"]),

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
});


