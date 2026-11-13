"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { groups, meetings } from "@/db/schema";
import { canAccessGroup } from "@/lib/dal";
import { persistAttendance } from "@/lib/attendance-service";
import { findGroupByToken } from "@/lib/public-list";
import { publicDateRange } from "@/lib/dates";
import { listSubmissionSchema, type ListSubmission } from "@/lib/validation";

export type SaveResult = { error: string } | { ok: true } | undefined;

/** Líder logado confirma a lista. Redireciona para o encontro salvo. */
export async function saveAttendance(groupId: number, raw: ListSubmission): Promise<SaveResult> {
  const parsed = listSubmissionSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const access = await canAccessGroup(groupId);
  if (!access) return { error: "Sem permissão para este GC" };
  if (parsed.data.people.length === 0) return { error: "Marque pelo menos uma pessoa" };

  const meetingId = await persistAttendance({ groupId, ...parsed.data, userId: access.userId, via: "lider" });
  revalidatePath(`/gc/${groupId}`, "layout");
  redirect(`/gc/${groupId}/encontros/${meetingId}?salvo=1`);
}

/** Qualquer pessoa com o link público confirma a lista (só datas recentes). */
export async function savePublicAttendance(token: string, raw: ListSubmission): Promise<SaveResult> {
  const parsed = listSubmissionSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const group = await findGroupByToken(token);
  if (!group) return { error: "Este link não está mais ativo. Peça um novo ao líder do GC." };

  const { min, max } = publicDateRange();
  if (parsed.data.date < min || parsed.data.date > max) {
    return { error: "Pelo link só dá para registrar encontros dos últimos 7 dias" };
  }
  if (parsed.data.people.length === 0) return { error: "Marque pelo menos uma pessoa" };

  await persistAttendance({ groupId: group.id, ...parsed.data, userId: null, via: "link" });
  revalidatePath(`/gc/${group.id}`, "layout");
  revalidatePath(`/p/${token}`);
  return { ok: true };
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
