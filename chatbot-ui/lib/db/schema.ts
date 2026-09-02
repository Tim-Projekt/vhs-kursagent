import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  integer,
  json,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  password: varchar("password", { length: 64 }),
  name: text("name"),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  isAnonymous: boolean("isAnonymous").notNull().default(false),
  // Rate-Limit-Tier für registrierte Nutzer (Gäste laufen separat über den
  // "guest"-Auth-Provider, siehe app/(auth)/auth.ts). Manuell in der DB
  // gepflegt, solange es kein Self-Service-Upgrade gibt.
  role: varchar("role", { enum: ["user", "pro", "admin"] })
    .notNull()
    .default("user"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type User = InferSelectModel<typeof user>;

export const passwordResetToken = pgTable("PasswordResetToken", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  // Es wird nur der SHA-256-Hash des Tokens gespeichert — der Klartext-Token
  // existiert ausschließlich im per E-Mail versendeten Link.
  tokenHash: varchar("tokenHash", { length: 64 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type PasswordResetToken = InferSelectModel<typeof passwordResetToken>;

export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("createdAt").notNull(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
});

export type Chat = InferSelectModel<typeof chat>;

export const message = pgTable("Message_v2", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  parts: json("parts").notNull(),
  attachments: json("attachments").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

export const vote = pgTable(
  "Vote_v2",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.chatId, table.messageId] }),
  })
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  "Document",
  {
    id: uuid("id").notNull().defaultRandom(),
    createdAt: timestamp("createdAt").notNull(),
    title: text("title").notNull(),
    content: text("content"),
    kind: varchar("text", { enum: ["text", "code", "image", "sheet"] })
      .notNull()
      .default("text"),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id, table.createdAt] }),
  })
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  "Suggestion",
  {
    id: uuid("id").notNull().defaultRandom(),
    documentId: uuid("documentId").notNull(),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    originalText: text("originalText").notNull(),
    suggestedText: text("suggestedText").notNull(),
    description: text("description"),
    isResolved: boolean("isResolved").notNull().default(false),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  })
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  "Stream",
  {
    id: uuid("id").notNull().defaultRandom(),
    chatId: uuid("chatId").notNull(),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  })
);

export type Stream = InferSelectModel<typeof stream>;

/**
 * Kurs-DB-Layer — die normalisierten Kursdaten aus vhs_pipeline/data/processed/<city>.jsonl,
 * geladen via scripts/load-courses.ts. Quelle für die öffentlichen SEO-Seiten und
 * strukturierte Filter; Pinecone bleibt für die semantische Suche.
 * `city` = City-Slug (lib/cities). `data` hält den vollständigen kanonischen Datensatz.
 */
export const vhsCourse = pgTable(
  "VhsCourse",
  {
    uid: text("uid").primaryKey().notNull(),
    city: text("city").notNull(),
    sourceId: text("sourceId").notNull(),
    guid: text("guid").notNull(),
    namespace: text("namespace").notNull(),

    courseNumber: text("courseNumber"),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    description: text("description"),

    dvvCode: text("dvvCode"),
    dvvBereich: text("dvvBereich"),
    dvvLabel: text("dvvLabel"),
    eventType: text("eventType"),
    level: text("level"),
    courseFormat: text("courseFormat").notNull().default("praesenz"),
    online: boolean("online").notNull().default(false),

    keywords: jsonb("keywords").$type<string[]>().notNull().default([]),

    startDate: text("startDate"),
    endDate: text("endDate"),
    sessionCount: integer("sessionCount"),
    weekdays: jsonb("weekdays").$type<string[]>().notNull().default([]),
    timeStart: text("timeStart"),
    timeEnd: text("timeEnd"),

    region: text("region"),
    postalCode: text("postalCode"),
    venueName: text("venueName"),
    lat: real("lat"),
    lon: real("lon"),

    priceAmount: real("priceAmount"),
    priceReduced: real("priceReduced"),
    priceFree: boolean("priceFree").notNull().default(false),
    status: text("status").notNull().default("unknown"),

    bookingUrl: text("bookingUrl"),
    semester: text("semester"),
    contentHash: text("contentHash").notNull(),
    data: jsonb("data").notNull(),

    sourceUpdatedAt: text("sourceUpdatedAt"),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    cityIdx: index("VhsCourse_city_idx").on(table.city),
    cityBereichIdx: index("VhsCourse_city_bereich_idx").on(
      table.city,
      table.dvvBereich
    ),
    cityRegionIdx: index("VhsCourse_city_region_idx").on(
      table.city,
      table.region
    ),
    cityFormatIdx: index("VhsCourse_city_format_idx").on(
      table.city,
      table.courseFormat
    ),
    cityGuidIdx: index("VhsCourse_city_guid_idx").on(table.city, table.guid),
    startDateIdx: index("VhsCourse_startDate_idx").on(table.startDate),
  })
);

export type VhsCourse = InferSelectModel<typeof vhsCourse>;
