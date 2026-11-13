import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { groups } from "@/db/schema";

/** Tokens gerados com randomBytes(18).toString("base64url") → 24 caracteres. */
const TOKEN_RE = /^[A-Za-z0-9_-]{24}$/;

/** GC dono do link público, ou null se o link não existe/foi desativado. */
export const findGroupByToken = cache(async (token: string) => {
  if (!TOKEN_RE.test(token)) return null;
  const [group] = await db
    .select({ id: groups.id, name: groups.name })
    .from(groups)
    .where(eq(groups.shareToken, token))
    .limit(1);
  return group ?? null;
});
