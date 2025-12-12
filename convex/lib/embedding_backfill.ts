import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";

type BackfillTable =
  | "memories"
  | "lore"
  | "npcs"
  | "locations"
  | "items"
  | "quests"
  | "monsters";

function buildEmbeddingText(table: BackfillTable, doc: any): string {
  switch (table) {
    case "memories":
      return String(doc.content || "");
    case "lore":
      return [doc.title, doc.content].filter(Boolean).join("\n\n");
    case "npcs":
      return [
        doc.name ? `Name: ${doc.name}` : null,
        doc.role ? `Role: ${doc.role}` : null,
        doc.attitude ? `Attitude: ${doc.attitude}` : null,
        doc.description ? `Description: ${doc.description}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    case "locations":
      return [
        doc.name ? `Name: ${doc.name}` : null,
        doc.type ? `Type: ${doc.type}` : null,
        doc.environment ? `Environment: ${doc.environment}` : null,
        doc.description ? `Description: ${doc.description}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    case "items":
      return [
        doc.name ? `Name: ${doc.name}` : null,
        doc.type ? `Type: ${doc.type}` : null,
        doc.rarity ? `Rarity: ${doc.rarity}` : null,
        doc.category ? `Category: ${doc.category}` : null,
        doc.effects ? `Effects: ${doc.effects}` : null,
        doc.description ? `Description: ${doc.description}` : null,
        doc.lore ? `Lore: ${doc.lore}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    case "quests": {
      let objectives = "";
      try {
        if (Array.isArray(doc.objectives)) {
          objectives = doc.objectives
            .map((o: any) => `- ${o.description || ""} (${o.type || ""})`)
            .join("\n");
        }
      } catch {
        objectives = "";
      }
      return [
        doc.title ? `Title: ${doc.title}` : null,
        doc.description ? `Description: ${doc.description}` : null,
        objectives ? `Objectives:\n${objectives}` : null,
      ]
        .filter(Boolean)
        .join("\n\n");
    }
    case "monsters":
      return [
        doc.name ? `Name: ${doc.name}` : null,
        doc.description ? `Description: ${doc.description}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    default:
      return JSON.stringify(doc);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const internalApi: any = internal;

export const getBackfillBatch = internalQuery({
  args: {
    campaignId: v.id("campaigns"),
    table: v.union(
      v.literal("memories"),
      v.literal("lore"),
      v.literal("npcs"),
      v.literal("locations"),
      v.literal("items"),
      v.literal("quests"),
      v.literal("monsters")
    ),
    batchSize: v.number(),
    afterCreationTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Query a stable batch by _creationTime within campaign.
    // Most tables in this codebase have a `by_campaign` index.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = ctx.db
      .query(args.table as any)
      .withIndex("by_campaign", (qq: any) => qq.eq("campaignId", args.campaignId))
      .order("asc");

    if (args.afterCreationTime !== undefined) {
      q = q.filter((qq: any) => qq.gt(qq.field("_creationTime"), args.afterCreationTime));
    }

    const docs = await q.take(args.batchSize);

    const rows = docs
      .map((doc: any) => {
        const text = buildEmbeddingText(args.table as BackfillTable, doc).trim();
        return text
          ? { id: doc._id, creationTime: doc._creationTime as number, text }
          : null;
      })
      .filter(Boolean) as Array<{ id: any; creationTime: number; text: string }>;

    return {
      rows,
      lastCreationTime: docs.length > 0 ? (docs[docs.length - 1]._creationTime as number) : null,
      done: docs.length < args.batchSize,
    };
  },
});

export const patchEmbedding = internalMutation({
  args: {
    table: v.union(
      v.literal("memories"),
      v.literal("lore"),
      v.literal("npcs"),
      v.literal("locations"),
      v.literal("items"),
      v.literal("quests"),
      v.literal("monsters")
    ),
    id: v.union(
      v.id("memories"),
      v.id("lore"),
      v.id("npcs"),
      v.id("locations"),
      v.id("items"),
      v.id("quests"),
      v.id("monsters")
    ),
    embedding: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await ctx.db.patch(args.id as any, { embedding: args.embedding });
  },
});

/**
 * Backfill embeddings for a single campaign, in batches.
 *
 * Why: after switching providers, old embeddings are in a different vector space,
 * so vectorSearch results become garbage unless we recompute.
 *
 * This action can be invoked repeatedly; it will keep scheduling itself until done.
 */
export const backfillEmbeddingsForCampaign = internalAction({
  args: {
    campaignId: v.id("campaigns"),
    table: v.union(
      v.literal("memories"),
      v.literal("lore"),
      v.literal("npcs"),
      v.literal("locations"),
      v.literal("items"),
      v.literal("quests"),
      v.literal("monsters")
    ),
    batchSize: v.optional(v.number()),
    afterCreationTime: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const batchSize = Math.min(Math.max(args.batchSize ?? 20, 1), 50);
    const dryRun = args.dryRun ?? false;

    const batch = await ctx.runQuery(internalApi["lib/embedding_backfill"].getBackfillBatch, {
      campaignId: args.campaignId,
      table: args.table,
      batchSize,
      afterCreationTime: args.afterCreationTime,
    });

    let updated = 0;
    for (const row of batch.rows) {
      const embedding = await ctx.runAction((api as any).lib.embeddings.generateEmbedding, {
        text: row.text,
      });

      if (!dryRun) {
        await ctx.runMutation(internalApi["lib/embedding_backfill"].patchEmbedding, {
          table: args.table,
          id: row.id,
          embedding,
        });
      }

      updated += 1;
    }

    const done = batch.done;

    if (!done) {
      await ctx.scheduler.runAfter(0, internalApi["lib/embedding_backfill"].backfillEmbeddingsForCampaign, {
        campaignId: args.campaignId,
        table: args.table,
        batchSize,
        afterCreationTime: batch.lastCreationTime ?? undefined,
        dryRun,
      });
    }

    return {
      table: args.table,
      campaignId: args.campaignId,
      batchSize,
      processed: batch.rows.length,
      updated,
      done,
      nextAfterCreationTime: done ? null : batch.lastCreationTime ?? null,
      dryRun,
    };
  },
});

/**
 * Convenience action: schedules backfill across all vector-indexed tables.
 */
export const scheduleFullEmbeddingBackfill = internalAction({
  args: {
    campaignId: v.id("campaigns"),
    batchSize: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const tables: BackfillTable[] = [
      "memories",
      "lore",
      "npcs",
      "locations",
      "items",
      "quests",
      "monsters",
    ];

    for (const table of tables) {
      await ctx.scheduler.runAfter(0, internalApi["lib/embedding_backfill"].backfillEmbeddingsForCampaign, {
        campaignId: args.campaignId,
        table,
        batchSize: args.batchSize,
        dryRun: args.dryRun,
      });
    }

    return { scheduled: true, tables };
  },
});

