import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getMyGroups } from "@/lib/dal";

/** Entrada: com um GC só vai direto para ele; senão, para a lista de GCs. */
export default function Home() {
  return (
    <Suspense fallback={null}>
      <Redirect />
    </Suspense>
  );
}

async function Redirect() {
  const groups = await getMyGroups();
  redirect(groups.length === 1 ? `/gc/${groups[0].id}` : "/gcs");
  return null;
}
