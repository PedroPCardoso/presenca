import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ClipboardCheck } from "lucide-react";
import { requireGroup } from "@/lib/dal";
import { getMeetingRecords } from "@/lib/queries";
import { formatBR, formatLong } from "@/lib/dates";
import { btn, card } from "@/components/ui";

export const metadata: Metadata = { title: "Encontros" };

export default async function EncontrosPage({ params }: PageProps<"/gc/[groupId]/encontros">) {
  const { groupId } = await params;
  const { group } = await requireGroup(Number(groupId));
  const meetings = (await getMeetingRecords(group.id)).reverse();
  const base = `/gc/${group.id}`;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Encontros</h1>
        <Link href={`${base}/presenca`} className={btn.primary}>
          <ClipboardCheck className="size-4" aria-hidden />
          Nova lista
        </Link>
      </div>

      {meetings.length === 0 ? (
        <p className={`${card} p-6 text-center text-muted`}>Nenhum encontro registrado ainda.</p>
      ) : (
        <ul className={`${card} divide-y divide-border overflow-hidden`}>
          {meetings.map((m) => (
            <li key={m.id}>
              <Link href={`${base}/encontros/${m.id}`} className="flex min-h-16 items-center gap-3 px-5 hover:bg-bg">
                <div className="flex-1">
                  <div className="font-semibold">
                    {formatBR(m.date)}
                    {m.via === "link" && (
                      <span className="ml-2 rounded-full bg-bg px-2 py-0.5 text-xs font-medium text-muted">
                        pelo link
                      </span>
                    )}
                  </div>
                  <div className="text-sm capitalize text-muted">{formatLong(m.date)}</div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-semibold tabular-nums">{m.total} presentes</div>
                  {m.visitors.length > 0 && (
                    <div className="text-muted">{m.visitors.length} visitantes</div>
                  )}
                </div>
                <ChevronRight className="size-4 text-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
