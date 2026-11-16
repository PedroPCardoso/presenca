"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, CloudCheck, Copy, Info, Loader2, Plus, UserPlus, X } from "lucide-react";
import type { ListSnapshot, SaveResult } from "@/actions/attendance";
import type { PresenceChangeInput } from "@/lib/validation";
import { btn, card, input } from "@/components/ui";
import { formatBR, formatLong, isISODate } from "@/lib/dates";
import { cleanName, compareNames, sameName } from "@/lib/names";
import { buildWhatsAppText } from "@/lib/whatsapp";

import type { ListPerson as Person } from "@/lib/list-data";

type Props = {
  /** "leader": líder logado (pode confirmar o encontro). "public": link público (só marca). */
  mode: "leader" | "public";
  /** Server Action já ligada ao GC/token: salva uma marcação (um clique). */
  savePerson: (input: PresenceChangeInput) => Promise<SaveResult>;
  /** Busca o estado atual no servidor (recarregamento automático). */
  poll: () => Promise<ListSnapshot>;
  /** Só no modo líder: confirma o encontro do dia. */
  confirm?: (date: string) => Promise<SaveResult>;
  /** Limites da data no link público. */
  minDate?: string;
  maxDate?: string;
  groupName: string;
  date: string;
  initialPeople: Person[];
  /** O líder já confirmou este encontro. */
  confirmed: boolean;
  recentVisitors: { name: string; kind: "adulto" | "crianca" }[];
};

export function AttendanceList({
  mode,
  savePerson,
  poll,
  confirm,
  minDate,
  maxDate,
  groupName,
  date,
  initialPeople,
  confirmed: initialConfirmed,
  recentVisitors,
}: Props) {
  const isPublic = mode === "public";
  const router = useRouter();
  const [people, setPeople] = useState(initialPeople);
  const [confirmed, setConfirmed] = useState(initialConfirmed);
  const [includeAbsent, setIncludeAbsent] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inFlight, setInFlight] = useState(0);
  const [confirming, startConfirming] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Uma fila por pessoa: cliques rápidos na mesma pessoa chegam ao servidor na ordem.
  const newKey = useRef(0);
  // Conta cada início/fim de salvamento local: um snapshot do servidor pedido antes disso está velho.
  const mutationSeq = useRef(0);
  const inFlightRef = useRef(0);
  const queues = useRef(new Map<string, Promise<unknown>>());

  // Tempo real: consulta o servidor a cada poucos segundos e mostra quem já marcou.
  const pollRef = useRef(poll);
  useEffect(() => {
    pollRef.current = poll;
  });
  useEffect(() => {
    let stopped = false;
    let busy = false;
    async function tick() {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      const seq = mutationSeq.current;
      try {
        const snap = await pollRef.current();
        if (stopped || !snap || inFlightRef.current > 0 || seq !== mutationSeq.current) return;
        setPeople((cur) => (sameList(cur, snap.people) ? cur : snap.people));
        setConfirmed(snap.confirmed);
      } catch {
        // sem rede: tenta de novo no próximo ciclo
      } finally {
        busy = false;
      }
    }
    const id = setInterval(tick, 4000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  const sorted = useMemo(() => [...people].sort((a, b) => compareNames(a.name, b.name)), [people]);
  const sections = [
    {
      title: "Adultos",
      list: sorted.filter((p) => p.kind === "adulto" && !(p.added && p.isVisitor)),
    },
    {
      title: "Crianças",
      list: sorted.filter((p) => p.kind === "crianca" && !(p.added && p.isVisitor)),
    },
    { title: "Visitantes", list: sorted.filter((p) => p.added && p.isVisitor) },
  ];

  const present = people.filter((p) => p.present);
  const counts = {
    total: present.length,
    visitors: present.filter((p) => p.isVisitor).length,
  };
  const text = buildWhatsAppText({
    groupName,
    date,
    present,
    absent: people.filter((p) => !p.present && !p.isVisitor && !p.added),
    includeAbsent,
  });

  /** Aplica a mudança na tela na hora e salva no servidor; se falhar, volta ao estado anterior. */
  function commit(prev: Person | undefined, next: Person) {
    setError(null);
    setPeople((list) =>
      list.some((p) => p.key === next.key) ? list.map((p) => (p.key === next.key ? next : p)) : [...list, next],
    );
    setInFlight((n) => n + 1);
    inFlightRef.current++;
    mutationSeq.current++;
    const queueKey = next.name.toLocaleLowerCase("pt-BR");
    const job = (queues.current.get(queueKey) ?? Promise.resolve())
      .then(() =>
        savePerson({
          date,
          memberId: next.memberId,
          name: next.name,
          kind: next.kind,
          isVisitor: next.isVisitor,
          present: next.present,
        }),
      )
      .then((result) => {
        if (result && "error" in result) throw new Error(result.error);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error && e.message ? e.message : "Não foi possível salvar. Tente de novo.");
        setPeople((list) =>
          prev
            ? list.some((p) => p.key === prev.key)
              ? list.map((p) => (p.key === prev.key ? prev : p))
              : [...list, prev]
            : list.filter((p) => p.key !== next.key),
        );
      })
      .finally(() => {
        setInFlight((n) => n - 1);
        inFlightRef.current--;
        mutationSeq.current++;
      });
    queues.current.set(queueKey, job);
  }

  const update = (key: string, patch: Partial<Person>) => {
    const prev = people.find((p) => p.key === key);
    if (prev) commit(prev, { ...prev, ...patch });
  };
  const remove = (key: string) => {
    const prev = people.find((p) => p.key === key);
    if (!prev) return;
    commit(prev, { ...prev, present: false });
    setPeople((list) => list.filter((p) => p.key !== key));
  };

  function addPerson(name: string, kind: Person["kind"], isVisitor: boolean) {
    const clean = cleanName(name);
    if (!clean) return;
    const existing = people.find((p) => sameName(p.name, clean));
    if (existing) {
      update(existing.key, { present: true });
      showToast(`${existing.name} já estava na lista — marcado(a) como presente`);
      return;
    }
    commit(undefined, {
      key: `n${++newKey.current}`,
      memberId: null,
      name: clean,
      kind,
      isVisitor,
      present: true,
      added: true,
    });
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    showToast("Lista copiada! Cole no WhatsApp");
  }

  function confirmMeeting() {
    if (!confirm) return;
    setError(null);
    startConfirming(async () => {
      // O sucesso redireciona para o encontro; só volta aqui se der erro.
      const result = await confirm(date);
      dialogRef.current?.close();
      if (result && "error" in result) setError(result.error);
    });
  }

  const newMembers = present.filter((p) => p.added && !p.isVisitor && p.memberId === null);
  const suggestions = recentVisitors.filter((v) => !people.some((p) => sameName(p.name, v.name)));

  return (
    <div className="mx-auto max-w-xl pb-20">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Lista de presença</h1>
          <p className="text-sm capitalize text-muted">{formatLong(date)}</p>
        </div>
        <label className="text-sm">
          <span className="sr-only">Data do encontro</span>
          <input
            type="date"
            value={date}
            min={minDate}
            max={maxDate}
            onChange={(e) => {
              if (isISODate(e.target.value)) router.replace(`?data=${e.target.value}`);
            }}
            className={`${input} w-auto`}
          />
        </label>
      </div>

      {isPublic ? (
        <Notice icon={Info}>
          Toque no seu nome para marcar presença. Cada toque já fica salvo e o líder confirma depois.
        </Notice>
      ) : confirmed ? (
        <Notice icon={Info}>Este encontro já foi confirmado. Mudanças aqui são salvas na hora.</Notice>
      ) : counts.total > 0 ? (
        <Notice icon={Info}>
          Presenças salvas, aguardando a sua confirmação. Revise a lista e toque em Confirmar.
        </Notice>
      ) : null}
      {error && (
        <Notice icon={AlertCircle} tone="danger">
          {error}
        </Notice>
      )}

      {sections.map(
        (s) =>
          s.list.length > 0 && (
            <section key={s.title} className="mt-5">
              <h2 className="mb-2 px-1 text-xs font-semibold tracking-wider text-muted uppercase">
                {s.title} ({s.list.filter((p) => p.present).length}/{s.list.length})
              </h2>
              <ul className="grid gap-2">
                {s.list.map((p) => (
                  <PersonRow key={p.key} person={p} onChange={update} onRemove={remove} />
                ))}
              </ul>
            </section>
          ),
      )}

      <AddPerson onAdd={addPerson} />

      {suggestions.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 px-1 text-sm text-muted">Visitantes recentes</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((v) => (
              <button
                key={v.name}
                type="button"
                onClick={() => addPerson(v.name, v.kind, true)}
                className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border border-visitor-border/50 bg-visitor-soft px-4 text-sm font-medium text-visitor transition-colors hover:border-visitor-border"
              >
                <Plus className="size-4" aria-hidden />
                {v.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <section className={`${card} mt-6 p-4`}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Texto para o WhatsApp</h2>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={includeAbsent}
              onChange={(e) => setIncludeAbsent(e.target.checked)}
              className="size-4 accent-primary"
            />
            incluir ausentes
          </label>
        </div>
        <pre className="max-h-64 overflow-auto rounded-xl bg-bg p-3 text-sm whitespace-pre-wrap">{text}</pre>
      </section>

      {/* Barra de ações fixa */}
      <div
        className={`fixed inset-x-0 z-10 border-t border-border bg-surface/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur ${
          isPublic ? "bottom-0" : "bottom-14 md:bottom-0"
        }`}
      >
        <div className="mx-auto flex max-w-xl items-center gap-2">
          <div className="mr-auto leading-tight" aria-live="polite">
            <div className="text-lg font-bold tabular-nums">{counts.total}</div>
            <div className="text-xs text-muted">presentes{counts.visitors ? ` · ${counts.visitors} visit.` : ""}</div>
          </div>
          <button type="button" onClick={copy} className={btn.secondary}>
            <Copy className="size-4" aria-hidden />
            Copiar
          </button>
          {isPublic ? (
            <span className="flex items-center gap-1.5 text-sm text-muted" aria-live="polite">
              {inFlight > 0 ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <CloudCheck className="size-4 text-check" aria-hidden />
              )}
              {inFlight > 0 ? "Salvando…" : "Salvo"}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => dialogRef.current?.showModal()}
              disabled={counts.total === 0 || inFlight > 0}
              className={btn.primary}
            >
              {inFlight > 0 ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Check className="size-4" aria-hidden />
              )}
              {confirmed ? "Reconfirmar" : "Confirmar"}
            </button>
          )}
        </div>
      </div>

      {!isPublic && (
        <dialog
          ref={dialogRef}
          aria-labelledby="confirm-title"
          className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl p-0 backdrop:bg-black/40"
        >
          <div className="p-5">
            <h2 id="confirm-title" className="text-lg font-bold">
              Confirmar presença de {formatBR(date)}?
            </h2>
            <ul className="mt-3 space-y-1 text-[15px]">
              <li>
                <strong className="tabular-nums">{counts.total - counts.visitors}</strong> membros
              </li>
              <li>
                <strong className="tabular-nums">{counts.visitors}</strong> visitantes
              </li>
            </ul>
            {newMembers.length > 0 && (
              <p className="mt-3 rounded-xl bg-primary-soft p-3 text-sm text-primary">
                Entram como novos membros do GC: {newMembers.map((p) => p.name).join(", ")}
              </p>
            )}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className={`${btn.secondary} flex-1`}
                disabled={confirming}
              >
                Voltar
              </button>
              <button type="button" onClick={confirmMeeting} className={`${btn.primary} flex-1`} disabled={confirming}>
                {confirming && <Loader2 className="size-4 animate-spin" aria-hidden />}
                {confirming ? "Confirmando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </dialog>
      )}

      <Toast message={toast} bottom={isPublic ? "bottom-24" : "bottom-36 md:bottom-24"} />
    </div>
  );
}

function PersonRow({
  person: p,
  onChange,
  onRemove,
}: {
  person: Person;
  onChange: (key: string, patch: Partial<Person>) => void;
  onRemove: (key: string) => void;
}) {
  return (
    <li
      className={`flex items-center gap-2 rounded-xl border-2 bg-surface pr-2 transition-colors duration-150 ${
        p.present ? "border-check bg-primary-soft" : "border-border"
      }`}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={p.present}
        onClick={() => onChange(p.key, { present: !p.present })}
        className="flex min-h-13 flex-1 cursor-pointer items-center gap-3 py-2 pl-3 text-left text-[17px]"
      >
        <span
          className={`grid size-7 shrink-0 place-items-center rounded-lg border-2 transition-colors ${
            p.present ? "border-check bg-check text-white" : "border-border-strong"
          }`}
        >
          {p.present && <Check className="size-4" strokeWidth={3} aria-hidden />}
        </span>
        <span className="truncate">{p.name}</span>
      </button>
      <button
        type="button"
        aria-pressed={p.isVisitor}
        onClick={() =>
          onChange(p.key, {
            isVisitor: !p.isVisitor,
            present: p.isVisitor ? p.present : true,
          })
        }
        className={`min-h-9 shrink-0 cursor-pointer rounded-full border px-3 text-xs font-semibold transition-colors ${
          p.isVisitor
            ? "border-visitor-border bg-visitor-soft text-visitor"
            : "border-border-strong bg-surface text-muted hover:text-fg"
        }`}
      >
        visitante
      </button>
      {p.added && (
        <button
          type="button"
          onClick={() => onRemove(p.key)}
          aria-label={`Remover ${p.name} da lista`}
          className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-muted hover:bg-danger-soft hover:text-danger"
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </li>
  );
}

function AddPerson({ onAdd }: { onAdd: (name: string, kind: Person["kind"], isVisitor: boolean) => void }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Person["kind"]>("adulto");
  const [visitor, setVisitor] = useState(true);

  return (
    <form
      className={`${card} mt-6 space-y-3 p-4`}
      onSubmit={(e) => {
        e.preventDefault();
        onAdd(name, kind, visitor);
        setName("");
      }}
    >
      <h2 className="flex items-center gap-2 font-semibold">
        <UserPlus className="size-4" aria-hidden /> Adicionar pessoa
      </h2>
      <div className="flex gap-2">
        <label className="flex-1">
          <span className="sr-only">Nome</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome"
            className={input}
            maxLength={60}
          />
        </label>
        <button type="submit" className={btn.primary} disabled={!name.trim()} aria-label="Adicionar">
          <Plus className="size-5" aria-hidden />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        <fieldset className="flex gap-1 rounded-xl bg-bg p-1">
          <legend className="sr-only">Tipo</legend>
          {(["adulto", "crianca"] as const).map((k) => (
            <label
              key={k}
              className={`flex min-h-9 cursor-pointer items-center rounded-lg px-3 text-sm font-medium ${
                kind === k ? "bg-surface shadow-sm" : "text-muted"
              }`}
            >
              <input
                type="radio"
                name="kind"
                value={k}
                checked={kind === k}
                onChange={() => setKind(k)}
                className="sr-only"
              />
              {k === "adulto" ? "Adulto" : "Criança"}
            </label>
          ))}
        </fieldset>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={visitor}
            onChange={(e) => setVisitor(e.target.checked)}
            className="size-4 accent-primary"
          />
          É visitante
        </label>
      </div>
      {!visitor && <p className="text-xs text-muted">Quem não é visitante entra como membro do GC ao confirmar.</p>}
    </form>
  );
}

function Toast({ message, bottom }: { message: string | null; bottom: string }) {
  return (
    <div
      role="status"
      className={`pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4 transition-opacity duration-200 ${bottom} ${
        message ? "opacity-100" : "opacity-0"
      }`}
    >
      {message && <span className="rounded-full bg-fg px-4 py-2.5 text-sm text-white shadow-lg">{message}</span>}
    </div>
  );
}

function Notice({
  icon: Icon,
  tone = "info",
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone?: "info" | "danger";
  children: React.ReactNode;
}) {
  return (
    <p
      role={tone === "danger" ? "alert" : undefined}
      className={`mb-3 flex items-start gap-2 rounded-xl p-3 text-sm ${
        tone === "danger" ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary"
      }`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

function sameList(a: Person[], b: Person[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}
