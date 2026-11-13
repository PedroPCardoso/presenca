import { Suspense } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { requireGroup } from "@/lib/dal";
import { LogoutButton } from "@/components/logout-button";
import { GroupNav } from "@/components/group-nav";

type Params = LayoutProps<"/gc/[groupId]">["params"];

/**
 * O layout não espera nada: cabeçalho e navegação dependem da sessão,
 * então carregam dentro de <Suspense>; as páginas têm o próprio loading.tsx.
 */
export default function GroupLayout({ children, params }: LayoutProps<"/gc/[groupId]">) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex min-h-15 max-w-5xl items-center gap-3 px-4 py-2">
          <Suspense fallback={<div className="h-8 w-40 animate-pulse rounded-lg bg-bg" />}>
            <GroupHeader params={params} />
          </Suspense>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-5 pb-28 md:pb-12">{children}</main>

      <Suspense fallback={null}>
        <BottomNav params={params} />
      </Suspense>
    </div>
  );
}

async function GroupHeader({ params }: { params: Params }) {
  const { groupId } = await params;
  const { group } = await requireGroup(Number(groupId));
  const base = `/gc/${group.id}`;
  return (
    <>
      <Link href={base} className="flex min-h-11 min-w-0 items-center gap-2.5 font-bold">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-on-primary">
          <Users className="size-4" aria-hidden />
        </span>
        <span className="truncate">{group.name}</span>
      </Link>
      <div className="ml-auto flex items-center">
        <GroupNav base={base} className="hidden md:flex" />
        <LogoutButton />
      </div>
    </>
  );
}

/** Navegação inferior no celular. */
async function BottomNav({ params }: { params: Params }) {
  const { groupId } = await params;
  const { group } = await requireGroup(Number(groupId));
  return (
    <GroupNav
      base={`/gc/${group.id}`}
      variant="bottom"
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    />
  );
}
