import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  githubId: text("github_id").unique(),
  githubUsername: text("github_username"),
  encryptedGithubToken: text("encrypted_github_token"),
  username: text("username").notNull(),
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const cliTokens = pgTable("cli_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  repoFullName: text("repo_full_name").notNull(),
  displayName: text("display_name").notNull(),
  assetPattern: text("asset_pattern").notNull().default("*.jar"),
  defaultChangelog: text("default_changelog"),
  discordWebhookUrl: text("discord_webhook_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export interface TargetDependency {
  projectId: string;
  name?: string;
  dependencyType: "required" | "optional" | "incompatible" | "embedded";
  externalUrl?: string | null;
}

export const targets = pgTable("targets", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  externalProjectId: text("external_project_id").notNull(),
  encryptedToken: text("encrypted_token").notNull(),
  gameVersions: jsonb("game_versions").$type<string[]>().notNull().default([]),
  loaders: jsonb("loaders").$type<string[]>().notNull().default([]),
  dependencies: jsonb("dependencies").$type<TargetDependency[]>().notNull().default([]),
  channel: text("channel"),
  descriptionOverride: text("description_override"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export interface PublishResultItem {
  kind: string;
  externalProjectId: string;
  status: "success" | "failed";
  url?: string | null;
  error?: string | null;
}

export const publishHistory = pgTable("publish_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  releaseTag: text("release_tag").notNull(),
  assetName: text("asset_name").notNull(),
  source: text("source").notNull().default("cli"),
  results: jsonb("results").$type<PublishResultItem[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
