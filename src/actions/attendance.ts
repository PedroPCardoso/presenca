"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { attendances, meetings, members } from "@/db/schema";
import { canAccessGroup } from "@/lib/dal";
import { sameName } from "@/lib/names";
import { attendanceInputSchema, type AttendanceInput } from "@/lib/validation";

export type SaveResult = { error: string } | undefined;

/**
 * Confirma a lista de presença de um dia. Se já existir encontro nessa data,
 * ele é substituído (permite corrigir a lista depois).
 * Nome novo que não é visitante vira membro do GC automaticamente.
 */
export async function saveAttendance(raw: AttendanceInput): Promise<SaveResult> {
  const parsed = attendanceInputSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const { groupId, date, people } = parsed.data;

  const access = await canAccessGroup(groupId);
  if (!access) return { error: "Sem permissão para este GC" };
  if (people.length === 0) return { error: "Marque pelo menos uma pessoa" };

  const meetingId = await db.transaction(async (tx) => {
    const roster = await tx.select().from(members).where(eq(members.groupId, groupId));
    const rows: (typeof attendances.$inferInsert)[] = [];
    const seenMembers = new Set<number>();
    const seenVisitors: string[] = [];

    for (const p of people) {
      if (p.isVisitor) {
        if (seenVisitors.some((v) => sameName(v, p.name))) continue;
        seenVisitors.push(p.name);
        rows.push({ meetingId: 0, memberId: null, name: p.name, kind: p.kind, isVisitor: true });
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
      rows.push({ meetingId: 0, memberId: member.id, name: member.name, kind: member.kind, isVisitor: false });
    }

    const [meeting] = await tx
      .insert(meetings)
      .values({ groupId, date, createdBy: access.userId })
      .onConflictDoUpdate({
        target: [meetings.groupId, meetings.date],
        set: { updatedAt: sql`now()` },
      })
      .returning({ id: meetings.id });

    await tx.delete(attendances).where(eq(attendances.meetingId, meeting.id));
    await tx.insert(attendances).values(rows.map((r) => ({ ...r, meetingId: meeting.id })));
    return meeting.id;
  });

  revalidatePath(`/gc/${groupId}`, "layout");
  redirect(`/gc/${groupId}/encontros/${meetingId}?salvo=1`);
}

export async function deleteMeeting(groupId: number, meetingId: number) {
  const access = await canAccessGroup(groupId);
  if (!access) return;
  await db.delete(meetings).where(and(eq(meetings.id, meetingId), eq(meetings.groupId, groupId)));
  revalidatePath(`/gc/${groupId}`, "layout");
  redirect(`/gc/${groupId}`);
}
