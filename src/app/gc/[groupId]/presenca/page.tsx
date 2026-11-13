import type { Metadata } from "next";
import { requireGroup } from "@/lib/dal";
import { getMeetingByDate, getRecentVisitors, getRoster } from "@/lib/queries";
import { isISODate, todayISO } from "@/lib/dates";
import { AttendanceList, type Person } from "./attendance-list";

export const metadata: Metadata = { title: "Lista de presença" };

export default async function PresencaPage({ params, searchParams }: PageProps<"/gc/[groupId]/presenca">) {
  const { groupId } = await params;
  const { data } = await searchParams;
  const { group } = await requireGroup(Number(groupId));
  const date = isISODate(data) ? data : todayISO();

  const [roster, existing, recentVisitors] = await Promise.all([
    getRoster(group.id),
    getMeetingByDate(group.id, date),
    getRecentVisitors(group.id),
  ]);

  const presentIds = new Set(existing?.people.filter((p) => !p.isVisitor).map((p) => p.memberId));
  const people: Person[] = [
    ...roster.active.map((m) => ({
      key: `m${m.id}`,
      memberId: m.id,
      name: m.name,
      kind: m.kind,
      isVisitor: false,
      present: presentIds.has(m.id),
    })),
    // Visitantes já salvos neste encontro e membros que foram removidos depois
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

  return (
    <AttendanceList
      key={date}
      groupId={group.id}
      groupName={group.name}
      date={date}
      initialPeople={people}
      alreadySaved={!!existing}
      recentVisitors={recentVisitors}
    />
  );
}
