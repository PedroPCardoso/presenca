"use client";

import { useActionState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { login } from "@/actions/auth";
import { btn, card, input, label } from "@/components/ui";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className={`${card} space-y-4 p-6`} noValidate>
      <div>
        <label htmlFor="username" className={label}>
          Usuário
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          required
          defaultValue={state?.username}
          className={input}
          aria-invalid={!!state?.error}
          aria-describedby={state?.error ? "login-error" : undefined}
        />
      </div>
      <div>
        <label htmlFor="password" className={label}>
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={input}
          aria-invalid={!!state?.error}
          aria-describedby={state?.error ? "login-error" : undefined}
        />
      </div>

      {state?.error && (
        <p id="login-error" role="alert" className="flex items-center gap-2 text-sm font-medium text-danger">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={`${btn.primary} w-full`}>
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
