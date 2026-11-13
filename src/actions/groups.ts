"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { groupLeaders, groups } from "@/db/schema";
import { readSession } from "@/lib/session";

export type GroupFormState = { error?: string } | undefined;

const schema = z.object({
  name: z
    .string()
    .transform((s) => s.trim().replace(/\s+/g, " "))
    .pipe(z.string().min(2, "Informe o nome do GC").max(60, "Nome muito longo")),
});

/** Cria um GC e torna o usuário logado líder dele. */
export async function createGroup(_prev: GroupFormState, formData: FormData): Promise<GroupFormState> {
  const userId = await readSession();
  if (!userId) redirect("/login");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const groupId = await db.transaction(async (tx) => {
    const [group] = await tx.insert(groups).values({ name: parsed.data.name }).returning({ id: groups.id });
    await tx.insert(groupLeaders).values({ groupId: group.id, userId });
    return group.id;
  });

  revalidatePath("/gcs");
  redirect(`/gc/${groupId}/membros?novo=1`);
}
