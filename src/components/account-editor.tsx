"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteAccount, updateAccount } from "@/app/actions/account-actions";
import { useUI } from "@/lib/ui-store";

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
    <div className="flex flex-col gap-2.5 rounded-[16px] border border-line bg-white px-4 py-3">
      {editing ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void rename();
          }}
        >
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            maxLength={60}
            className="h-9"
            autoFocus
            required
          />
          <Button type="submit" size="sm" disabled={saving || !editName.trim()}>
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
        </form>
      ) : confirmDelete ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 flex-1 text-[12px] text-muted">
            {hasUsage
              ? `¿Eliminar “${name}”? Se borrarán también TODOS sus movimientos y arqueos (incluidas transferencias con otras cuentas y abonos vinculados). No se puede deshacer.`
              : `¿Eliminar “${name}”? No se puede deshacer.`}
          </span>
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
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 flex-1 text-[12.5px] font-semibold text-ink-soft">
            Gestionar cuenta
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={() => {
              setEditName(name);
              setEditing(true);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
            Renombrar
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={() => void toggleArchived()}
          >
            {archived ? (
              <ArchiveRestore className="h-3.5 w-3.5" />
            ) : (
              <Archive className="h-3.5 w-3.5" />
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
            <Trash2 className="h-3.5 w-3.5" />
            Eliminar
          </Button>
        </div>
      )}
      <p className="text-[11px] text-muted">
        Eliminar una cuenta borra también todo su historial (movimientos,
        arqueos y abonos vinculados). Si prefieres conservarlo, archívala y
        dejará de aparecer al registrar.
      </p>
    </div>
  );
}
