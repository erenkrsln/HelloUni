import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ------------------------------
// EVENT CHATS
// ------------------------------

export const getOrCreateEventChat = mutation({
  args: {
    eventId: v.id("events"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    if (event.conversationId) {
      return event.conversationId;
    }

    // Create a new conversation for this event
    const conversationId = await ctx.db.insert("conversations", {
      name: `Event: ${event.title}`,
      isGroup: true,
      participants: [args.userId], 
      creatorId: args.userId,
      adminIds: [args.userId],
      updatedAt: Date.now(),
    });

    // Link it back to the event
    await ctx.db.patch(args.eventId, {
      conversationId: conversationId,
    });

    return conversationId;
  },
});

// ------------------------------
// TASKS
// ------------------------------

export const listPendingTasksByUser = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get all tasks assigned to the user that are NOT completed
    const tasks = await ctx.db
      .query("workspace_tasks")
      .withIndex("by_assignee", (q) => q.eq("assigneeId", args.userId))
      .filter((q) => q.eq(q.field("isCompleted"), false))
      .collect();

    return tasks;
  },
});

export const toggleTaskCompletion = mutation({
  args: {
    taskId: v.id("workspace_tasks"),
    isCompleted: v.boolean(),
    actorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    // Basic permission: allow if actor is assignee, or workspace group owner/admin/member
    const workspaceId = task.workspaceId as string;
    let allowed = false;
    if (task.assigneeId && args.actorId === task.assigneeId) allowed = true;

    // If this is a group workspace, verify actor is part of the conversation or admin/owner
    if (!allowed && typeof workspaceId === "string" && workspaceId.startsWith("group_")) {
      const convId = workspaceId.replace("group_", "") as any;
      const group = await ctx.db
        .query("workspace_groups")
        .withIndex("by_conversation", (q) => q.eq("conversationId", convId))
        .first();
      const conv: any = await ctx.db.get(convId);
      const participants = conv?.participants || [];
      if (group) {
        if (group.ownerId === args.actorId) allowed = true;
        if ((group.adminIds || []).includes(args.actorId)) allowed = true;
      }
      if (participants.includes(args.actorId)) allowed = true;
    }

    if (!allowed) throw new Error("Not authorized to modify this task");

    await ctx.db.patch(args.taskId, { isCompleted: args.isCompleted });
  },
});

export const createTask = mutation({
  args: {
    workspaceId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    deadline: v.optional(v.string()),
    assigneeId: v.optional(v.id("users")),
    createdBy: v.id("users"),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
    status: v.optional(v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done"))),
  },
  handler: async (ctx, args) => {
    const taskId = await ctx.db.insert("workspace_tasks", {
      workspaceId: args.workspaceId,
      title: args.title,
      description: args.description,
      deadline: args.deadline,
      assigneeId: args.assigneeId,
      createdBy: args.createdBy,
      priority: args.priority || "medium",
      visibility: args.visibility || "public",
      status: args.status || "todo",
      isCompleted: args.status === "done",
      createdAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("workspace_activity", {
      workspaceId: args.workspaceId,
      actorId: args.createdBy,
      type: "task_created",
      data: { taskId, title: args.title },
      createdAt: Date.now(),
    });

    return taskId;
  },
});

// Update task status (move between todo / in_progress / done)
export const updateTaskStatus = mutation({
  args: {
    taskId: v.id("workspace_tasks"),
    status: v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    // Permission: allow if the userId is assignee or group member/admin/owner
    let allowed = false;
    if (task.assigneeId && args.userId === task.assigneeId) allowed = true;
    const workspaceId = task.workspaceId as string;
    if (!allowed && typeof workspaceId === "string" && workspaceId.startsWith("group_")) {
      const convId = workspaceId.replace("group_", "") as any;
      const group = await ctx.db
        .query("workspace_groups")
        .withIndex("by_conversation", (q) => q.eq("conversationId", convId))
        .first();
      const conv: any = await ctx.db.get(convId);
      const participants = conv?.participants || [];
      if (group) {
        if (group.ownerId === args.userId) allowed = true;
        if ((group.adminIds || []).includes(args.userId)) allowed = true;
      }
      if (participants.includes(args.userId)) allowed = true;
    }

    if (!allowed) throw new Error("Not authorized to change task status");

    await ctx.db.patch(args.taskId, {
      status: args.status,
      isCompleted: args.status === "done",
    });

    // Log activity
    await ctx.db.insert("workspace_activity", {
      workspaceId: task.workspaceId,
      actorId: args.userId,
      type: args.status === "done" ? "task_completed" : "task_updated",
      data: { taskId: args.taskId, status: args.status },
      createdAt: Date.now(),
    });
  },
});

// Update arbitrary task fields (title, deadline, assignee)
export const updateTask = mutation({
  args: {
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
    actorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    // Permission: allow if the actor is assignee or workspace member/admin/owner
    let allowed = false;
    if (task.assigneeId && args.actorId === task.assigneeId) allowed = true;
    const workspaceId = task.workspaceId as string;
    if (!allowed && typeof workspaceId === "string" && workspaceId.startsWith("group_")) {
      const convId = workspaceId.replace("group_", "") as any;
      const group = await ctx.db
        .query("workspace_groups")
        .withIndex("by_conversation", (q) => q.eq("conversationId", convId))
        .first();
      const conv: any = await ctx.db.get(convId);
      const participants = conv?.participants || [];
      if (group) {
        if (group.ownerId === args.actorId) allowed = true;
        if ((group.adminIds || []).includes(args.actorId)) allowed = true;
      }
      if (participants.includes(args.actorId)) allowed = true;
    }

    if (!allowed) throw new Error("Not authorized to update this task");

    const patchData: any = { ...args.patch };
    if (args.patch.status !== undefined) {
      patchData.isCompleted = args.patch.status === "done";
    }
    await ctx.db.patch(args.taskId, patchData);

    await ctx.db.insert("workspace_activity", {
      workspaceId: task.workspaceId,
      actorId: args.actorId,
      type: "task_updated",
      data: { taskId: args.taskId, patch: args.patch },
      createdAt: Date.now(),
    });
  },
});

// Delete a task (owner/assignee/group permission)
export const deleteTask = mutation({
  args: { taskId: v.id("workspace_tasks"), actorId: v.id("users") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    // Permission check: assignee or group owner/admin/member
    let allowed = false;
    if (task.assigneeId && args.actorId === task.assigneeId) allowed = true;
    const workspaceId = task.workspaceId as string;
    if (!allowed && typeof workspaceId === "string" && workspaceId.startsWith("group_")) {
      const convId = workspaceId.replace("group_", "") as any;
      const group = await ctx.db
        .query("workspace_groups")
        .withIndex("by_conversation", (q) => q.eq("conversationId", convId))
        .first();
      const conv: any = await ctx.db.get(convId);
      const participants = conv?.participants || [];
      if (group) {
        if (group.ownerId === args.actorId) allowed = true;
        if ((group.adminIds || []).includes(args.actorId)) allowed = true;
      }
      if (participants.includes(args.actorId)) allowed = true;
    }

    if (!allowed) throw new Error("Not authorized to delete this task");

    await ctx.db.delete(args.taskId);

    await ctx.db.insert("workspace_activity", {
      workspaceId: task.workspaceId,
      actorId: args.actorId,
      type: "task_deleted",
      data: { taskId: args.taskId, title: task.title },
      createdAt: Date.now(),
    });
  },
});

// List tasks for a group/workspace
export const listGroupTasks = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workspace_tasks")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .collect();
  },
});

// Activity listing
export const listActivity = query({
  args: { workspaceId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    return await ctx.db
      .query("workspace_activity")
      .withIndex("by_workspace_created", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .take(limit);
  },
});

// Create a workspace group (creates conversation + workspace_groups entry)
export const createWorkspaceGroup = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    ownerId: v.id("users"),
    participants: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const conversationId = await ctx.db.insert("conversations", {
      name: args.title,
      isGroup: true,
      participants: args.participants,
      creatorId: args.ownerId,
      adminIds: [args.ownerId],
      updatedAt: Date.now(),
    });

    await ctx.db.insert("workspace_groups", {
      conversationId,
      title: args.title,
      description: args.description,
      ownerId: args.ownerId,
      adminIds: [args.ownerId],
      createdAt: Date.now(),
      visibility: "private",
    });

    // Log activity
    await ctx.db.insert("workspace_activity", {
      workspaceId: conversationId,
      actorId: args.ownerId,
      type: "member_joined",
      data: { userId: args.ownerId },
      createdAt: Date.now(),
    });

    return conversationId;
  },
});

// Member management: add member (Owner/Admin only)
export const addMember = mutation({
  args: { conversationId: v.id("conversations"), userId: v.id("users"), actorId: v.id("users") },
  handler: async (ctx, args) => {
    const group = await ctx.db
      .query("workspace_groups")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .first();
    if (!group) throw new Error("Group not found");

    // Check actor permission
    if (group.ownerId !== args.actorId && !(group.adminIds || []).includes(args.actorId)) {
      throw new Error("Not authorized to invite members");
    }

    const conv = await ctx.db.get(args.conversationId);
    if (!conv) throw new Error("Conversation not found");

    const participants = conv.participants || [];
    if (!participants.includes(args.userId)) {
      await ctx.db.patch(args.conversationId, { participants: [...participants, args.userId] });
    }

    // Log activity
    await ctx.db.insert("workspace_activity", {
      workspaceId: args.conversationId,
      actorId: args.actorId,
      type: "member_joined",
      data: { userId: args.userId },
      createdAt: Date.now(),
    });
  },
});

// Remove member (Owner/Admin only)
export const removeMember = mutation({
  args: { conversationId: v.id("conversations"), userId: v.id("users"), actorId: v.id("users") },
  handler: async (ctx, args) => {
    const group = await ctx.db
      .query("workspace_groups")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .first();
    if (!group) throw new Error("Group not found");

    if (group.ownerId !== args.actorId && !(group.adminIds || []).includes(args.actorId)) {
      throw new Error("Not authorized to remove members");
    }

    const conv = await ctx.db.get(args.conversationId);
    if (!conv) throw new Error("Conversation not found");

    const participants = conv.participants || [];
    if (participants.includes(args.userId)) {
      await ctx.db.patch(args.conversationId, { participants: participants.filter((p: any) => p !== args.userId) });
    }

    await ctx.db.insert("workspace_activity", {
      workspaceId: args.conversationId,
      actorId: args.actorId,
      type: "member_left",
      data: { userId: args.userId },
      createdAt: Date.now(),
    });
  },
});

// Promote to admin (Owner only)
export const promoteToAdmin = mutation({
  args: { conversationId: v.id("conversations"), userId: v.id("users"), actorId: v.id("users") },
  handler: async (ctx, args) => {
    const group = await ctx.db
      .query("workspace_groups")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .first();
    if (!group) throw new Error("Group not found");
    if (group.ownerId !== args.actorId) throw new Error("Only owner can promote");

    const admins = group.adminIds || [];
    if (!admins.includes(args.userId)) {
      await ctx.db.patch(group._id, { adminIds: [...admins, args.userId] });
    }
  },
});

// Demote admin (Owner only)
export const demoteAdmin = mutation({
  args: { conversationId: v.id("conversations"), userId: v.id("users"), actorId: v.id("users") },
  handler: async (ctx, args) => {
    const group = await ctx.db
      .query("workspace_groups")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .first();
    if (!group) throw new Error("Group not found");
    if (group.ownerId !== args.actorId) throw new Error("Only owner can demote");

    const admins = group.adminIds || [];
    if (admins.includes(args.userId)) {
      await ctx.db.patch(group._id, { adminIds: admins.filter((a: any) => a !== args.userId) });
    }
  },
});

// List members with roles
export const listGroupMembers = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const conv = await ctx.db.get(args.conversationId);
    if (!conv) return [];
    const group = await ctx.db
      .query("workspace_groups")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .first();

    const participants = conv.participants || [];
    return await Promise.all(participants.map(async (p: any) => {
      const user = await ctx.db.get(p);
      const role = group ? (group.ownerId === p ? "owner" : (group.adminIds || []).includes(p) ? "admin" : "member") : "member";
      return { user, role };
    }));
  },
});

// ------------------------------
// FILES
// ------------------------------

export const listFilesByWorkspace = query({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, args) => {
    const files = await ctx.db
      .query("workspace_files")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .collect();

    // Map files to get their URLs
    return await Promise.all(
      files.map(async (file) => ({
        ...file,
        url: await ctx.storage.getUrl(file.storageId),
      }))
    );
  },
});

export const saveFileMetadata = mutation({
  args: {
    workspaceId: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    uploaderId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // If workspace is a group, validate uploader is a member/admin
    if (typeof args.workspaceId === "string" && args.workspaceId.startsWith("group_")) {
      const convId = args.workspaceId.replace("group_", "") as any;
      const conv: any = await ctx.db.get(convId);
      if (!conv) throw new Error("Conversation not found");
      const participants = conv.participants || [];
      const group = await ctx.db
        .query("workspace_groups")
        .withIndex("by_conversation", (q) => q.eq("conversationId", convId))
        .first();
      const isAllowed = participants.includes(args.uploaderId) || (group && (group.ownerId === args.uploaderId || (group.adminIds || []).includes(args.uploaderId)));
      if (!isAllowed) throw new Error("Not authorized to upload files to this workspace");
    }

    return await ctx.db.insert("workspace_files", {
      workspaceId: args.workspaceId,
      storageId: args.storageId,
      fileName: args.fileName,
      fileType: args.fileType,
      uploaderId: args.uploaderId,
      createdAt: Date.now(),
    });
  },
});

export const deleteFile = mutation({
  args: {
    fileId: v.id("workspace_files"),
    userId: v.id("users"),
    workspaceId: v.string(),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) throw new Error("File not found");

    // Check if user is the uploader or an admin/owner of the group
    if (file.uploaderId !== args.userId) {
      // If workspace is a group, check if user is admin/owner
      if (args.workspaceId.startsWith("group_")) {
        const convId = args.workspaceId.replace("group_", "") as any;
        const group = await ctx.db
          .query("workspace_groups")
          .withIndex("by_conversation", (q) => q.eq("conversationId", convId))
          .first();
        
        const isAdmin = group && (group.ownerId === args.userId || (group.adminIds || []).includes(args.userId));
        if (!isAdmin) throw new Error("Unauthorized to delete this file");
      } else {
        throw new Error("Unauthorized to delete this file");
      }
    }

    await ctx.db.delete(args.fileId);
  },
});

// ------------------------------
// POLLS
// ------------------------------

export const listPollsByWorkspace = query({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, args) => {
    const polls = await ctx.db
      .query("workspace_polls")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .collect();

    // Fetch votes for each poll
    const pollsWithVotes = await Promise.all(polls.map(async (poll) => {
      const votes = await ctx.db
        .query("workspace_poll_votes")
        .withIndex("by_poll", (q) => q.eq("pollId", poll._id))
        .collect();
      return { ...poll, votes };
    }));

    return pollsWithVotes;
  },
});

// List events attached to a workspace/group
export const listEventsByWorkspace = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("events")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .collect();
  },
});

export const createPoll = mutation({
  args: {
    workspaceId: v.string(),
    question: v.string(),
    options: v.array(v.string()),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("workspace_polls", {
      workspaceId: args.workspaceId,
      question: args.question,
      options: args.options,
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });
  },
});

// Generate an upload URL for Convex storage (used by workspace file uploads)
export const generateUploadUrl = mutation({
  args: {
    conversationId: v.optional(v.id("conversations")),
    actorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // If conversationId is provided, ensure actor is part of the conversation
    if (args.conversationId) {
      const convId = args.conversationId as any;
      const conv: any = await ctx.db.get(convId);
      if (!conv) throw new Error("Conversation not found");
      const participants = conv.participants || [];
      // allow if participant
      if (!participants.includes(args.actorId)) {
        // also allow workspace_groups owner/admins
        const group = await ctx.db
          .query("workspace_groups")
          .withIndex("by_conversation", (q) => q.eq("conversationId", convId))
          .first();
        if (!group || (group.ownerId !== args.actorId && !(group.adminIds || []).includes(args.actorId))) {
          throw new Error("Not authorized to upload files to this workspace");
        }
      }
    }

    // Generate upload URL from Convex storage and normalize
    const result: any = await ctx.storage.generateUploadUrl();
    if (typeof result === "string") return result;
    if (result?.url) return result.url;
    if (result?.uploadUrl) return result.uploadUrl;
    return JSON.stringify(result);
  },
});

export const votePoll = mutation({
  args: {
    pollId: v.id("workspace_polls"),
    userId: v.id("users"),
    optionIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const existingVote = await ctx.db
      .query("workspace_poll_votes")
      .withIndex("by_poll_user", (q) => q.eq("pollId", args.pollId).eq("userId", args.userId))
      .first();

    if (existingVote) {
      if (existingVote.optionIndex === args.optionIndex) {
        await ctx.db.delete(existingVote._id);
        return;
      } else {
        await ctx.db.patch(existingVote._id, { optionIndex: args.optionIndex });
        return;
      }
    }

    await ctx.db.insert("workspace_poll_votes", {
      pollId: args.pollId,
      userId: args.userId,
      optionIndex: args.optionIndex,
      createdAt: Date.now(),
    });
  },
});

export const updatePoll = mutation({
  args: {
    pollId: v.id("workspace_polls"),
    userId: v.id("users"),
    question: v.optional(v.string()),
    options: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const poll = await ctx.db.get(args.pollId);
    if (!poll) throw new Error("Poll not found");

    // Only the creator can edit
    if (poll.createdBy !== args.userId) {
      throw new Error("Unauthorized: Only the poll creator can edit");
    }

    // Check if there are votes - if so, only allow question edit, not options
    const existingVotes = await ctx.db
      .query("workspace_poll_votes")
      .withIndex("by_poll", (q) => q.eq("pollId", args.pollId))
      .collect();

    if (existingVotes.length > 0 && args.options !== undefined) {
      throw new Error("Cannot edit poll options after voting has started");
    }

    await ctx.db.patch(args.pollId, {
      ...(args.question !== undefined && { question: args.question }),
      ...(args.options !== undefined && { options: args.options }),
    });
  },
});

export const deletePoll = mutation({
  args: {
    pollId: v.id("workspace_polls"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const poll = await ctx.db.get(args.pollId);
    if (!poll) throw new Error("Poll not found");

    // Only the creator can delete
    if (poll.createdBy !== args.userId) {
      throw new Error("Unauthorized: Only the poll creator can delete");
    }

    // Delete all votes for this poll
    const votes = await ctx.db
      .query("workspace_poll_votes")
      .withIndex("by_poll", (q) => q.eq("pollId", args.pollId))
      .collect();

    for (const vote of votes) {
      await ctx.db.delete(vote._id);
    }

    // Delete the poll itself
    await ctx.db.delete(args.pollId);
  },
});
