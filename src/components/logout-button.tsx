"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutUser } from "@/app/actions/auth-actions";

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
      className="w-full"
      disabled={saving}
      onClick={() => void logout()}
    >
      <LogOut className="h-4 w-4" />
      {saving ? "Cerrando sesión…" : "Cerrar sesión"}
    </Button>
  );
}
