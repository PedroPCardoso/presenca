import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Pencil } from "lucide-react";
import { requireGroup } from "@/lib/dal";
import { getMeeting, getRoster } from "@/lib/queries";
import { formatBR, formatLong } from "@/lib/dates";
import { btn, card } from "@/components/ui";
import { MeetingActions } from "./meeting-actions";

export const metadata: Metadata = { title: "Encontro" };

export default async function MeetingPage({
  params,
  searchParams,
}: PageProps<"/gc/[groupId]/encontros/[meetingId]">) {
  const { groupId, meetingId } = await params;
  const { salvo } = await searchParams;
  const { group } = await requireGroup(Number(groupId));
  const [meeting, roster] = await Promise.all([getMeeting(group.id, Number(meetingId)), getRoster(group.id)]);
  if (!meeting) notFound();

  const base = `/gc/${group.id}`;
  const members = meeting.people.filter((p) => !p.isVisitor);
  const adults = members.filter((p) => p.kind === "adulto");
  const kids = members.filter((p) => p.kind === "crianca");
  const visitors = meeting.people.filter((p) => p.isVisitor);
  const presentIds = new Set(members.map((p) => p.memberId));
  // Só conta como ausente quem já era membro na data do encontro.
  const absent = roster.active.filter(
    (m) => !presentIds.has(m.id) && m.createdAt.toISOString().slice(0, 10) <= meeting.date,
  );

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`${base}/encontros`} className={`${btn.ghost} -ml-3 mb-2`}>
        <ArrowLeft className="size-4" aria-hidden /> Encontros
      </Link>

      {salvo && (
        <p role="status" className="mb-4 flex items-center gap-2 rounded-xl bg-primary-soft p-3 font-medium text-primary">
          <CheckCircle2 className="size-5" aria-hidden />
          Presença confirmada e salva!
        </p>
      )}

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{formatBR(meeting.date)}</h1>
          <p className="capitalize text-muted">{formatLong(meeting.date)}</p>
        </div>
        <Link href={`${base}/presenca?data=${meeting.date}`} className={btn.secondary}>
          <Pencil className="size-4" aria-hidden /> Editar lista
        </Link>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <Count label="Presentes" value={meeting.people.length} />
        <Count label="Membros" value={members.length} />
        <Count label="Visitantes" value={visitors.length} />
      </div>

      <MeetingActions
        groupId={group.id}
        meetingId={meeting.id}
        groupName={group.name}
        date={meeting.date}
        present={meeting.people.map((p) => ({ name: p.name, kind: p.kind, isVisitor: p.isVisitor }))}
        absent={absent.map((m) => ({ name: m.name, kind: m.kind, isVisitor: false }))}
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <NameList title="Adultos" names={adults.map((p) => p.name)} />
        <NameList title="Crianças" names={kids.map((p) => p.name)} />
        <NameList title="Visitantes" names={visitors.map((p) => p.name)} tone="visitor" />
        <NameList title="Ausentes" names={absent.map((m) => m.name)} tone="muted" />
      </div>
    </div>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className={`${card} p-3 text-center`}>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

function NameList({ title, names, tone }: { title: string; names: string[]; tone?: "visitor" | "muted" }) {
  return (
    <section className={`${card} p-4`}>
      <h2 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">
        {title} ({names.length})
      </h2>
      {names.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {names.map((n) => (
            <li
              key={n}
              className={`rounded-full px-2.5 py-1 text-sm ${
                tone === "visitor"
                  ? "bg-visitor-soft text-visitor"
                  : tone === "muted"
                    ? "bg-bg text-muted"
                    : "bg-primary-soft text-primary"
              }`}
            >
              {n}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">—</p>
      )}
    </section>
  );
}
