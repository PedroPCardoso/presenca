/**
 * Cálculos do painel. Funções puras: recebem os encontros já carregados
 * (do mais antigo para o mais recente) e devolvem os números prontos.
 */

export type MeetingRecord = {
  id: number;
  date: string;
  /** Quem confirmou: líder logado ou link público. */
  via?: "lider" | "link";
  /** IDs dos membros presentes (não visitantes). */
  memberIds: number[];
  visitors: string[];
  total: number;
};

export type MemberRecord = { id: number; name: string; kind: "adulto" | "crianca"; createdAt: Date };

export type MemberFrequency = {
  id: number;
  name: string;
  kind: "adulto" | "crianca";
  /** Presença nos últimos encontros, do mais antigo ao mais recente. null = ainda não era membro. */
  history: (boolean | null)[];
  attended: number;
  possible: number;
  /** 0..1, ou null se não houve encontro desde que entrou. */
  rate: number | null;
  /** Faltas seguidas contando a partir do último encontro. */
  absenceStreak: number;
  lastSeen: string | null;
};

export function summarize(meetings: MeetingRecord[]) {
  const count = meetings.length;
  const last = meetings.at(-1) ?? null;
  const avg = count ? meetings.reduce((s, m) => s + m.total, 0) / count : 0;
  const visitorNames = new Set(meetings.flatMap((m) => m.visitors.map((v) => v.toLocaleLowerCase("pt-BR"))));
  return { count, last, avgPresent: avg, distinctVisitors: visitorNames.size };
}

/** Data (YYYY-MM-DD) em que o membro entrou, para não contar falta antes disso. */
const joinedOn = (m: MemberRecord) => m.createdAt.toISOString().slice(0, 10);

export function memberFrequency(
  members: MemberRecord[],
  meetings: MeetingRecord[],
  window = 8,
): MemberFrequency[] {
  const recent = meetings.slice(-window);
  return members.map((member) => {
    const joined = joinedOn(member);
    const history = recent.map((mt) => {
      const present = mt.memberIds.includes(member.id);
      if (present) return true;
      return mt.date < joined ? null : false;
    });
    const counted = history.filter((h) => h !== null);
    const attended = counted.filter(Boolean).length;

    let absenceStreak = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i] === false) absenceStreak++;
      else break;
    }

    let lastSeen: string | null = null;
    for (let i = meetings.length - 1; i >= 0; i--) {
      if (meetings[i].memberIds.includes(member.id)) {
        lastSeen = meetings[i].date;
        break;
      }
    }

    return {
      id: member.id,
      name: member.name,
      kind: member.kind,
      history,
      attended,
      possible: counted.length,
      rate: counted.length ? attended / counted.length : null,
      absenceStreak,
      lastSeen,
    };
  });
}
