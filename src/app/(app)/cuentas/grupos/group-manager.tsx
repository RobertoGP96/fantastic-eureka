"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  createAccountGroup,
  deleteAccountGroup,
  renameAccountGroup,
} from "@/app/actions/group-actions";
import { useUI } from "@/lib/ui-store";

export interface GroupItem {
  id: string;
  name: string;
  accountCount: number;
}

export function GroupManager({ groups }: { groups: GroupItem[] }) {
  const router = useRouter();
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
    const result = await createAccountGroup({ name });
    setSaving(false);
    if (result.success) {
      showToast("Grupo creado");
      setName("");
      router.refresh();
    } else {
      setError(result.error);
    }
  };

  const rename = async (id: string) => {
    setSaving(true);
    const result = await renameAccountGroup({ id, name: editName });
    setSaving(false);
    if (result.success) {
      showToast("Grupo renombrado");
      setEditingId(null);
      router.refresh();
    } else {
      showToast(result.error);
    }
  };

  const remove = async (id: string) => {
    setSaving(true);
    const result = await deleteAccountGroup(id);
    setSaving(false);
    setConfirmDeleteId(null);
    if (result.success) {
      showToast("Grupo eliminado");
      router.refresh();
    } else {
      showToast(result.error);
    }
  };

  return (
    <div className="flex flex-col gap-3">
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
          maxLength={40}
          required
        />
        <Button type="submit" disabled={saving || !name.trim()}>
          <Plus className="h-4 w-4" />
          Crear
        </Button>
      </form>

      {error && (
        <div className="rounded-[13px] bg-danger-bg px-3.5 py-2.5 text-[12.5px] font-medium text-danger">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {groups.map((group) => (
          <div
            key={group.id}
            className="rounded-[13px] border border-line bg-white px-3.5 py-2.5"
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
                  maxLength={40}
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
                  onClick={() => setEditingId(null)}
                >
                  Cancelar
                </Button>
              </form>
            ) : confirmDeleteId === group.id ? (
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[12px] text-muted">
                  ¿Eliminar “{group.name}”? Sus cuentas pasan a “Sin grupo”.
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
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] bg-chip text-brand">
                  <FolderOpen className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-navy">
                  {group.name}
                </span>
                {group.accountCount > 0 && (
                  <Badge variant="neutral">{group.accountCount} cuentas</Badge>
                )}
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
            )}
          </div>
        ))}
        {groups.length === 0 && (
          <div className="rounded-[13px] border border-line bg-white px-3.5 py-4 text-center text-[12.5px] text-muted">
            Sin grupos todavía. Crea el primero para organizar tus cuentas.
          </div>
        )}
      </div>
    </div>
  );
}
