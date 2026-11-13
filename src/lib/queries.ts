import "server-only";
import { cache } from "react";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { attendances, meetings, members } from "@/db/schema";
import { requireGroup } from "./dal";
import { sortByName } from "./names";
import type { MeetingRecord } from "./stats";
import { addDays, todayISO } from "./dates";

export const getRoster = cache(async (groupId: number) => {
  await requireGroup(groupId);
  const rows = await db
    .select()
    .from(members)
    .where(eq(members.groupId, groupId))
    .orderBy(asc(members.name));
  return {
    active: sortByName(rows.filter((m) => m.active)),
    inactive: sortByName(rows.filter((m) => !m.active)),
  };
});

/** Todos os encontros com as presenças, do mais antigo ao mais recente. */
export const getMeetingRecords = cache(async (groupId: number): Promise<MeetingRecord[]> => {
  await requireGroup(groupId);
  const rows = await db
    .select({
      id: meetings.id,
      date: meetings.date,
      memberId: attendances.memberId,
      name: attendances.name,
      isVisitor: attendances.isVisitor,
    })
    .from(meetings)
    .leftJoin(attendances, eq(attendances.meetingId, meetings.id))
    .where(eq(meetings.groupId, groupId))
    .orderBy(asc(meetings.date));

  const byId = new Map<number, MeetingRecord>();
  for (const r of rows) {
    let m = byId.get(r.id);
    if (!m) {
      m = { id: r.id, date: r.date, memberIds: [], visitors: [], total: 0 };
      byId.set(r.id, m);
    }
    if (r.name === null) continue;
    m.total++;
    if (r.isVisitor) m.visitors.push(r.name);
    else if (r.memberId !== null) m.memberIds.push(r.memberId);
  }
  return [...byId.values()];
});

export const getMeeting = cache(async (groupId: number, meetingId: number) => {
  await requireGroup(groupId);
  const [meeting] = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.groupId, groupId)))
    .limit(1);
  if (!meeting) return null;
  const people = await db
    .select()
    .from(attendances)
    .where(eq(attendances.meetingId, meeting.id));
  return { ...meeting, people: sortByName(people) };
});

export const getMeetingByDate = cache(async (groupId: number, date: string) => {
  await requireGroup(groupId);
  const [meeting] = await db
    .select({ id: meetings.id })
    .from(meetings)
    .where(and(eq(meetings.groupId, groupId), eq(meetings.date, date)))
    .limit(1);
  return meeting ? getMeeting(groupId, meeting.id) : null;
});

/** Visitantes dos últimos 90 dias, para sugerir na lista com um toque. */
export const getRecentVisitors = cache(async (groupId: number) => {
  await requireGroup(groupId);
  const since = addDays(todayISO(), -90);
  const rows = await db
    .select({ name: attendances.name, kind: attendances.kind, date: meetings.date })
    .from(attendances)
    .innerJoin(meetings, eq(meetings.id, attendances.meetingId))
    .where(and(eq(meetings.groupId, groupId), eq(attendances.isVisitor, true), gte(meetings.date, since)))
    .orderBy(desc(meetings.date));
  const seen = new Map<string, { name: string; kind: "adulto" | "crianca" }>();
  for (const r of rows) {
    const key = r.name.toLocaleLowerCase("pt-BR");
    if (!seen.has(key)) seen.set(key, { name: r.name, kind: r.kind });
  }
  return sortByName([...seen.values()]);
});
