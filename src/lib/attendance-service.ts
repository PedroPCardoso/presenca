import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { attendances, meetings, members } from "@/db/schema";
import { sameName } from "./names";
import type { ListPeople } from "./validation";

type Options = {
  groupId: number;
  date: string;
  people: ListPeople;
  userId: number | null;
  via: "lider" | "link";
};

/**
 * Grava a lista de presença de um dia (substitui se já existir).
 * Nome novo que não é visitante vira membro do GC.
 * NÃO verifica permissão: quem chama precisa ter autorizado antes.
 */
export async function persistAttendance({ groupId, date, people, userId, via }: Options) {
  return db.transaction(async (tx) => {
    const roster = await tx.select().from(members).where(eq(members.groupId, groupId));
    const rows: Omit<typeof attendances.$inferInsert, "meetingId">[] = [];
    const seenMembers = new Set<number>();
    const seenVisitors: string[] = [];

    for (const p of people) {
      if (p.isVisitor) {
        if (seenVisitors.some((v) => sameName(v, p.name))) continue;
        seenVisitors.push(p.name);
        rows.push({ memberId: null, name: p.name, kind: p.kind, isVisitor: true });
        continue;
      }

      let member = p.memberId ? roster.find((m) => m.id === p.memberId) : undefined;
      if (!member) member = roster.find((m) => sameName(m.name, p.name));
      if (!member) {
        [member] = await tx.insert(members).values({ groupId, name: p.name, kind: p.kind }).returning();
        roster.push(member);
      } else if (!member.active) {
        await tx.update(members).set({ active: true }).where(eq(members.id, member.id));
      }
      if (seenMembers.has(member.id)) continue;
      seenMembers.add(member.id);
      rows.push({ memberId: member.id, name: member.name, kind: member.kind, isVisitor: false });
    }

    const [meeting] = await tx
      .insert(meetings)
      .values({ groupId, date, createdBy: userId, submittedVia: via })
      .onConflictDoUpdate({
        target: [meetings.groupId, meetings.date],
        set: { updatedAt: sql`now()`, submittedVia: via },
      })
      .returning({ id: meetings.id });

    await tx.delete(attendances).where(eq(attendances.meetingId, meeting.id));
    if (rows.length) {
      await tx.insert(attendances).values(rows.map((r) => ({ ...r, meetingId: meeting.id })));
    }
    return meeting.id;
  });
}
