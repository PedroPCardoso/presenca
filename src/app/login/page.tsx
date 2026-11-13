import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { getCurrentUser } from "@/lib/dal";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <Suspense fallback={null}>
        <RedirectIfLoggedIn />
      </Suspense>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-primary text-on-primary">
            <Users className="size-7" aria-hidden />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Presença GC</h1>
          <p className="mt-1 text-muted">Entre para registrar os encontros do seu GC</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}

async function RedirectIfLoggedIn() {
  if (await getCurrentUser()) redirect("/");
  return null;
}
