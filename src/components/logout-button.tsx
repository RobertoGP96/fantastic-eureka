"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutUser } from "@/app/actions/auth-actions";

// Solo se usa en /mas: a todo el ancho en móvil y con su ancho natural
// cuando la tarjeta de perfil pasa a una fila (`@2xl/main`).
export function LogoutButton() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const logout = async () => {
    setSaving(true);
    await logoutUser();
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <Button
      variant="outline"
      className="w-full flex-none @2xl/main:w-auto"
      disabled={saving}
      onClick={() => void logout()}
    >
      <LogOut className="size-4" />
      {saving ? "Cerrando sesión…" : "Cerrar sesión"}
    </Button>
  );
}
