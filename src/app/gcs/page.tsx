import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { getMyGroupsWithStats, requireUser } from "@/lib/dal";
import { card } from "@/components/ui";
import { LogoutButton } from "@/components/logout-button";
import { formatBR } from "@/lib/dates";
import { CreateGroupForm } from "./create-group-form";

export const metadata: Metadata = { title: "Meus GCs" };

export default function GroupsPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-surface" />}>
        <GroupList />
      </Suspense>
    </main>
  );
}

async function GroupList() {
  const user = await requireUser();
  const groups = await getMyGroupsWithStats();

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Meus GCs</h1>
          <p className="text-muted">Olá, {user.name}</p>
        </div>
        <LogoutButton />
      </div>

      {groups.length > 0 && (
        <ul className="mb-6 space-y-3">
          {groups.map((g) => (
            <li key={g.id}>
              <Link
                href={`/gc/${g.id}`}
                className={`${card} flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:border-primary`}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Users className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{g.name}</span>
                  <span className="block text-sm text-muted">
                    {g.members} membros
                    {g.lastMeeting ? ` · último encontro ${formatBR(g.lastMeeting)}` : " · sem encontros ainda"}
                  </span>
                </span>
                <ChevronRight className="size-5 text-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <CreateGroupForm firstGroup={groups.length === 0} />
    </>
  );
}
