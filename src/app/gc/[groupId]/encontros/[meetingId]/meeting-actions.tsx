"use client";

import { useState, useTransition } from "react";
import { Copy, Loader2, Trash2 } from "lucide-react";
import { deleteMeeting } from "@/actions/attendance";
import { btn } from "@/components/ui";
import { formatBR } from "@/lib/dates";
import { buildWhatsAppText, type ListPerson } from "@/lib/whatsapp";

type Props = {
  groupId: number;
  meetingId: number;
  groupName: string;
  date: string;
  present: ListPerson[];
  absent: ListPerson[];
};

export function MeetingActions({ groupId, meetingId, groupName, date, present, absent }: Props) {
  const [includeAbsent, setIncludeAbsent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleting, startDelete] = useTransition();
  const text = buildWhatsAppText({ groupName, date, present, absent, includeAbsent });

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={copy} className={`${btn.whatsapp} flex-1 sm:flex-none`}>
        <Copy className="size-4" aria-hidden />
        <span aria-live="polite">{copied ? "Copiado!" : "Copiar para o WhatsApp"}</span>
      </button>
      <label className="flex min-h-11 cursor-pointer items-center gap-2 px-1 text-sm text-muted">
        <input
          type="checkbox"
          checked={includeAbsent}
          onChange={(e) => setIncludeAbsent(e.target.checked)}
          className="size-4 accent-primary"
        />
        incluir ausentes
      </label>
      <button
        type="button"
        className={`${btn.danger} sm:ml-auto`}
        disabled={deleting}
        onClick={() => {
          if (confirm(`Excluir o encontro de ${formatBR(date)}? Essa ação não pode ser desfeita.`)) {
            startDelete(() => deleteMeeting(groupId, meetingId));
          }
        }}
      >
        {deleting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
        Excluir
      </button>
    </div>
  );
}
