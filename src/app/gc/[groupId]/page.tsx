import Link from "next/link";
import { AlertTriangle, CalendarDays, ChevronRight, ClipboardCheck, TrendingUp, UserPlus } from "lucide-react";
import { requireGroup } from "@/lib/dal";
import { getMeetingRecords, getRoster, getShareToken } from "@/lib/queries";
import { memberFrequency, summarize } from "@/lib/stats";
import { formatBR, formatLong, formatShort } from "@/lib/dates";
import { btn, card } from "@/components/ui";
import { AttendanceChart } from "@/components/attendance-chart";
import { ShareLinkCard } from "@/components/share-link-card";

const WINDOW = 8;
const ATTENTION_MAX = 6;

export default async function Dashboard({ params }: PageProps<"/gc/[groupId]">) {
  const { groupId } = await params;
  const { group } = await requireGroup(Number(groupId));
  const [roster, meetings, shareToken] = await Promise.all([
    getRoster(group.id),
    getMeetingRecords(group.id),
    getShareToken(group.id),
  ]);

  const summary = summarize(meetings);
  const freq = memberFrequency(roster.active, meetings, WINDOW);
  const attention = freq.filter((f) => f.absenceStreak >= 2).sort((a, b) => b.absenceStreak - a.absenceStreak);
  const recent = meetings.slice(-WINDOW);
  const base = `/gc/${group.id}`;

  return (
    <div className="space-y-6">
      {/* Ação principal */}
      <section className={`${card} flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between`}>
        <div>
          <h1 className="text-xl font-bold">{group.name}</h1>
          <p className="text-muted">
            {summary.last
              ? `Último encontro: ${formatLong(summary.last.date)}`
              : "Nenhum encontro registrado ainda"}
          </p>
        </div>
        <Link href={`${base}/presenca`} className={`${btn.primary} min-h-12 px-5 text-base`}>
          <ClipboardCheck className="size-5" aria-hidden />
          Fazer lista de presença
        </Link>
      </section>

      <ShareLinkCard groupId={group.id} groupName={group.name} token={shareToken} />

      {/* Números */}
      <section aria-label="Resumo" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={CalendarDays} label="Encontros" value={String(summary.count)} />
        <Stat
          icon={TrendingUp}
          label="Média de presentes"
          value={summary.count ? summary.avgPresent.toFixed(1).replace(".", ",") : "—"}
        />
        <Stat
          icon={ClipboardCheck}
          label="No último encontro"
          value={summary.last ? String(summary.last.total) : "—"}
          hint={
            summary.last
              ? `${summary.last.memberIds.length} membros · ${summary.last.visitors.length} visitantes`
              : undefined
          }
        />
        <Stat icon={UserPlus} label="Visitantes diferentes" value={String(summary.distinctVisitors)} />
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className={`${card} p-5 lg:col-span-3`}>
          <h2 className="mb-4 font-semibold">Presença por encontro</h2>
          {recent.length ? (
            <AttendanceChart meetings={recent} />
          ) : (
            <Empty>O gráfico aparece depois do primeiro encontro confirmado.</Empty>
          )}
        </section>

        <section className={`${card} p-5 lg:col-span-2`}>
          <h2 className="mb-1 font-semibold">Precisam de atenção</h2>
          <p className="mb-4 text-sm text-muted">Faltaram nos 2 últimos encontros ou mais</p>
          {attention.length ? (
            <ul className="divide-y divide-border">
              {attention.slice(0, ATTENTION_MAX).map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="font-medium">{f.name}</span>
                  <span className="flex items-center gap-1.5 rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger">
                    <AlertTriangle className="size-3.5" aria-hidden />
                    {f.absenceStreak} faltas seguidas
                  </span>
                </li>
              ))}
              {attention.length > ATTENTION_MAX && (
                <li className="pt-2.5 text-sm text-muted">
                  e mais {attention.length - ATTENTION_MAX} — veja a frequência abaixo
                </li>
              )}
            </ul>
          ) : (
            <Empty>{meetings.length < 2 ? "Precisa de pelo menos 2 encontros." : "Ninguém sumido. Que bom!"}</Empty>
          )}
        </section>
      </div>

      {/* Frequência por pessoa */}
      <section className={card}>
        <div className="flex items-center justify-between p-5 pb-3">
          <div>
            <h2 className="font-semibold">Frequência</h2>
            <p className="text-sm text-muted">Últimos {Math.min(WINDOW, meetings.length) || WINDOW} encontros</p>
          </div>
          <Legend />
        </div>
        {recent.length ? (
          <ul className="divide-y divide-border border-t border-border">
            {freq.map((f) => (
              <li key={f.id} className="flex items-center gap-3 px-5 py-2.5">
                <span className="min-w-0 flex-1 truncate font-medium">
                  {f.name}
                  {f.kind === "crianca" && <span className="ml-1.5 text-xs font-normal text-muted">criança</span>}
                </span>
                <span className="hidden gap-1 sm:flex" aria-hidden>
                  {f.history.map((h, i) => (
                    <span
                      key={recent[i].id}
                      title={`${formatShort(recent[i].date)}: ${h === null ? "ainda não era membro" : h ? "presente" : "faltou"}`}
                      className={`size-3 rounded-full ${
                        h === null ? "bg-border" : h ? "bg-check" : "border-2 border-border-strong"
                      }`}
                    />
                  ))}
                </span>
                <span className="w-24 text-right text-sm tabular-nums">
                  {f.rate === null ? (
                    <span className="text-muted">—</span>
                  ) : (
                    <>
                      <span className="font-semibold">{Math.round(f.rate * 100)}%</span>
                      <span className="text-muted"> ({f.attended}/{f.possible})</span>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-5 pb-5">
            <Empty>Sem encontros ainda.</Empty>
          </div>
        )}
      </section>

      {/* Últimos encontros */}
      {meetings.length > 0 && (
        <section className={card}>
          <div className="flex items-center justify-between p-5 pb-3">
            <h2 className="font-semibold">Últimos encontros</h2>
            <Link href={`${base}/encontros`} className="text-sm font-semibold text-primary hover:underline">
              Ver todos
            </Link>
          </div>
          <ul className="divide-y divide-border border-t border-border">
            {meetings
              .slice(-5)
              .reverse()
              .map((m) => (
                <li key={m.id}>
                  <Link
                    href={`${base}/encontros/${m.id}`}
                    className="flex min-h-14 items-center gap-3 px-5 hover:bg-bg"
                  >
                    <span className="flex-1 font-medium">
                      {formatBR(m.date)}
                      {m.via === "link" && <ViaLinkBadge />}
                    </span>
                    <span className="text-sm text-muted">
                      {m.total} presentes{m.visitors.length ? ` · ${m.visitors.length} visitantes` : ""}
                    </span>
                    <ChevronRight className="size-4 text-muted" aria-hidden />
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className={`${card} p-4`}>
      <div className="flex items-center gap-2 text-sm text-muted">
        <Icon className="size-4" aria-hidden />
        {label}
      </div>
      <div className="mt-1 text-3xl font-bold tabular-nums">{value}</div>
      {hint && <div className="text-xs text-muted">{hint}</div>}
    </div>
  );
}

function Legend() {
  return (
    <div className="hidden items-center gap-3 text-xs text-muted sm:flex">
      <span className="flex items-center gap-1">
        <span className="size-3 rounded-full bg-check" /> presente
      </span>
      <span className="flex items-center gap-1">
        <span className="size-3 rounded-full border-2 border-border-strong" /> faltou
      </span>
    </div>
  );
}

function ViaLinkBadge() {
  return (
    <span className="ml-2 rounded-full bg-bg px-2 py-0.5 text-xs font-medium text-muted">pelo link</span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-bg px-4 py-6 text-center text-sm text-muted">{children}</p>;
}
