import "server-only";
import { cache } from "react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { attendances, groups, meetings } from "@/db/schema";
import { requireGroup } from "./dal";
import { loadListState, loadMeeting, loadRoster } from "./list-data";
import type { MeetingRecord } from "./stats";

/** Leituras do líder: todas passam pela DAL (sessão + liderança do GC). */

export const getRoster = cache(async (groupId: number) => {
  await requireGroup(groupId);
  return loadRoster(groupId);
});

export const getMeeting = cache(async (groupId: number, meetingId: number) => {
  await requireGroup(groupId);
  return loadMeeting(groupId, meetingId);
});

export const getListState = cache(async (groupId: number, date: string) => {
  await requireGroup(groupId);
  return loadListState(groupId, date);
});

export const getShareToken = cache(async (groupId: number) => {
  await requireGroup(groupId);
  const [row] = await db.select({ token: groups.shareToken }).from(groups).where(eq(groups.id, groupId));
  return row?.token ?? null;
});

/** Todos os encontros com as presenças, do mais antigo ao mais recente. */
export const getMeetingRecords = cache(async (groupId: number): Promise<MeetingRecord[]> => {
  await requireGroup(groupId);
  const rows = await db
    .select({
      id: meetings.id,
      date: meetings.date,
      via: meetings.submittedVia,
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
      m = { id: r.id, date: r.date, via: r.via, memberIds: [], visitors: [], total: 0 };
      byId.set(r.id, m);
    }
    if (r.name === null) continue;
    m.total++;
    if (r.isVisitor) m.visitors.push(r.name);
    else if (r.memberId !== null) m.memberIds.push(r.memberId);
  }
  return [...byId.values()];
});
