import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    username: v.string(), // Für Authentifizierung
    email: v.optional(v.string()),
    passwordHash: v.optional(v.string()),
    image: v.optional(v.string()),
    headerImage: v.optional(v.string()), // Header/Titelbild
    uni_name: v.optional(v.string()), // Jetzt optional für initiale Registrierung
    major: v.optional(v.string()), // Jetzt optional für initiale Registrierung
    semester: v.optional(v.number()), // Semester (1-10)
    bio: v.optional(v.string()), // Biografie des Benutzers
    interests: v.optional(v.array(v.string())), // Interessen/Tags des Benutzers
    createdAt: v.optional(v.number()), // Erstellungsdatum für "Joined"
  })
    .index("by_username", ["username"])
    .index("by_email", ["email"]), // Index für schnelle Suche nach E-Mail

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
    // Standort
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    locationName: v.optional(v.string()),
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

  comments: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
    parentCommentId: v.optional(v.id("comments")), // Für verschachtelte Antworten
    content: v.string(),
    imageUrl: v.optional(v.string()), // Bild-URL für Kommentare
    likesCount: v.number(),
    repliesCount: v.number(), // Anzahl der Antworten
    createdAt: v.number(),
  })
    .index("by_post", ["postId"])
    .index("by_post_created", ["postId", "createdAt"])
    .index("by_parent", ["parentCommentId"]),

  commentLikes: defineTable({
    userId: v.id("users"),
    commentId: v.id("comments"),
  })
    .index("by_comment", ["commentId"])
    .index("by_user_comment", ["userId", "commentId"]),

  commentDislikes: defineTable({
    userId: v.id("users"),
    commentId: v.id("comments"),
  })
    .index("by_comment", ["commentId"])
    .index("by_user_comment", ["userId", "commentId"]),

  conversations: defineTable({
    participants: v.array(v.id("users")), // Array von User IDs
    leftParticipants: v.optional(v.array(v.id("users"))), // Ehemalige Teilnehmer (Read-Only)
    leftMetadata: v.optional(v.array(v.object({
      userId: v.id("users"),
      leftAt: v.number()
    }))), // Metadaten wann User die Gruppe verlassen haben
    name: v.optional(v.string()), // Optionaler Gruppenname
    image: v.optional(v.string()), // Storage ID für Gruppenbild
    isGroup: v.optional(v.boolean()), // Flag für Gruppenchat
    isPublic: v.optional(v.boolean()), // Flag für öffentliche Gruppen
    needsRequestToJoin: v.optional(v.boolean()), // Flag, ob ein Beitritt erst genehmigt werden muss
    adminIds: v.optional(v.array(v.id("users"))), // Array von User IDs die Admins sind
    creatorId: v.optional(v.id("users")), // Ersteller der Gruppe (kann nicht entmachtet werden)
    lastMessageId: v.optional(v.id("messages")),
    deletedBy: v.optional(v.array(v.id("users"))), // Array von User IDs die den Chat gelöscht haben
    updatedAt: v.number(),
  }).index("by_participant", ["participants"]), // Dies könnte ineffizient sein, aber für V1 ok

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    type: v.optional(v.union(v.literal("text"), v.literal("system"), v.literal("image"), v.literal("video"), v.literal("pdf"), v.literal("poll"), v.literal("post"), v.literal("profile"), v.literal("event_invite"), v.literal("location"), v.literal("live_location"))),
    storageId: v.optional(v.string()),
    fileName: v.optional(v.string()),
    contentType: v.optional(v.string()),
    chatPollId: v.optional(v.id("chatPolls")),
    chatEventId: v.optional(v.id("chatEvents")),
    sharedPostId: v.optional(v.id("posts")),
    sharedProfileId: v.optional(v.id("users")),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    address: v.optional(v.string()),
    liveDuration: v.optional(v.number()),
    liveExpiresAt: v.optional(v.number()),
    isLiveActive: v.optional(v.boolean()),
    visibleTo: v.optional(v.array(v.id("users"))),
    reactions: v.optional(v.array(v.object({
      emoji: v.string(),
      userId: v.id("users")
    }))),
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_created", ["conversationId", "createdAt"]),

  chatPolls: defineTable({
    conversationId: v.id("conversations"),
    creatorId: v.id("users"),
    question: v.string(),
    options: v.array(v.string()),
    allowMultiple: v.boolean(),
    closeAt: v.optional(v.number()), // timestamp when poll closes, optional
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"]),

  chatPollVotes: defineTable({
    chatPollId: v.id("chatPolls"),
    userId: v.id("users"),
    optionIndices: v.array(v.number()), // supports multiple answers
    votedAt: v.number(),
  })
    .index("by_poll", ["chatPollId"])
    .index("by_poll_user", ["chatPollId", "userId"]),

  chatEvents: defineTable({
    conversationId: v.id("conversations"),
    creatorId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    timeSlots: v.array(v.object({
      startTime: v.number(),
      endTime: v.number()
    })),
    confirmedTimeSlotIndex: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_conversation", ["conversationId"]),

  chatEventVotes: defineTable({
    chatEventId: v.id("chatEvents"),
    userId: v.id("users"),
    slotIndex: v.number(),
    vote: v.union(v.literal("yes"), v.literal("maybe"), v.literal("no")),
    eventId: v.optional(v.id("events")),
    votedAt: v.number(),
  })
    .index("by_event", ["chatEventId"])
    .index("by_event_user", ["chatEventId", "userId"]),

  last_reads: defineTable({
    userId: v.id("users"),
    conversationId: v.id("conversations"),
    lastReadAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_conversation", ["conversationId"])
    .index("by_user_conversation", ["userId", "conversationId"]),

  notifications: defineTable({
    userId: v.id("users"), // Recipient of the notification
    issuerId: v.id("users"), // Person who triggered the notification
    type: v.union(
      v.literal("follow"),
      v.literal("post_like"),
      v.literal("comment"),
      v.literal("comment_like"),
      v.literal("event_join"),
      v.literal("group_join_request"),
      v.literal("group_join_accept"),
      v.literal("group_join_reject")
    ),
    targetId: v.optional(v.string()), // ID of post, comment, event, or joinRequest
    eventMetadata: v.optional(v.object({
      eventType: v.union(
        v.literal("spontaneous_meeting"),
        v.literal("recurring_meeting")
      ),
    })),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_user_read", ["userId", "isRead"]),

  // Web Push subscriptions (PWA notifications). One row per browser/device endpoint.
  pushSubscriptions: defineTable({
    userId: v.id("users"),
    endpoint: v.string(),
    p256dh: v.string(), // public key from the browser subscription
    auth: v.string(), // auth secret from the browser subscription
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_endpoint", ["endpoint"]),

  joinRequests: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user", ["userId"])
    .index("by_conversation_user", ["conversationId", "userId"]),

  events: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.number(),
    location: v.optional(v.string()),
    createdBy: v.id("users"),
    isPrivate: v.optional(v.boolean()),
    workspaceId: v.optional(v.string()), // Löst die Verbindung zu einem Group/Event Hub
    conversationId: v.optional(v.id("conversations")), // Fixes the chat mismatch error
  })
    .index("by_start_time", ["startTime"])
    .index("by_user", ["createdBy"])
    .index("by_workspace", ["workspaceId"]),

  // Workspace: tasks, files, polls
  workspace_tasks: defineTable({
    workspaceId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    deadline: v.optional(v.string()),
    createdBy: v.id("users"),
    // Task enhancements
    assigneeId: v.optional(v.id("users")),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
    status: v.optional(v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done"))),
    isCompleted: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_assignee", ["assigneeId"])
    .index("by_workspace", ["workspaceId"]),

  workspace_files: defineTable({
    workspaceId: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    uploaderId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"]),

  workspace_polls: defineTable({
    workspaceId: v.string(),
    question: v.string(),
    options: v.array(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"]),

  workspace_poll_votes: defineTable({
    pollId: v.id("workspace_polls"),
    userId: v.id("users"),
    optionIndex: v.number(),
    createdAt: v.number(),
  })
    .index("by_poll", ["pollId"])
    .index("by_poll_user", ["pollId", "userId"]),

  // Group metadata and roles for Workspace collaboration
  workspace_groups: defineTable({
    conversationId: v.id("conversations"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    ownerId: v.id("users"),
    adminIds: v.optional(v.array(v.id("users"))),
    createdAt: v.number(),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_owner", ["ownerId"]),

  // Activity feed for group workspaces
  workspace_activity: defineTable({
    workspaceId: v.string(),
    actorId: v.id("users"),
    type: v.union(
      v.literal("task_created"),
      v.literal("task_updated"),
      v.literal("task_completed"),
      v.literal("task_deleted"),
      v.literal("event_created"),
      v.literal("member_joined"),
      v.literal("member_left"),
      v.literal("file_uploaded")
    ),
    data: v.optional(
      v.union(
        v.object({
          taskId: v.id("workspace_tasks"),
          title: v.string(),
        }),
        v.object({
          taskId: v.id("workspace_tasks"),
          status: v.union(
            v.literal("todo"),
            v.literal("in_progress"),
            v.literal("done")
          ),
        }),
        v.object({
          taskId: v.id("workspace_tasks"),
          patch: v.object({
            title: v.optional(v.string()),
            description: v.optional(v.string()),
            deadline: v.optional(v.string()),
            assigneeId: v.optional(v.id("users")),
            priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
            visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
            status: v.optional(v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done"))),
          }),
        }),
        v.object({ userId: v.id("users") }),
        v.object({})
      )
    ),
    createdAt: v.number(),
  })
    .index("by_workspace_created", ["workspaceId", "createdAt"]),

  liveLocations: defineTable({
    messageId: v.id("messages"),
    userId: v.id("users"),
    latitude: v.number(),
    longitude: v.number(),
    updatedAt: v.number(),
  })
    .index("by_message", ["messageId"])
    .index("by_user", ["userId"])
    .index("by_message_user", ["messageId", "userId"]),

  studiengangCache: defineTable({
    major: v.string(),
    fullContent: v.string(),
    pdfLinks: v.array(v.object({ text: v.string(), href: v.string() })),
    pdfContents: v.optional(v.array(v.object({
      text: v.string(),
      href: v.string(),
      content: v.string(),
    }))),
    scrapedAt: v.number(),
  }).index("by_major", ["major"]),

  mensaCache: defineTable({
    meals: v.array(v.object({ name: v.string(), price: v.string() })),
    scrapedAt: v.number(),
  }),
  // ─── Voice & Video Calls ───────────────────────────────────────────────────

  calls: defineTable({
    conversationId: v.id("conversations"),
    type: v.union(v.literal("voice"), v.literal("video")),
    scope: v.union(v.literal("private"), v.literal("group")),
    status: v.union(
      v.literal("ringing"),
      v.literal("active"),
      v.literal("ended"),
      v.literal("rejected"),
      v.literal("failed"),
    ),
    createdBy: v.id("users"),
    createdAt: v.number(),
    endedAt: v.optional(v.number()),
    screenSharingUserId: v.optional(v.id("users")),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_created", ["conversationId", "createdAt"]),

  callParticipants: defineTable({
    callId: v.id("calls"),
    userId: v.id("users"),
    joinedAt: v.optional(v.number()),
    leftAt: v.optional(v.number()),
    status: v.union(
      v.literal("invited"),
      v.literal("ringing"),
      v.literal("joined"),
      v.literal("left"),
      v.literal("rejected"),
    ),
    micEnabled: v.boolean(),
    cameraEnabled: v.boolean(),
    screenSharing: v.optional(v.boolean()),
  })
    .index("by_call", ["callId"])
    .index("by_user", ["userId"])
    .index("by_call_user", ["callId", "userId"]),

  callSignals: defineTable({
    callId: v.id("calls"),
    fromUserId: v.id("users"),
    toUserId: v.optional(v.id("users")),
    type: v.union(v.literal("offer"), v.literal("answer"), v.literal("ice-candidate")),
    payload: v.string(),
    createdAt: v.number(),
    consumed: v.boolean(),
  })
    .index("by_call", ["callId"])
    .index("by_created", ["createdAt"]),
});
