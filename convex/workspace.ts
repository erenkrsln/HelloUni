import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, { isCompleted: args.isCompleted });
  },
});

export const createTask = mutation({
  args: {
    workspaceId: v.string(),
    title: v.string(),
    deadline: v.optional(v.string()),
    assigneeId: v.optional(v.id("users")),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("workspace_tasks", {
      workspaceId: args.workspaceId,
      title: args.title,
      deadline: args.deadline,
      assigneeId: args.assigneeId,
      createdBy: args.createdBy,
      isCompleted: false,
      createdAt: Date.now(),
    });
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
