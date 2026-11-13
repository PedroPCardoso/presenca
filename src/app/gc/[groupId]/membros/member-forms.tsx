"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Pencil, Plus, RotateCcw, UserMinus } from "lucide-react";
import { addMember, setMemberActive, updateMember } from "@/actions/members";
import { btn, card, input } from "@/components/ui";

type Kind = "adulto" | "crianca";

function KindSelect({ defaultValue = "adulto", id }: { defaultValue?: Kind; id: string }) {
  return (
    <>
      <label htmlFor={id} className="sr-only">
        Tipo
      </label>
      <select id={id} name="kind" defaultValue={defaultValue} className={`${input} w-auto`}>
        <option value="adulto">Adulto</option>
        <option value="crianca">Criança</option>
      </select>
    </>
  );
}

export function AddMemberForm({ groupId }: { groupId: number }) {
  const [state, action, pending] = useActionState(addMember, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className={`${card} p-4`}>
      <input type="hidden" name="groupId" value={groupId} />
      <div className="flex flex-wrap gap-2">
        <label htmlFor="new-name" className="sr-only">
          Nome
        </label>
        <input id="new-name" name="name" placeholder="Nome do novo membro" required maxLength={60} className={`${input} min-w-0 flex-1`} />
        <KindSelect id="new-kind" />
        <button type="submit" disabled={pending} className={btn.primary}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
          Adicionar
        </button>
      </div>
      <p role="status" className={`mt-2 text-sm ${state?.error ? "text-danger" : "text-primary"}`}>
        {state?.error ?? state?.ok}
      </p>
    </form>
  );
}

export function MemberRow({ groupId, member }: { groupId: number; member: { id: number; name: string; kind: Kind } }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(updateMember, undefined);
  const [removing, startRemove] = useTransition();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fecha o formulário após salvar
    if (state?.ok) setEditing(false);
  }, [state]);

  if (editing) {
    return (
      <li className="p-3">
        <form action={action} className="flex flex-wrap gap-2">
          <input type="hidden" name="groupId" value={groupId} />
          <input type="hidden" name="memberId" value={member.id} />
          <label htmlFor={`name-${member.id}`} className="sr-only">
            Nome
          </label>
          <input
            id={`name-${member.id}`}
            name="name"
            defaultValue={member.name}
            required
            maxLength={60}
            autoFocus
            className={`${input} min-w-0 flex-1`}
          />
          <KindSelect id={`kind-${member.id}`} defaultValue={member.kind} />
          <button type="button" onClick={() => setEditing(false)} className={btn.secondary}>
            Cancelar
          </button>
          <button type="submit" disabled={pending} className={btn.primary}>
            Salvar
          </button>
        </form>
        {state?.error && <p className="mt-2 text-sm text-danger">{state.error}</p>}
      </li>
    );
  }

  return (
    <li className="flex min-h-14 items-center gap-2 pr-2 pl-4">
      <span className="flex-1 font-medium">{member.name}</span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={`${btn.ghost} px-3`}
        aria-label={`Editar ${member.name}`}
      >
        <Pencil className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        disabled={removing}
        onClick={() => {
          if (confirm(`Tirar ${member.name} do GC? O histórico de presença continua salvo.`)) {
            startRemove(() => setMemberActive(groupId, member.id, false));
          }
        }}
        className={`${btn.ghost} px-3 hover:text-danger`}
        aria-label={`Tirar ${member.name} do GC`}
      >
        <UserMinus className="size-4" aria-hidden />
      </button>
    </li>
  );
}

export function ReactivateButton({ groupId, memberId }: { groupId: number; memberId: number }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => setMemberActive(groupId, memberId, true))}
      className={btn.secondary}
    >
      <RotateCcw className="size-4" aria-hidden /> Voltar ao GC
    </button>
  );
}
