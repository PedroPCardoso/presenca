import "server-only";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { groupLeaders, groups, meetings, members, users } from "@/db/schema";
import { readSession } from "./session";

/**
 * Camada de acesso a dados: toda leitura/escrita passa por aqui para
 * garantir que existe sessão e que o usuário lidera o GC pedido.
 */

export const getCurrentUser = cache(async () => {
  const userId = await readSession();
  if (!userId) return null;
  const [user] = await db
    .select({ id: users.id, name: users.name, username: users.username })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user ?? null;
});

export const requireUser = cache(async () => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
});

export const getMyGroups = cache(async () => {
  const user = await requireUser();
  return db
    .select({ id: groups.id, name: groups.name })
    .from(groups)
    .innerJoin(groupLeaders, eq(groupLeaders.groupId, groups.id))
    .where(eq(groupLeaders.userId, user.id))
    .orderBy(groups.name);
});

/** GCs do usuário com nº de membros ativos e data do último encontro. */
export const getMyGroupsWithStats = cache(async () => {
  const user = await requireUser();
  return db
    .select({
      id: groups.id,
      name: groups.name,
      members: sql<number>`(select count(*)::int from ${members} where ${members.groupId} = ${groups.id} and ${members.active})`,
      lastMeeting: sql<
        string | null
      >`(select max(${meetings.date})::text from ${meetings} where ${meetings.groupId} = ${groups.id} and ${meetings.confirmed})`,
    })
    .from(groups)
    .innerJoin(groupLeaders, eq(groupLeaders.groupId, groups.id))
    .where(eq(groupLeaders.userId, user.id))
    .orderBy(groups.name);
});

/** Garante que o usuário logado lidera o GC. 404 caso contrário (não revela que existe). */
export const requireGroup = cache(async (groupId: number) => {
  const user = await requireUser();
  if (!Number.isInteger(groupId)) notFound();
  const [group] = await db
    .select({ id: groups.id, name: groups.name })
    .from(groups)
    .innerJoin(groupLeaders, eq(groupLeaders.groupId, groups.id))
    .where(and(eq(groups.id, groupId), eq(groupLeaders.userId, user.id)))
    .limit(1);
  if (!group) notFound();
  return { user, group };
});

/** Versão para Server Actions: não redireciona, devolve null. */
export async function canAccessGroup(groupId: number) {
  const userId = await readSession();
  if (!userId || !Number.isInteger(groupId)) return null;
  const [row] = await db
    .select({ groupId: groupLeaders.groupId })
    .from(groupLeaders)
    .where(and(eq(groupLeaders.groupId, groupId), eq(groupLeaders.userId, userId)))
    .limit(1);
  return row ? { userId } : null;
}
