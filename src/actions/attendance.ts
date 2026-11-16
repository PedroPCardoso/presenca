"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { groups, meetings } from "@/db/schema";
import { canAccessGroup } from "@/lib/dal";
import { confirmMeeting, setPresence } from "@/lib/attendance-service";
import { loadListState, type ListPerson } from "@/lib/list-data";
import { findGroupByToken } from "@/lib/public-list";
import { publicDateRange } from "@/lib/dates";
import { dateSchema, presenceChangeSchema, type PresenceChangeInput } from "@/lib/validation";

export type SaveResult = { error: string } | { ok: true } | undefined;

/** Líder logado marca/desmarca uma pessoa. Salva na hora. */
export async function setLeaderPresence(groupId: number, raw: PresenceChangeInput): Promise<SaveResult> {
  const parsed = presenceChangeSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const access = await canAccessGroup(groupId);
  if (!access) return { error: "Sem permissão para este GC" };

  await setPresence({
    groupId,
    date: parsed.data.date,
    change: parsed.data,
    userId: access.userId,
    via: "lider",
  });
  revalidatePath(`/gc/${groupId}`, "layout");
  return { ok: true };
}

/** Qualquer pessoa com o link público marca/desmarca uma pessoa (só datas recentes). Salva na hora. */
export async function setPublicPresence(token: string, raw: PresenceChangeInput): Promise<SaveResult> {
  const parsed = presenceChangeSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const group = await findGroupByToken(token);
  if (!group)
    return {
      error: "Este link não está mais ativo. Peça um novo ao líder do GC.",
    };

  const { min, max } = publicDateRange();
  if (parsed.data.date < min || parsed.data.date > max) {
    return {
      error: "Pelo link só dá para registrar encontros dos últimos 7 dias",
    };
  }

  await setPresence({
    groupId: group.id,
    date: parsed.data.date,
    change: parsed.data,
    userId: null,
    via: "link",
  });
  revalidatePath(`/gc/${group.id}`, "layout");
  return { ok: true };
}

/** Só o líder confirma o encontro. Redireciona para o encontro confirmado. */
export async function confirmAttendance(groupId: number, date: string): Promise<SaveResult> {
  if (!dateSchema.safeParse(date).success) return { error: "Data inválida" };
  const access = await canAccessGroup(groupId);
  if (!access) return { error: "Sem permissão para este GC" };

  const meetingId = await confirmMeeting({
    groupId,
    date,
    userId: access.userId,
  });
  if (!meetingId) return { error: "Marque pelo menos uma pessoa" };
  revalidatePath(`/gc/${groupId}`, "layout");
  redirect(`/gc/${groupId}/encontros/${meetingId}?salvo=1`);
}

export type ListSnapshot = { people: ListPerson[]; confirmed: boolean } | null;

/** Estado atual da lista no servidor (usado pelo recarregamento automático da tela). */
export async function pollLeaderList(groupId: number, date: string): Promise<ListSnapshot> {
  if (!dateSchema.safeParse(date).success || !(await canAccessGroup(groupId))) return null;
  const { people, confirmed } = await loadListState(groupId, date);
  return { people, confirmed };
}

export async function pollPublicList(token: string, date: string): Promise<ListSnapshot> {
  if (!dateSchema.safeParse(date).success) return null;
  const group = await findGroupByToken(token);
  const { min, max } = publicDateRange();
  if (!group || date < min || date > max) return null;
  const { people, confirmed } = await loadListState(group.id, date);
  return { people, confirmed };
}

export async function deleteMeeting(groupId: number, meetingId: number) {
  const access = await canAccessGroup(groupId);
  if (!access) return;
  await db.delete(meetings).where(and(eq(meetings.id, meetingId), eq(meetings.groupId, groupId)));
  revalidatePath(`/gc/${groupId}`, "layout");
  redirect(`/gc/${groupId}`);
}

/** Gera (ou troca) o link público. O link anterior para de funcionar. */
export async function regenerateShareLink(groupId: number) {
  if (!(await canAccessGroup(groupId))) return;
  const token = randomBytes(18).toString("base64url");
  await db.update(groups).set({ shareToken: token }).where(eq(groups.id, groupId));
  revalidatePath(`/gc/${groupId}`, "layout");
}

export async function disableShareLink(groupId: number) {
  if (!(await canAccessGroup(groupId))) return;
  await db.update(groups).set({ shareToken: null }).where(eq(groups.id, groupId));
  revalidatePath(`/gc/${groupId}`, "layout");
}
