import {
  pgTable,
  text,
  serial,
  timestamp,
  numeric,
  boolean,
  jsonb,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: text("id").primaryKey(), // supports UUID, Telegram ID, email, etc
  email: text("email").unique(),
  telegramId: text("telegram_id").unique(), // Telegram user ID
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  subscriptions: many(subscriptions),
  signalJobs: many(signalJobs),
}));

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  // userId: text("user_id")
  //   .notNull()
  //   .references(() => users.id),
  telegramId: text("telegram_id").notNull(), // Telegram user ID
  submissionId:text("submission_id"),
  paymentStatus:text("payment_status").default("UNPAID"),
  plan:text("plan"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})


export const webhooks = pgTable("webhooks", {
  rawWebhook: jsonb("raw_webhook"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Subscriptions table
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    plan: text("plan").notNull(), // free, pro, enterprise
    status: text("status").notNull(), // active, inactive, cancelled
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("subscriptions_user_id_idx").on(table.userId),
    statusIdx: index("subscriptions_status_idx").on(table.status),
  })
);

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));

// Signal Jobs table (request tracking)
export const signalJobs = pgTable(
  "signal_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    pair: text("pair").notNull(), // BTCUSDT, ETHUSDT, etc
    holding: text("holding").notNull(), // scalp, daily, swing, auto
    risk: text("risk").notNull(), // safe, growth, aggressive
    imageBase64: text("image_base64"), // optional chart screenshot
    status: text("status").notNull(), // pending, processing, completed, failed
    error: text("error"), // error message if failed
    createdAt: timestamp("created_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    userIdIdx: index("signal_jobs_user_id_idx").on(table.userId),
    statusIdx: index("signal_jobs_status_idx").on(table.status),
    pairIdx: index("signal_jobs_pair_idx").on(table.pair),
  })
);

export const signalJobsRelations = relations(signalJobs, ({ one, many }) => ({
  user: one(users, {
    fields: [signalJobs.userId],
    references: [users.id],
  }),
  results: many(signalResults),
}));

// Signal Results table (completed trade setups)
export const signalResults = pgTable(
  "signal_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .unique()
      .references(() => signalJobs.id),
    side: text("side").notNull(), // long, short, no_trade
    entry: numeric("entry", { precision: 20, scale: 8 }),
    stopLoss: numeric("stop_loss", { precision: 20, scale: 8 }),
    takeProfits: text("take_profits").notNull(), // JSON array of numbers
    riskReward: numeric("risk_reward", { precision: 10, scale: 2 }),
    confidence: numeric("confidence", { precision: 3, scale: 2 }),
    reason: text("reason"), // Reason for decision (e.g., "Low volatility", "Poor R:R ratio")
    marketInterpretation: jsonb("market_interpretation"), // LLM output
    visionAnalysis: jsonb("vision_analysis"), // Vision model output
    metrics: jsonb("metrics"), // Market metrics (ATR, volatility, etc)
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    jobIdIdx: index("signal_results_job_id_idx").on(table.jobId),
    sideIdx: index("signal_results_side_idx").on(table.side),
  })
);

export const signalResultsRelations = relations(signalResults, ({ one }) => ({
  job: one(signalJobs, {
    fields: [signalResults.jobId],
    references: [signalJobs.id],
  }),
}));
