"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, deleteSession } from "@/lib/session";

export type LoginState = { error?: string; username?: string } | undefined;

const schema = z.object({
  username: z.string().trim().toLowerCase().min(1, "Informe o usuário"),
  password: z.string().min(1, "Informe a senha"),
});

// Hash fixo usado quando o usuário não existe, para o tempo de resposta não
// revelar quais usuários existem.
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO5x8eTH/X0Qj0k5kV2rG2aVb5i3F3w0K";

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  const username = String(formData.get("username") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, username };

  const [user] = await db.select().from(users).where(eq(users.username, parsed.data.username)).limit(1);
  const ok = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) return { error: "Usuário ou senha incorretos", username };

  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
