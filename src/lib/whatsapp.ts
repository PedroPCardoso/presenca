import { formatBR } from "./dates";
import { sortByName } from "./names";

export type ListPerson = {
  name: string;
  kind: "adulto" | "crianca";
  isVisitor: boolean;
};

type Input = {
  groupName?: string;
  date: string;
  present: ListPerson[];
  /** Membros que não vieram. Só entram no texto se `includeAbsent`. */
  absent?: ListPerson[];
  includeAbsent?: boolean;
};

const numbered = (names: string[]) =>
  names.length ? names.map((n, i) => `${i + 1}. ${n}`).join("\n") : "—";

/** Texto formatado para colar no WhatsApp (negrito com *, itálico com _). */
export function buildWhatsAppText({ groupName, date, present, absent = [], includeAbsent }: Input) {
  const sorted = sortByName(present);
  const adults = sorted.filter((p) => !p.isVisitor && p.kind === "adulto").map((p) => p.name);
  const kids = sorted.filter((p) => !p.isVisitor && p.kind === "crianca").map((p) => p.name);
  const visitors = sorted
    .filter((p) => p.isVisitor)
    .map((p) => (p.kind === "crianca" ? `${p.name} (criança)` : p.name));

  const title = groupName ? `${groupName} · Presença - ${formatBR(date)}` : `Presença - ${formatBR(date)}`;
  let text = `*${title}*\n\n`;
  text += `*Adultos (${adults.length})*\n${numbered(adults)}\n\n`;
  text += `*Crianças (${kids.length})*\n${numbered(kids)}\n\n`;
  if (visitors.length) text += `*Visitantes (${visitors.length})*\n${numbered(visitors)}\n\n`;
  text += `*Total: ${present.length}*`;

  if (includeAbsent) {
    const abs = [
      ...sortByName(absent.filter((p) => p.kind === "adulto")),
      ...sortByName(absent.filter((p) => p.kind === "crianca")),
    ].map((p) => p.name);
    text += `\n\n_Ausentes (${abs.length})_\n${numbered(abs)}`;
  }
  return text;
}
