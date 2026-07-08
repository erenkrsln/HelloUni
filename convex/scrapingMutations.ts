import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const upsertStudiengangCache = mutation({
  args: {
    major: v.string(),
    fullContent: v.string(),
    pdfLinks: v.array(v.object({ text: v.string(), href: v.string() })),
    pdfContents: v.optional(v.array(v.object({
      text: v.string(),
      href: v.string(),
      content: v.string(),
    }))),
  },
  handler: async (ctx, { major, fullContent, pdfLinks, pdfContents }) => {
    const existing = await ctx.db
      .query("studiengangCache")
      .withIndex("by_major", (q) => q.eq("major", major))
      .first();

    const data = { fullContent, pdfLinks, pdfContents, scrapedAt: Date.now() };

    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("studiengangCache", { major, ...data });
    }
  },
});

export const upsertSemesterTermineCache = mutation({
  args: {
    label: v.string(),
    termine: v.array(v.object({
      date: v.string(),
      description: v.string(),
    })),
  },
  handler: async (ctx, { label, termine }) => {
    const existing = await ctx.db.query("semesterTermineCache").first();
    const data = { label, termine, scrapedAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("semesterTermineCache", data);
    }
  },
});

export const upsertMensaCache = mutation({
  args: {
    meals: v.array(v.object({ name: v.string(), price: v.string() })),
  },
  handler: async (ctx, { meals }) => {
    const existing = await ctx.db.query("mensaCache").first();

    if (existing) {
      await ctx.db.patch(existing._id, { meals, scrapedAt: Date.now() });
    } else {
      await ctx.db.insert("mensaCache", { meals, scrapedAt: Date.now() });
    }
  },
});

export const upsertSpoCache = mutation({
  args: {
    sourceId: v.string(),
    title: v.string(),
    major: v.string(),
    documentUrl: v.string(),
    sourcePageUrl: v.string(),
    content: v.string(),
  },
  handler: async (ctx, { sourceId, title, major, documentUrl, sourcePageUrl, content }) => {
    const existing = await ctx.db
      .query("spoCache")
      .withIndex("by_source_id", (q) => q.eq("sourceId", sourceId))
      .first();

    const data = {
      title,
      major,
      documentUrl,
      sourcePageUrl,
      content,
      scrapedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("spoCache", { sourceId, ...data });
    }
  },
});
