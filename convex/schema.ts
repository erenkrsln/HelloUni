import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    username: v.string(),
    email: v.optional(v.string()),
    passwordHash: v.string(),
    bio: v.optional(v.string()),
    profileImage: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    university: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_username", ["username"])
    .index("by_email", ["email"]),

  posts: defineTable({
    authorId: v.id("users"),
    content: v.string(),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
    likes: v.number(),
  })
    .index("by_author", ["authorId"])
    .index("by_created", ["createdAt"])
    .index("by_author_created", ["authorId", "createdAt"]), // Zusammengesetzter Index für Sortierung nach User und Datum

  likes: defineTable({
    postId: v.id("posts"),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_post", ["postId"])
    .index("by_user", ["userId"])
    .index("by_post_user", ["postId", "userId"]),

  comments: defineTable({
    postId: v.id("posts"),
    authorId: v.id("users"),
    content: v.string(),
    createdAt: v.number(),
  })
    .index("by_post", ["postId"])
    .index("by_author", ["authorId"]),

  follows: defineTable({
    followerId: v.id("users"),
    followingId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_follower", ["followerId"])
    .index("by_following", ["followingId"]),

  messages: defineTable({
    senderId: v.id("users"),
    receiverId: v.id("users"),
    content: v.string(),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_sender", ["senderId"])
    .index("by_receiver", ["receiverId"]),
});






