import "server-only";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { attendances, meetings, members } from "@/db/schema";
import { addDays, todayISO } from "./dates";
import { sortByName } from "./names";

/**
 * Leituras SEM checagem de permissão. Só podem ser chamadas depois de
 * autorizar (DAL do líder em queries.ts ou token em public-list.ts).
 */

export async function loadRoster(groupId: number) {
  const rows = await db.select().from(members).where(eq(members.groupId, groupId)).orderBy(asc(members.name));
  return {
    active: sortByName(rows.filter((m) => m.active)),
    inactive: sortByName(rows.filter((m) => !m.active)),
  };
}

export async function loadMeeting(groupId: number, meetingId: number) {
  const [meeting] = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.groupId, groupId)))
    .limit(1);
  if (!meeting) return null;
  const people = await db.select().from(attendances).where(eq(attendances.meetingId, meeting.id));
  return { ...meeting, people: sortByName(people) };
}

export async function loadMeetingByDate(groupId: number, date: string) {
  const [meeting] = await db
    .select({ id: meetings.id })
    .from(meetings)
    .where(and(eq(meetings.groupId, groupId), eq(meetings.date, date)))
    .limit(1);
  return meeting ? loadMeeting(groupId, meeting.id) : null;
}

/** Visitantes dos últimos 90 dias, para sugerir na lista com um toque. */
export async function loadRecentVisitors(groupId: number) {
  const since = addDays(todayISO(), -90);
  const rows = await db
    .select({ name: attendances.name, kind: attendances.kind })
    .from(attendances)
    .innerJoin(meetings, eq(meetings.id, attendances.meetingId))
    .where(
      and(
        eq(meetings.groupId, groupId),
        eq(meetings.confirmed, true),
        eq(attendances.isVisitor, true),
        gte(meetings.date, since),
      ),
    )
    .orderBy(desc(meetings.date));
  const seen = new Map<string, { name: string; kind: "adulto" | "crianca" }>();
  for (const r of rows) {
    const key = r.name.toLocaleLowerCase("pt-BR");
    if (!seen.has(key)) seen.set(key, { name: r.name, kind: r.kind });
  }
  return sortByName([...seen.values()]);
}

export type ListPerson = {
  key: string;
  memberId: number | null;
  name: string;
  kind: "adulto" | "crianca";
  isVisitor: boolean;
  present: boolean;
  /** Não é da lista fixa (visitante ou alguém que saiu do GC) — pode ser removido. */
  added?: boolean;
};

/** Monta a lista inicial: membros ativos + quem já estava salvo no encontro da data. */
export async function loadListState(groupId: number, date: string) {
  const [roster, existing, recentVisitors] = await Promise.all([
    loadRoster(groupId),
    loadMeetingByDate(groupId, date),
    loadRecentVisitors(groupId),
  ]);
  const presentIds = new Set(existing?.people.filter((p) => !p.isVisitor).map((p) => p.memberId));
  const people: ListPerson[] = [
    ...roster.active.map((m) => ({
      key: `m${m.id}`,
      memberId: m.id,
      name: m.name,
      kind: m.kind,
      isVisitor: false,
      present: presentIds.has(m.id),
    })),
    ...(existing?.people ?? [])
      .filter((p) => p.isVisitor || !roster.active.some((m) => m.id === p.memberId))
      .map((p) => ({
        key: `a${p.id}`,
        memberId: p.isVisitor ? null : p.memberId,
        name: p.name,
        kind: p.kind,
        isVisitor: p.isVisitor,
        present: true,
        added: true,
      })),
  ];
  return { people, confirmed: existing?.confirmed ?? false, recentVisitors };
}
