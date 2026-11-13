import { LogOut } from "lucide-react";
import { logout } from "@/actions/auth";
import { btn } from "./ui";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button type="submit" className={`${btn.ghost} px-3`} aria-label="Sair">
        <LogOut className="size-5" aria-hidden />
        <span className="hidden sm:inline">Sair</span>
      </button>
    </form>
  );
}
