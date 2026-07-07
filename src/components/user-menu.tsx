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
import { cn } from "@/lib/utils";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second =
    parts.length > 1 ? parts[parts.length - 1][0] : (parts[0]?.[1] ?? "");
  return (first + second).toUpperCase() || "U";
}

/** Avatar con menú de usuario (pensado para el header de Inicio en móvil). */
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
            "rounded-full ring-2 ring-white/25 transition-[transform,box-shadow] focus-visible:ring-white/60 focus-visible:outline-none active:scale-95",
            className
          )}
        >
          <Avatar size="lg">
            <AvatarFallback className="bg-white/15 text-[13px] font-bold text-white">
              {initials(userName)}
            </AvatarFallback>
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
            <span className="truncate text-[13px] font-semibold text-navy">
              {userName}
            </span>
            <span className="truncate text-[11.5px] font-normal text-muted">
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
