import { Suspense } from "react";
import type { Metadata } from "next";
import { Link2Off, Users } from "lucide-react";
import { setPublicPresence } from "@/actions/attendance";
import { AttendanceList } from "@/components/attendance-list";
import { card } from "@/components/ui";
import { isISODate, publicDateRange } from "@/lib/dates";
import { loadListState } from "@/lib/list-data";
import { findGroupByToken } from "@/lib/public-list";

export const metadata: Metadata = {
  title: "Lista de presença",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/**
 * Lista de presença pública: cada clique é salvo na hora e o líder confirma depois.
 * Não exige login; o token do link é a autorização (e só vale para datas recentes).
 */
export default function PublicListPage({ params, searchParams }: PageProps<"/p/[token]">) {
  return (
    <div className="min-h-dvh">
      <Suspense fallback={<Skeleton />}>
        <PublicList params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function PublicList({ params, searchParams }: Pick<PageProps<"/p/[token]">, "params" | "searchParams">) {
  const { token } = await params;
  const { data } = await searchParams;
  const group = await findGroupByToken(token);
  if (!group) return <InvalidLink />;

  const { min, max } = publicDateRange();
  const date = isISODate(data) && data >= min && data <= max ? data : max;
  const { people, confirmed, recentVisitors } = await loadListState(group.id, date);

  return (
    <>
      <Header name={group.name} />
      <main className="px-4 pt-5">
        <AttendanceList
          key={date}
          mode="public"
          savePerson={setPublicPresence.bind(null, token)}
          minDate={min}
          maxDate={max}
          groupName={group.name}
          date={date}
          initialPeople={people}
          confirmed={confirmed}
          recentVisitors={recentVisitors}
        />
      </main>
    </>
  );
}

function Header({ name }: { name: string }) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex min-h-15 max-w-xl items-center gap-2.5 px-4 py-2 font-bold">
        <span className="grid size-8 place-items-center rounded-lg bg-primary text-on-primary">
          <Users className="size-4" aria-hidden />
        </span>
        {name}
      </div>
    </header>
  );
}

function InvalidLink() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className={`${card} max-w-sm p-6 text-center`}>
        <Link2Off className="mx-auto size-10 text-muted" aria-hidden />
        <h1 className="mt-3 text-lg font-bold">Link inválido ou desativado</h1>
        <p className="mt-1 text-muted">Peça o link atualizado ao líder do seu GC.</p>
      </div>
    </main>
  );
}

function Skeleton() {
  return (
    <div className="mx-auto max-w-xl space-y-2 px-4 pt-20" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-surface" />
      ))}
    </div>
  );
}
