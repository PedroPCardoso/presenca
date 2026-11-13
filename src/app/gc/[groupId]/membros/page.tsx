import type { Metadata } from "next";
import { requireGroup } from "@/lib/dal";
import { getRoster } from "@/lib/queries";
import { card } from "@/components/ui";
import Link from "next/link";
import { PartyPopper } from "lucide-react";
import { AddMemberForm, BulkAddForm, MemberRow, ReactivateButton } from "./member-forms";

export const metadata: Metadata = { title: "Membros" };

export default async function MembrosPage({ params, searchParams }: PageProps<"/gc/[groupId]/membros">) {
  const { groupId } = await params;
  const { novo } = await searchParams;
  const { group } = await requireGroup(Number(groupId));
  const { active, inactive } = await getRoster(group.id);
  const adults = active.filter((m) => m.kind === "adulto");
  const kids = active.filter((m) => m.kind === "crianca");

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold">Membros</h1>
        <p className="text-muted">
          {adults.length} adultos · {kids.length} crianças
        </p>
      </div>

      {novo && (
        <div role="status" className="flex items-start gap-3 rounded-2xl bg-primary-soft p-4 text-primary">
          <PartyPopper className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">{group.name} criado!</p>
            <p className="text-sm">
              Agora cadastre os membros. Depois é só ir no{" "}
              <Link href={`/gc/${group.id}`} className="font-semibold underline">
                painel
              </Link>{" "}
              e fazer a primeira lista.
            </p>
          </div>
        </div>
      )}

      <AddMemberForm groupId={group.id} />
      <BulkAddForm groupId={group.id} open={active.length === 0} />

      {[
        { title: "Adultos", list: adults },
        { title: "Crianças", list: kids },
      ].map(
        (s) =>
          s.list.length > 0 && (
            <section key={s.title}>
              <h2 className="mb-2 px-1 text-xs font-semibold tracking-wider text-muted uppercase">{s.title}</h2>
              <ul className={`${card} divide-y divide-border`}>
                {s.list.map((m) => (
                  <MemberRow key={m.id} groupId={group.id} member={{ id: m.id, name: m.name, kind: m.kind }} />
                ))}
              </ul>
            </section>
          ),
      )}

      {inactive.length > 0 && (
        <section>
          <h2 className="mb-2 px-1 text-xs font-semibold tracking-wider text-muted uppercase">
            Saíram do GC ({inactive.length})
          </h2>
          <ul className={`${card} divide-y divide-border`}>
            {inactive.map((m) => (
              <li key={m.id} className="flex min-h-14 items-center justify-between gap-3 px-4">
                <span className="text-muted">{m.name}</span>
                <ReactivateButton groupId={group.id} memberId={m.id} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
