import type { Metadata } from "next";
import { requireGroup } from "@/lib/dal";
import { getListState } from "@/lib/queries";
import { isISODate, todayISO } from "@/lib/dates";
import { confirmAttendance, setLeaderPresence } from "@/actions/attendance";
import { AttendanceList } from "@/components/attendance-list";

export const metadata: Metadata = { title: "Lista de presença" };

export default async function PresencaPage({ params, searchParams }: PageProps<"/gc/[groupId]/presenca">) {
  const { groupId } = await params;
  const { data } = await searchParams;
  const { group } = await requireGroup(Number(groupId));
  const date = isISODate(data) ? data : todayISO();
  const { people, confirmed, recentVisitors } = await getListState(group.id, date);

  return (
    <AttendanceList
      key={date}
      mode="leader"
      savePerson={setLeaderPresence.bind(null, group.id)}
      confirm={confirmAttendance.bind(null, group.id)}
      groupName={group.name}
      date={date}
      initialPeople={people}
      confirmed={confirmed}
      recentVisitors={recentVisitors}
    />
  );
}
