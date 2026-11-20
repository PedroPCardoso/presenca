import "server-only";
import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { attendances, meetings, members } from "@/db/schema";
import { sameName } from "./names";
import type { PresenceChange } from "./validation";

type Via = "lider" | "link";

/**
 * Salva UMA marcação de presença (um clique). Cada pessoa é uma linha própria,
 * então várias pessoas marcando ao mesmo tempo não sobrescrevem umas às outras.
 * Se o encontro ainda não existe, nasce como "não confirmado" até o líder confirmar.
 * NÃO verifica permissão: quem chama precisa ter autorizado antes.
 */
export async function setPresence(opts: {
  groupId: number;
  date: string;
  change: PresenceChange;
  userId: number | null;
  via: Via;
}) {
  const { groupId, date, change, userId, via } = opts;
  return db.transaction(async (tx) => {
    const roster = await tx.select().from(members).where(eq(members.groupId, groupId));
    const [created] = await tx
      .insert(meetings)
      .values({
        groupId,
        date,
        createdBy: userId,
        submittedVia: via,
        confirmed: false,
      })
      .onConflictDoNothing({ target: [meetings.groupId, meetings.date] })
      .returning({ id: meetings.id });
    const meetingId =
      created?.id ??
      (
        await tx
          .select({ id: meetings.id })
          .from(meetings)
          .where(and(eq(meetings.groupId, groupId), eq(meetings.date, date)))
      )[0].id;

    // Troca de estado = apaga a linha da pessoa (qualquer variação do nome) e, se presente, recria.
    const member =
      (change.memberId ? roster.find((m) => m.id === change.memberId) : undefined) ??
      roster.find((m) => sameName(m.name, change.name));
    const name = member?.name ?? change.name;
    await tx
      .delete(attendances)
      .where(and(eq(attendances.meetingId, meetingId), sql`lower(${attendances.name}) = lower(${name})`));

    if (change.present) {
      await tx
        .insert(attendances)
        .values({
          meetingId,
          memberId: change.isVisitor ? null : (member?.id ?? null),
          name,
          kind: member?.kind ?? change.kind,
          isVisitor: change.isVisitor,
        })
        .onConflictDoNothing();
    }
    await tx
      .update(meetings)
      .set({ updatedAt: sql`now()` })
      .where(eq(meetings.id, meetingId));
    return meetingId;
  });
}

/**
 * Líder confirma o encontro do dia: quem foi marcado e não é visitante nem
 * membro ainda vira membro do GC. Devolve o id do encontro (ou null se ninguém marcou).
 */
export async function confirmMeeting({
  groupId,
  date,
  userId,
}: {
  groupId: number;
  date: string;
  userId: number | null;
}) {
  return db.transaction(async (tx) => {
    const [meeting] = await tx
      .select({ id: meetings.id })
      .from(meetings)
      .where(and(eq(meetings.groupId, groupId), eq(meetings.date, date)));
    if (!meeting) return null;

    const pending = await tx
      .select()
      .from(attendances)
      .where(
        and(eq(attendances.meetingId, meeting.id), eq(attendances.isVisitor, false), isNull(attendances.memberId)),
      );
    for (const p of pending) {
      const [member] = await tx
        .insert(members)
        .values({ groupId, name: p.name, kind: p.kind })
        .onConflictDoUpdate({
          target: [members.groupId, members.name],
          set: { active: true },
        })
        .returning({ id: members.id });
      await tx.update(attendances).set({ memberId: member.id }).where(eq(attendances.id, p.id));
    }
    // Quem voltou ao GC (estava inativo) e foi marcado volta a ser membro ativo.
    await tx
      .update(members)
      .set({ active: true })
      .where(
        and(
          eq(members.groupId, groupId),
          inArray(
            members.id,
            tx
              .select({ id: attendances.memberId })
              .from(attendances)
              .where(and(eq(attendances.meetingId, meeting.id), isNotNull(attendances.memberId))),
          ),
        ),
      );

    await tx
      .update(meetings)
      .set({ confirmed: true, ...(userId ? { createdBy: userId } : {}), updatedAt: sql`now()` })
      .where(eq(meetings.id, meeting.id));
    return meeting.id;
  });
}
