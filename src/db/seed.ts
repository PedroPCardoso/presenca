/**
 * Popula o banco com o GC Berimbau, o líder Rubens e o encontro de 12/11/2026.
 * Idempotente: pode rodar mais de uma vez.
 *   npm run db:seed
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ quiet: true });

import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as s from "./schema";

const ADULTOS = [
  "Andressa", "Ariana", "Beatriz", "Betânia", "Beto", "Cátia", "Cicero", "Cristina", "Daiana",
  "Deise", "Gilmar", "Gilvan", "Grasielle", "Iolanda", "Isaías", "João", "Joziene", "Marcela",
  "Marileide", "Mirella", "Pedro", "Rafael", "Rubens", "Samuel", "Sineide", "Tadeu", "Tamara",
  "Tassiane", "Vanessa",
];
const CRIANCAS = ["Alice", "Levi", "Rute"];

// Encontro de 12/11/2026 (lista enviada no WhatsApp)
const ENCONTRO_12_11 = {
  date: "2026-11-12",
  presentes: [
    "Beatriz", "Betânia", "Cátia", "Cicero", "Cristina", "Deise", "Gilmar", "Gilvan", "Iolanda",
    "Isaías", "João", "Marcela", "Marileide", "Pedro", "Rafael", "Rubens", "Tadeu", "Tamara",
    "Vanessa", "Alice",
  ],
  visitantes: ["Cris", "Neta"],
};

async function main() {
  const password = process.env.SEED_RUBENS_PASSWORD;
  if (!password) throw new Error("Defina SEED_RUBENS_PASSWORD no .env.local");

  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(client, { schema: s });

  await db.transaction(async (tx) => {
    let [rubens] = await tx.select().from(s.users).where(eq(s.users.username, "rubens"));
    if (!rubens) {
      [rubens] = await tx
        .insert(s.users)
        .values({ username: "rubens", name: "Rubens", passwordHash: await bcrypt.hash(password, 12) })
        .returning();
    }

    let [gc] = await tx.select().from(s.groups).where(eq(s.groups.name, "GC Berimbau"));
    if (!gc) [gc] = await tx.insert(s.groups).values({ name: "GC Berimbau" }).returning();
    await tx.insert(s.groupLeaders).values({ groupId: gc.id, userId: rubens.id }).onConflictDoNothing();

    // Membros "desde sempre", para o encontro de 12/11 contar na frequência.
    const since = new Date("2026-11-01T00:00:00-03:00");
    const values = [
      ...ADULTOS.map((name) => ({ groupId: gc.id, name, kind: "adulto" as const, createdAt: since })),
      ...CRIANCAS.map((name) => ({ groupId: gc.id, name, kind: "crianca" as const, createdAt: since })),
    ];
    await tx.insert(s.members).values(values).onConflictDoNothing();
    const roster = await tx.select().from(s.members).where(eq(s.members.groupId, gc.id));

    const [existing] = await tx
      .select()
      .from(s.meetings)
      .where(and(eq(s.meetings.groupId, gc.id), eq(s.meetings.date, ENCONTRO_12_11.date)));
    if (!existing) {
      const [mt] = await tx
        .insert(s.meetings)
        .values({ groupId: gc.id, date: ENCONTRO_12_11.date, createdBy: rubens.id })
        .returning();
      await tx.insert(s.attendances).values([
        ...ENCONTRO_12_11.presentes.map((name) => {
          const m = roster.find((r) => r.name === name);
          if (!m) throw new Error(`Membro não encontrado: ${name}`);
          return { meetingId: mt.id, memberId: m.id, name: m.name, kind: m.kind, isVisitor: false };
        }),
        ...ENCONTRO_12_11.visitantes.map((name) => ({
          meetingId: mt.id, memberId: null, name, kind: "adulto" as const, isVisitor: true,
        })),
      ]);
    }
    console.log(`OK: usuário rubens, ${gc.name} (#${gc.id}), ${roster.length} membros`);
  });

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
