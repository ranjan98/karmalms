/**
 * KarmaLMS database schema.
 *
 * Design notes for self-hosting companies:
 * - `users` stores NO passwords. Identity lives in your IdP (Cognito/Okta/your
 *   portal). A user row is just an external id + email + role, provisioned on
 *   first login (JIT). See src/lib/auth.
 * - Everything is scoped to an `org` so the same instance can host multiple
 *   business units if needed.
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  pgEnum,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["admin", "manager", "learner"]);

export const orgs = pgTable("orgs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  // Per-org branding overrides (colors, logo/banner keys). Shape: OrgBranding
  // in src/lib/branding.ts. Null = use the env-var defaults.
  branding: jsonb("branding"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    // Stable id from the external identity provider (sub claim, SAML nameID...).
    externalId: text("external_id").notNull(),
    email: text("email").notNull(),
    name: text("name"),
    role: userRole("role").notNull().default("learner"),
    // Optional reporting line — who this user reports to (set by an admin).
    managerId: uuid("manager_id").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
    // Department, populated by an HRIS directory sync (e.g. BambooHR).
    department: text("department"),
    // Cleared by a directory sync when someone leaves — blocks sign-in.
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    // One identity per org. JIT provisioning upserts on this.
    extIdx: uniqueIndex("users_org_external_idx").on(t.orgId, t.externalId),
  }),
);

export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => orgs.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  published: boolean("published").notNull().default(false),
  // When set, completing the course issues a certificate valid this many
  // days. Null = the course issues no certificate.
  certificateValidityDays: integer("certificate_validity_days"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const lessons = pgTable("lessons", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  // Rich-text JSON; video embeds reference objects in the storage adapter.
  content: jsonb("content"),
  position: integer("position").notNull().default(0),
  // Embedding vector (number[]) of the lesson, for the AI tutor's retrieval.
  embedding: jsonb("embedding"),
});

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  (t) => ({
    uniq: uniqueIndex("enrollments_user_course_idx").on(t.userId, t.courseId),
  }),
);

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at").notNull().defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("lesson_progress_user_lesson_idx").on(
      t.userId,
      t.lessonId,
    ),
  }),
);

/**
 * Quizzes — one optional quiz per course. A question stores its choices
 * inline as a 4-element `options` array with the index of the correct one.
 */
export const quizzes = pgTable("quizzes", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id")
    .notNull()
    .unique()
    .references(() => courses.id, { onDelete: "cascade" }),
  passingScore: integer("passing_score").notNull().default(70),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const quizQuestions = pgTable("quiz_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  quizId: uuid("quiz_id")
    .notNull()
    .references(() => quizzes.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  // Four answer choices, stored as a string[4].
  options: jsonb("options").notNull(),
  correctIndex: integer("correct_index").notNull().default(0),
  position: integer("position").notNull().default(0),
});

export const quizAttempts = pgTable("quiz_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  quizId: uuid("quiz_id")
    .notNull()
    .references(() => quizzes.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  passed: boolean("passed").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Certificates — issued when a learner completes a course whose
 * `certificateValidityDays` is set. One per (user, course); re-completion
 * after a retake issues a fresh one.
 */
export const certificates = pgTable(
  "certificates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    issuedAt: timestamp("issued_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
    // Set once a lapse reminder has been sent for this certificate.
    reminderSentAt: timestamp("reminder_sent_at"),
  },
  (t) => ({
    uniq: uniqueIndex("certificates_user_course_idx").on(
      t.userId,
      t.courseId,
    ),
  }),
);

/**
 * Outbound webhooks — an org registers URLs that receive signed event
 * payloads (course.completed, certificate.issued) so external systems can
 * integrate without forking.
 */
export const webhooks = pgTable("webhooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => orgs.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  // Used to HMAC-sign deliveries so the receiver can verify authenticity.
  secret: text("secret").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * API tokens — bearer credentials for the REST API. Only the SHA-256 hash is
 * stored; the plaintext token is shown to the admin once, at creation.
 */
export const apiTokens = pgTable("api_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => orgs.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  // 'read' or 'readwrite' — gates the write endpoints.
  scope: text("scope").notNull().default("readwrite"),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Webhook deliveries — one row per (event, webhook). Doubles as the delivery
 * log and the retry queue: failed rows are retried by a scheduled job.
 */
export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  webhookId: uuid("webhook_id")
    .notNull()
    .references(() => webhooks.id, { onDelete: "cascade" }),
  event: text("event").notNull(),
  payload: jsonb("payload").notNull(),
  succeeded: boolean("succeeded").notNull().default(false),
  attempts: integer("attempts").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
