import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const personKind = pgEnum("person_kind", ["adulto", "crianca"]);

/** Quem confirmou a lista: o líder logado ou alguém pelo link público. */
export const submittedVia = pgEnum("submitted_via", ["lider", "link"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Sessões no banco: guardamos só o hash SHA-256 do token do cookie. */
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/** GC = grupo de crescimento/célula. */
export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  /** Token do link público da lista de presença (null = link desativado). */
  shareToken: text("share_token").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const groupLeaders = pgTable(
  "group_leaders",
  {
    groupId: integer("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.userId] })],
);

export const members = pgTable(
  "members",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: personKind("kind").notNull().default("adulto"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("members_group_name_uq").on(t.groupId, t.name)],
);

/** Um encontro do GC numa data. Só pode existir um por dia por GC. */
export const meetings = pgTable(
  "meetings",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    submittedVia: submittedVia("submitted_via").notNull().default("lider"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("meetings_group_date_uq").on(t.groupId, t.date)],
);

/**
 * Quem esteve presente no encontro. Guardamos o nome e o tipo como estavam
 * no dia, para o histórico não mudar se o membro for renomeado ou removido.
 * Visitantes não têm member_id.
 */
export const attendances = pgTable(
  "attendances",
  {
    id: serial("id").primaryKey(),
    meetingId: integer("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    memberId: integer("member_id").references(() => members.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    kind: personKind("kind").notNull(),
    isVisitor: boolean("is_visitor").notNull().default(false),
  },
  (t) => [
    index("attendances_meeting_idx").on(t.meetingId),
    index("attendances_member_idx").on(t.memberId),
  ],
);

export type PersonKind = (typeof personKind.enumValues)[number];
