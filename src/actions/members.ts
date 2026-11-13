"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { members } from "@/db/schema";
import { canAccessGroup } from "@/lib/dal";
import { sameName } from "@/lib/names";
import { kindSchema, nameSchema } from "@/lib/validation";

export type FormState = { error?: string; ok?: string } | undefined;

const addSchema = z.object({ groupId: z.coerce.number().int(), name: nameSchema, kind: kindSchema });

export async function addMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = addSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { groupId, name, kind } = parsed.data;
  if (!(await canAccessGroup(groupId))) return { error: "Sem permissão" };

  const roster = await db.select().from(members).where(eq(members.groupId, groupId));
  const existing = roster.find((m) => sameName(m.name, name));
  if (existing?.active) return { error: `${existing.name} já está no GC` };
  if (existing) {
    await db.update(members).set({ active: true, kind }).where(eq(members.id, existing.id));
  } else {
    await db.insert(members).values({ groupId, name, kind });
  }
  revalidatePath(`/gc/${groupId}`, "layout");
  return { ok: `${name} adicionado(a)` };
}

const updateSchema = z.object({
  groupId: z.coerce.number().int(),
  memberId: z.coerce.number().int(),
  name: nameSchema,
  kind: kindSchema,
});

export async function updateMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { groupId, memberId, name, kind } = parsed.data;
  if (!(await canAccessGroup(groupId))) return { error: "Sem permissão" };

  const roster = await db.select().from(members).where(eq(members.groupId, groupId));
  if (roster.some((m) => m.id !== memberId && sameName(m.name, name))) {
    return { error: "Já existe alguém com esse nome" };
  }
  await db
    .update(members)
    .set({ name, kind })
    .where(and(eq(members.id, memberId), eq(members.groupId, groupId)));
  revalidatePath(`/gc/${groupId}`, "layout");
  return { ok: "Salvo" };
}

export async function setMemberActive(groupId: number, memberId: number, active: boolean) {
  if (!(await canAccessGroup(groupId))) return;
  await db
    .update(members)
    .set({ active })
    .where(and(eq(members.id, memberId), eq(members.groupId, groupId)));
  revalidatePath(`/gc/${groupId}`, "layout");
}
