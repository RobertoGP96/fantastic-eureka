"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, UserRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutUser } from "@/app/actions/auth-actions";
import { initials as nameInitials } from "@/lib/initials";
import { cn } from "@/lib/utils";

/**
 * Iniciales para el avatar de usuario: nombre + apellido, o las dos primeras
 * letras. La lógica es la de `src/lib/initials.ts` (la misma de los
 * contactos); aquí solo cambia el comodín.
 */
export function initials(name: string): string {
  return nameInitials(name, "U");
}

/** Avatar con menú de usuario (cabecera de Inicio en móvil). */
export function UserMenu({
  userName,
  userEmail,
  className,
}: {
  userName: string;
  userEmail: string;
  className?: string;
}) {
  const router = useRouter();

  const logout = async () => {
    await logoutUser();
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Menú de usuario"
          className={cn(
            "rounded-full ring-1 ring-line transition-transform focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-95",
            className
          )}
        >
          <Avatar size="lg">
            <AvatarFallback>{initials(userName)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="min-w-52 rounded-xl border-line"
      >
        <DropdownMenuLabel>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold text-heading">
              {userName}
            </span>
            <span className="truncate text-xs font-normal text-muted">
              {userEmail}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/perfil">
            <UserRound />
            Mi perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => void logout()}
        >
          <LogOut />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
