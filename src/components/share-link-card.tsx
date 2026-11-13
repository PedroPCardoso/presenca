"use client";

import { useEffect, useState, useTransition } from "react";
import { Copy, Link2, Loader2, MessageCircle, RefreshCw } from "lucide-react";
import { disableShareLink, regenerateShareLink } from "@/actions/attendance";
import { btn, card } from "./ui";

/** Card do painel para criar, copiar, enviar, trocar ou desativar o link público. */
export function ShareLinkCard({ groupId, groupName, token }: { groupId: number; groupName: string; token: string | null }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  // eslint-disable-next-line react-hooks/set-state-in-effect -- origem só existe no navegador
  useEffect(() => setOrigin(window.location.origin), []);

  const url = token ? `${origin}/p/${token}` : "";
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`Lista de presença do ${groupName}: ${url}`)}`;

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className={`${card} p-5`}>
      <h2 className="flex items-center gap-2 font-semibold">
        <Link2 className="size-4" aria-hidden /> Link público da lista
      </h2>
      <p className="mt-1 text-sm text-muted">
        Quem tiver o link marca a presença e confirma, sem precisar de login. Vale para encontros dos últimos 7 dias.
      </p>

      {token ? (
        <>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-bg p-1 pl-3">
            <code className="min-w-0 flex-1 truncate text-sm">{url || `/p/${token}`}</code>
            <button type="button" onClick={copy} className={btn.secondary}>
              <Copy className="size-4" aria-hidden />
              <span aria-live="polite">{copied ? "Copiado!" : "Copiar"}</span>
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={btn.whatsapp}>
              <MessageCircle className="size-4" aria-hidden /> Enviar no WhatsApp
            </a>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (confirm("Gerar um link novo? O link atual vai parar de funcionar.")) {
                  start(() => regenerateShareLink(groupId));
                }
              }}
              className={btn.secondary}
            >
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RefreshCw className="size-4" aria-hidden />}
              Gerar novo link
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (confirm("Desativar o link? Ninguém mais vai conseguir usar o link atual.")) {
                  start(() => disableShareLink(groupId));
                }
              }}
              className={btn.ghost}
            >
              Desativar
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => start(() => regenerateShareLink(groupId))}
          className={`${btn.primary} mt-3`}
        >
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
          Criar link público
        </button>
      )}
    </section>
  );
}
