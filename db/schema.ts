import { sqliteTable, text, integer, index, uniqueIndex, primaryKey } from "drizzle-orm/sqlite-core";

// Only authenticated owner settings routes may write this encrypted credential.
export const aiSettings = sqliteTable("ai_settings", {
  id: text("id").primaryKey(),
  encryptedKey: text("encrypted_key").notNull(),
  model: text("model").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(), name: text("name").notNull(),
  consentAdmin: integer("consent_admin", { mode: "boolean" }).notNull().default(false),
  consentAt: integer("consent_at").notNull(), createdAt: integer("created_at").notNull(), updatedAt: integer("updated_at").notNull(),
});
export const requests = sqliteTable("requests", {
  id: text("id").notNull(), userId: text("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  content: text("content").notNull(), number: integer("number"),
  status: text("status", { enum: ["pending", "completed", "failed"] }).notNull(), lockToken: text("lock_token").notNull(),
  attempts: integer("attempts").notNull().default(1), mode: text("mode", { enum: ["demo", "ai"] }),
  createdAt: integer("created_at").notNull(), updatedAt: integer("updated_at").notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.id] }), index("requests_user_created_idx").on(table.userId, table.createdAt)]);
export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  requestId: text("request_id").notNull(), role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(), createdAt: integer("created_at").notNull(),
}, (table) => [index("messages_user_created_idx").on(table.userId, table.createdAt), uniqueIndex("messages_request_role_idx").on(table.userId, table.requestId, table.role)]);
