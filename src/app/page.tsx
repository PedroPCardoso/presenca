import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getMyGroups, requireUser } from "@/lib/dal";
import { card } from "@/components/ui";
import { LogoutButton } from "@/components/logout-button";

export default function Home() {
  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-surface" />}>
        <GroupPicker />
      </Suspense>
    </main>
  );
}

/** Com um GC só, vai direto para ele. */
async function GroupPicker() {
  const user = await requireUser();
  const groups = await getMyGroups();
  if (groups.length === 1) redirect(`/gc/${groups[0].id}`);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Olá, {user.name}</h1>
        <LogoutButton />
      </div>
      {groups.length === 0 ? (
        <p className="text-muted">Você ainda não lidera nenhum GC.</p>
      ) : (
        <ul className="space-y-3">
          {groups.map((g) => (
            <li key={g.id}>
              <Link
                href={`/gc/${g.id}`}
                className={`${card} flex min-h-14 items-center justify-between px-5 font-semibold hover:border-primary`}
              >
                {g.name}
                <ChevronRight className="size-5 text-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
