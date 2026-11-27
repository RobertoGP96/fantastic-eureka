"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { ConfirmDrawer } from "@/components/confirm-drawer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { deleteAccount, updateAccount } from "@/app/actions/account-actions";
import { openPanel } from "@/hooks/use-panel";
import { runAction } from "@/lib/run-action";
import { useUI } from "@/lib/ui-store";

/**
 * Tarjeta «Gestionar cuenta» del detalle: editar (drawer `editPanel`),
 * archivar/activar y eliminar. Eliminar borra también todo el historial de
 * la cuenta (movimientos, arqueos y abonos vinculados), así que la
 * confirmación lo avisa explícitamente cuando la cuenta tiene uso.
 */
export function AccountManage({
  accountId,
  name,
  archived,
  hasUsage,
  editPanel,
  children,
}: {
  accountId: string;
  name: string;
  archived: boolean;
  hasUsage: boolean;
  /** Nombre del drawer de edición que hospeda la página. */
  editPanel: string;
  /** Resumen de lo editable (icono, moneda, grupo), sobre los botones. */
  children?: ReactNode;
}) {
  const router = useRouter();
  const { showToast } = useUI();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggleArchived = async () => {
    setSaving(true);
    const result = await runAction(() =>
      updateAccount({ id: accountId, name, archived: !archived })
    );
    setSaving(false);
    showToast(
      result.success
        ? archived
          ? "Cuenta activada"
          : "Cuenta archivada"
        : result.error
    );
  };

  const remove = async () => {
    const result = await runAction(() => deleteAccount(accountId));
    if (!result.success) return result.error;
    showToast("Cuenta eliminada");
    // Diferido: navegar en el mismo tick en que resuelve la action hace que
    // Next descarte su resultado.
    setTimeout(() => router.replace("/cuentas"), 0);
    return null;
  };

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-heading">Gestionar cuenta</h2>
      {children}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={saving}
          onClick={() => openPanel(editPanel)}
        >
          <Pencil className="size-3.5" />
          Editar
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={saving}
          onClick={() => void toggleArchived()}
        >
          {archived ? (
            <ArchiveRestore className="size-3.5" />
          ) : (
            <Archive className="size-3.5" />
          )}
          {archived ? "Activar" : "Archivar"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-danger hover:text-danger"
          disabled={saving}
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="size-3.5" />
          Eliminar
        </Button>
      </div>
      <p className="text-xs text-muted">
        Eliminar una cuenta borra también todo su historial (movimientos,
        arqueos y abonos vinculados). Si prefieres conservarlo, archívala y
        dejará de aparecer al registrar.
      </p>

      <ConfirmDrawer
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`¿Eliminar «${name}»?`}
        description={
          hasUsage
            ? "Se borrarán también TODOS sus movimientos y arqueos (incluidas transferencias con otras cuentas y abonos vinculados). No se puede deshacer."
            : "No se puede deshacer."
        }
        onConfirm={remove}
      />
    </Card>
  );
}
