"use client";

import { useActionState } from "react";
import { Loader2, Plus } from "lucide-react";
import { createGroup } from "@/actions/groups";
import { btn, card, input, label } from "@/components/ui";

export function CreateGroupForm({ firstGroup }: { firstGroup: boolean }) {
  const [state, action, pending] = useActionState(createGroup, undefined);

  return (
    <form action={action} className={`${card} p-5`}>
      <h2 className="font-semibold">{firstGroup ? "Crie seu primeiro GC" : "Criar novo GC"}</h2>
      <p className="mb-3 text-sm text-muted">Depois você cadastra os membros dele.</p>
      <label htmlFor="gc-name" className={label}>
        Nome do GC
      </label>
      <div className="flex gap-2">
        <input
          id="gc-name"
          name="name"
          placeholder="Ex.: GC Atabaque"
          required
          maxLength={60}
          className={`${input} min-w-0 flex-1`}
          aria-invalid={!!state?.error}
          aria-describedby={state?.error ? "gc-error" : undefined}
        />
        <button type="submit" disabled={pending} className={btn.primary}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
          Criar
        </button>
      </div>
      {state?.error && (
        <p id="gc-error" role="alert" className="mt-2 text-sm text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
