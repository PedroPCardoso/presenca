import { formatBR, formatShort } from "@/lib/dates";
import type { MeetingRecord } from "@/lib/stats";

/**
 * Barras empilhadas (membros + visitantes) por encontro.
 * Paleta validada (dataviz validate_palette): #2f9e67 / #f59e0b — o âmbar fica
 * abaixo de 3:1 no fundo, por isso há total visível em cada barra, legenda e tabela.
 */
const MEMBER = "#2f9e67";
const VISITOR = "#f59e0b";
const PLOT_H = 160;

export function AttendanceChart({ meetings }: { meetings: MeetingRecord[] }) {
  const max = Math.max(1, ...meetings.map((m) => m.total));
  // Escala "redonda" para a grade
  const step = max <= 10 ? 5 : max <= 40 ? 10 : 20;
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);

  return (
    <figure>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm" style={{ background: MEMBER }} aria-hidden /> Membros
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm" style={{ background: VISITOR }} aria-hidden /> Visitantes
        </span>
      </div>

      <div className="relative mt-5 flex" aria-hidden>
        {/* eixo y */}
        <div className="relative w-7 shrink-0" style={{ height: PLOT_H }}>
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-2 -translate-y-1/2 text-xs tabular-nums text-muted"
              style={{ bottom: (t / top) * PLOT_H }}
            >
              {t}
            </span>
          ))}
        </div>

        <div className="relative flex-1" style={{ height: PLOT_H }}>
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute inset-x-0 border-t border-border"
              style={{ bottom: (t / top) * PLOT_H }}
            />
          ))}
          <div className="absolute inset-0 flex items-end justify-around gap-1">
            {meetings.map((m) => {
              const members = m.total - m.visitors.length;
              const hM = (members / top) * PLOT_H;
              const hV = (m.visitors.length / top) * PLOT_H;
              return (
                <div key={m.id} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                  <span className="mb-1 text-xs font-semibold tabular-nums text-fg">{m.total}</span>
                  <div className="flex w-full max-w-6 flex-col">
                    {hV > 0 && (
                      <div
                        className="rounded-t-[4px]"
                        style={{ height: hV, background: VISITOR, marginBottom: 2 }}
                      />
                    )}
                    <div
                      className={hV > 0 ? "" : "rounded-t-[4px]"}
                      style={{ height: Math.max(hM, 0), background: MEMBER }}
                    />
                  </div>
                  {/* tooltip */}
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden w-max -translate-x-1/2 rounded-lg bg-fg px-2.5 py-1.5 text-xs text-white shadow-lg group-hover:block">
                    <div className="font-semibold">{formatBR(m.date)}</div>
                    <div>{members} membros · {m.visitors.length} visitantes</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="ml-7 mt-1.5 flex justify-around gap-1" aria-hidden>
        {meetings.map((m) => (
          <span key={m.id} className="flex-1 text-center text-xs tabular-nums text-muted">
            {formatShort(m.date)}
          </span>
        ))}
      </div>

      <table className="sr-only">
        <caption>Presença por encontro</caption>
        <thead>
          <tr>
            <th>Data</th>
            <th>Membros</th>
            <th>Visitantes</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {meetings.map((m) => (
            <tr key={m.id}>
              <td>{formatBR(m.date)}</td>
              <td>{m.total - m.visitors.length}</td>
              <td>{m.visitors.length}</td>
              <td>{m.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
