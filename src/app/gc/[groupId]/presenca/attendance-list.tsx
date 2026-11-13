"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Copy, Info, Loader2, Plus, UserPlus, X } from "lucide-react";
import { saveAttendance } from "@/actions/attendance";
import { btn, card, input } from "@/components/ui";
import { formatBR, formatLong, isISODate } from "@/lib/dates";
import { cleanName, compareNames, sameName } from "@/lib/names";
import { buildWhatsAppText } from "@/lib/whatsapp";

export type Person = {
  key: string;
  memberId: number | null;
  name: string;
  kind: "adulto" | "crianca";
  isVisitor: boolean;
  present: boolean;
  /** Adicionado na hora (não é da lista fixa) — pode ser removido. */
  added?: boolean;
};

type Props = {
  groupId: number;
  groupName: string;
  date: string;
  initialPeople: Person[];
  alreadySaved: boolean;
  recentVisitors: { name: string; kind: "adulto" | "crianca" }[];
};

const draftKey = (groupId: number, date: string) => `gc-presenca:${groupId}:${date}`;

export function AttendanceList({ groupId, groupName, date, initialPeople, alreadySaved, recentVisitors }: Props) {
  const router = useRouter();
  const [people, setPeople] = useState(initialPeople);
  const [restored, setRestored] = useState(false);
  const [includeAbsent, setIncludeAbsent] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const hydrated = useRef(false);

  // Rascunho local: não perde as marcações se a página fechar antes de confirmar.
  useEffect(() => {
    const raw = localStorage.getItem(draftKey(groupId, date));
    if (raw) {
      try {
        const draft = JSON.parse(raw) as Person[];
        // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única do localStorage após montar
        setPeople(mergeDraft(initialPeople, draft));
        setRestored(true);
      } catch {
        localStorage.removeItem(draftKey(groupId, date));
      }
    }
    hydrated.current = true;
  }, [groupId, date, initialPeople]);

  useEffect(() => {
    if (!hydrated.current) return;
    const changed = JSON.stringify(people) !== JSON.stringify(initialPeople);
    if (changed) localStorage.setItem(draftKey(groupId, date), JSON.stringify(people));
    else localStorage.removeItem(draftKey(groupId, date));
  }, [people, initialPeople, groupId, date]);

  const sorted = useMemo(() => [...people].sort((a, b) => compareNames(a.name, b.name)), [people]);
  const sections = [
    { title: "Adultos", list: sorted.filter((p) => p.kind === "adulto" && !(p.added && p.isVisitor)) },
    { title: "Crianças", list: sorted.filter((p) => p.kind === "crianca" && !(p.added && p.isVisitor)) },
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

  const update = (key: string, patch: Partial<Person>) =>
    setPeople((list) => list.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  const remove = (key: string) => setPeople((list) => list.filter((p) => p.key !== key));

  function addPerson(name: string, kind: Person["kind"], isVisitor: boolean) {
    const clean = cleanName(name);
    if (!clean) return;
    const existing = people.find((p) => sameName(p.name, clean));
    if (existing) {
      update(existing.key, { present: true });
      showToast(`${existing.name} já estava na lista — marcado(a) como presente`);
      return;
    }
    setPeople((list) => [
      ...list,
      { key: `n${Date.now()}`, memberId: null, name: clean, kind, isVisitor, present: true, added: true },
    ]);
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

  function confirmSave() {
    setError(null);
    startSaving(async () => {
      localStorage.removeItem(draftKey(groupId, date));
      const result = await saveAttendance({
        groupId,
        date,
        people: present.map((p) => ({
          memberId: p.memberId,
          name: p.name,
          kind: p.kind,
          isVisitor: p.isVisitor,
        })),
      });
      // Se chegou aqui, houve erro (sucesso redireciona).
      if (result?.error) {
        localStorage.setItem(draftKey(groupId, date), JSON.stringify(people));
        dialogRef.current?.close();
        setError(result.error);
      }
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
            onChange={(e) => {
              if (isISODate(e.target.value)) router.replace(`?data=${e.target.value}`);
            }}
            className={`${input} w-auto`}
          />
        </label>
      </div>

      {alreadySaved && (
        <Notice icon={Info}>
          Este encontro já foi registrado. Ao confirmar de novo, a lista salva é atualizada.
        </Notice>
      )}
      {restored && (
        <Notice icon={Info}>
          Recuperamos as marcações que você fez e ainda não confirmou.{" "}
          <button
            type="button"
            className="cursor-pointer font-semibold underline"
            onClick={() => {
              setPeople(initialPeople);
              setRestored(false);
            }}
          >
            Descartar
          </button>
        </Notice>
      )}
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
      <div className="fixed inset-x-0 bottom-14 z-10 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur md:bottom-0">
        <div className="mx-auto flex max-w-xl items-center gap-2">
          <div className="mr-auto leading-tight" aria-live="polite">
            <div className="text-lg font-bold tabular-nums">{counts.total}</div>
            <div className="text-xs text-muted">
              presentes{counts.visitors ? ` · ${counts.visitors} visit.` : ""}
            </div>
          </div>
          <button type="button" onClick={copy} className={btn.secondary}>
            <Copy className="size-4" aria-hidden />
            Copiar
          </button>
          <button
            type="button"
            onClick={() => dialogRef.current?.showModal()}
            disabled={counts.total === 0}
            className={btn.primary}
          >
            <Check className="size-4" aria-hidden />
            Confirmar
          </button>
        </div>
      </div>

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
          {alreadySaved && <p className="mt-3 text-sm text-muted">A lista salva antes será substituída.</p>}
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className={`${btn.secondary} flex-1`}
              disabled={saving}
            >
              Voltar
            </button>
            <button type="button" onClick={confirmSave} className={`${btn.primary} flex-1`} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {saving ? "Salvando…" : "Confirmar"}
            </button>
          </div>
        </div>
      </dialog>

      <div
        role="status"
        className={`pointer-events-none fixed inset-x-0 bottom-36 z-30 flex justify-center px-4 transition-opacity duration-200 md:bottom-24 ${
          toast ? "opacity-100" : "opacity-0"
        }`}
      >
        {toast && <span className="rounded-full bg-fg px-4 py-2.5 text-sm text-white shadow-lg">{toast}</span>}
      </div>
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
        onClick={() => onChange(p.key, { isVisitor: !p.isVisitor, present: p.isVisitor ? p.present : true })}
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
      {!visitor && (
        <p className="text-xs text-muted">Quem não é visitante entra como membro do GC ao confirmar.</p>
      )}
    </form>
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

/** Aplica o rascunho por cima da lista atual (membros novos/removidos continuam corretos). */
function mergeDraft(base: Person[], draft: Person[]): Person[] {
  const byKey = new Map(draft.map((p) => [p.key, p]));
  const merged = base.map((p) => {
    const d = byKey.get(p.key);
    return d ? { ...p, present: d.present, isVisitor: d.isVisitor } : p;
  });
  const extras = draft.filter((d) => d.added && !base.some((p) => p.key === d.key));
  return [...merged, ...extras];
}
