"use client";

import { useState } from "react";
import { FolderOpen, Plus } from "lucide-react";
import { FormDrawerBody } from "@/components/form-drawer";
import { FormError } from "@/components/form-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createAccountGroup,
  deleteAccountGroup,
  renameAccountGroup,
} from "@/app/actions/group-actions";
import { runAction } from "@/lib/run-action";
import { useUI } from "@/lib/ui-store";

export interface GroupItem {
  id: string;
  name: string;
  accountCount: number;
}

/**
 * Gestión de los grupos de cuentas (vive en el drawer «grupos» de /cuentas).
 * No es un formulario de un solo envío: se crea, renombra y elimina sin
 * cerrar el drawer, y la lista llega fresca por props tras cada action.
 * Las confirmaciones son inline porque ya estamos dentro de un drawer.
 */
export function GroupManager({ groups }: { groups: GroupItem[] }) {
  const { showToast } = useUI();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const add = async () => {
    setSaving(true);
    setError(null);
    const result = await runAction(() => createAccountGroup({ name }));
    setSaving(false);
    if (result.success) {
      showToast("Grupo creado");
      setName("");
    } else {
      setError(result.error);
    }
  };

  const rename = async (id: string) => {
    setSaving(true);
    const result = await runAction(() =>
      renameAccountGroup({ id, name: editName })
    );
    setSaving(false);
    if (result.success) {
      showToast("Grupo renombrado");
      setEditingId(null);
    } else {
      showToast(result.error);
    }
  };

  const remove = async (id: string) => {
    setSaving(true);
    const result = await runAction(() => deleteAccountGroup(id));
    setSaving(false);
    setConfirmDeleteId(null);
    showToast(result.success ? "Grupo eliminado" : result.error);
  };

  return (
    <FormDrawerBody>
      <form
        className="flex gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nuevo grupo (ej. Negocio)"
          aria-label="Nombre del grupo nuevo"
          maxLength={40}
          required
        />
        <Button type="submit" disabled={saving || !name.trim()}>
          <Plus className="size-4" />
          Crear
        </Button>
      </form>

      <FormError>{error}</FormError>

      <div className="flex flex-col gap-1.5">
        {groups.map((group) => (
          <div
            key={group.id}
            className="rounded-xl border border-line bg-card px-3.5 py-2.5"
          >
            {editingId === group.id ? (
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void rename(group.id);
                }}
              >
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  aria-label="Nombre del grupo"
                  maxLength={40}
                  autoFocus
                  required
                />
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
                  onClick={() => setEditingId(null)}
                >
                  Cancelar
                </Button>
              </form>
            ) : confirmDeleteId === group.id ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 text-xs text-muted">
                  ¿Eliminar «{group.name}»? Sus cuentas pasan a «Sin grupo».
                </span>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={saving}
                  onClick={() => void remove(group.id)}
                >
                  Eliminar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={saving}
                  onClick={() => setConfirmDeleteId(null)}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="flex size-8 flex-none items-center justify-center rounded-lg bg-chip text-brand-ink">
                  <FolderOpen className="size-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-heading">
                  {group.name}
                </span>
                {group.accountCount > 0 && (
                  <Badge variant="neutral">{group.accountCount} cuentas</Badge>
                )}
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(group.id);
                      setEditName(group.name);
                    }}
                  >
                    Renombrar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmDeleteId(group.id)}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
        {groups.length === 0 && (
          <div className="rounded-xl border border-line bg-card px-3.5 py-4 text-center text-sm text-muted">
            Sin grupos todavía. Crea el primero para organizar tus cuentas.
          </div>
        )}
      </div>
    </FormDrawerBody>
  );
}
