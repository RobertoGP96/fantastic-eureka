"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { deleteAccount, updateAccount } from "@/app/actions/account-actions";
import { useUI } from "@/lib/ui-store";

// Confirmar/cancelar van en un bloque: si no caben junto al campo o al aviso,
// bajan los dos a la vez (sueltos, se partían uno en cada línea).
const BUTTON_PAIR = "flex flex-none items-center gap-2";

/**
 * Gestión de la cuenta desde su detalle: renombrar, archivar/activar y
 * eliminar. Eliminar borra también todo el historial de la cuenta
 * (movimientos, arqueos y abonos vinculados), así que la confirmación
 * inline avisa explícitamente cuando la cuenta tiene uso.
 */
export function AccountEditor({
  accountId,
  name,
  archived,
  hasUsage,
}: {
  accountId: string;
  name: string;
  archived: boolean;
  hasUsage: boolean;
}) {
  const router = useRouter();
  const { showToast } = useUI();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  const rename = async () => {
    setSaving(true);
    const result = await updateAccount({ id: accountId, name: editName });
    setSaving(false);
    if (result.success) {
      showToast("Cuenta renombrada");
      setEditing(false);
      router.refresh();
    } else {
      showToast(result.error);
    }
  };

  const toggleArchived = async () => {
    setSaving(true);
    const result = await updateAccount({
      id: accountId,
      name,
      archived: !archived,
    });
    setSaving(false);
    if (result.success) {
      showToast(archived ? "Cuenta activada" : "Cuenta archivada");
      router.refresh();
    } else {
      showToast(result.error);
    }
  };

  const remove = async () => {
    setSaving(true);
    const result = await deleteAccount(accountId);
    setSaving(false);
    setConfirmDelete(false);
    if (result.success) {
      showToast("Cuenta eliminada");
      router.push("/cuentas");
      router.refresh();
    } else {
      showToast(result.error);
    }
  };

  const requestDelete = () => {
    setConfirmDelete(true);
  };

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-heading">Gestionar cuenta</h2>
      {editing ? (
        // En la columna lateral estrecha el campo (basis-40) ocupa su propia
        // línea y la pareja de botones baja junta, en vez de encogerlo hasta
        // no dejar ver el nombre.
        <form
          className="flex flex-wrap items-center justify-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void rename();
          }}
        >
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            maxLength={60}
            className="grow basis-40"
            autoFocus
            required
          />
          <div className={BUTTON_PAIR}>
            <Button
              type="submit"
              size="sm"
              disabled={saving || !editName.trim()}
            >
              Guardar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={saving}
              onClick={() => setEditing(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : confirmDelete ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="min-w-0 grow basis-52 text-xs break-words text-muted">
            {hasUsage
              ? `¿Eliminar “${name}”? Se borrarán también TODOS sus movimientos y arqueos (incluidas transferencias con otras cuentas y abonos vinculados). No se puede deshacer.`
              : `¿Eliminar “${name}”? No se puede deshacer.`}
          </span>
          <div className={BUTTON_PAIR}>
            <Button
              size="sm"
              variant="danger"
              disabled={saving}
              onClick={() => void remove()}
            >
              Eliminar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={saving}
              onClick={() => setConfirmDelete(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={() => {
              setEditName(name);
              setEditing(true);
            }}
          >
            <Pencil className="size-3.5" />
            Renombrar
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
            onClick={requestDelete}
          >
            <Trash2 className="size-3.5" />
            Eliminar
          </Button>
        </div>
      )}
      <p className="text-xs text-muted">
        Eliminar una cuenta borra también todo su historial (movimientos,
        arqueos y abonos vinculados). Si prefieres conservarlo, archívala y
        dejará de aparecer al registrar.
      </p>
    </Card>
  );
}
