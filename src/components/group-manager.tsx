"use client";

import { useState } from "react";
import { FolderOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { FormDrawerBody } from "@/components/form-drawer";
import { FormError } from "@/components/form-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

// Alto mínimo común a los tres estados de una fila (ver, renombrar y
// confirmar el borrado): así la lista no salta al pasar de uno a otro.
const ROW = "flex min-h-11 items-center dense:min-h-9";

// Acciones de fila: solo icono (el drawer es estrecho y los dos rótulos no
// dejan sitio al nombre); el texto sigue en el DOM para lectores de
// pantalla. En táctil el área de toque sube a 44 px.
const ROW_ACTION = "min-h-11 min-w-11 dense:min-h-8 dense:min-w-8";

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
        className="flex gap-2"
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
        <Button
          type="submit"
          className="flex-none"
          disabled={saving || !name.trim()}
        >
          <Plus className="size-4" />
          Crear
        </Button>
      </form>

      <FormError>{error}</FormError>

      {groups.length === 0 ? (
        <Card dashed className="py-6 text-center text-sm text-muted">
          Sin grupos todavía. Crea el primero para organizar tus cuentas.
        </Card>
      ) : (
        // UNA tarjeta con una fila por grupo.
        <Card padding="none" className="divide-y divide-line-2">
          {groups.map((group) => (
            <div key={group.id} className="px-4 py-2.5">
              {editingId === group.id ? (
                <form
                  className={`${ROW} flex-wrap justify-end gap-2`}
                  onSubmit={(e) => {
                    e.preventDefault();
                    void rename(group.id);
                  }}
                >
                  {/* basis-40: si campo y botones no caben en una línea, la
                      pareja de botones baja junta. */}
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    aria-label="Nombre del grupo"
                    maxLength={40}
                    className="grow basis-40"
                    autoFocus
                    required
                  />
                  <div className="flex flex-none items-center gap-2">
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
                  </div>
                </form>
              ) : confirmDeleteId === group.id ? (
                // basis-52: si el aviso no cabe junto a los botones, ocupa su
                // propia línea y la pareja de botones baja junta (truncado no
                // se leía qué pasa con las cuentas).
                <div className={`${ROW} flex-wrap justify-end gap-2`}>
                  <span className="min-w-0 grow basis-52 text-xs break-words text-muted">
                    ¿Eliminar «{group.name}»? Sus cuentas pasan a «Sin grupo».
                  </span>
                  <div className="flex flex-none items-center gap-2">
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
                </div>
              ) : (
                <div className={`${ROW} gap-3`}>
                  <span className="flex size-9 flex-none items-center justify-center rounded-xl bg-chip text-brand-ink">
                    <FolderOpen className="size-4" />
                  </span>
                  {/* Nombre e insignia comparten línea si caben; si no, la
                      insignia baja y el nombre se trunca. */}
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="max-w-full min-w-0 truncate text-sm font-medium text-heading">
                      {group.name}
                    </span>
                    {group.accountCount > 0 && (
                      <Badge variant="neutral" className="flex-none">
                        {group.accountCount}{" "}
                        {group.accountCount === 1 ? "cuenta" : "cuentas"}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-none items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Renombrar"
                      className={ROW_ACTION}
                      onClick={() => {
                        setEditingId(group.id);
                        setEditName(group.name);
                      }}
                    >
                      <Pencil className="size-3.5" />
                      <span className="sr-only">Renombrar</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Eliminar"
                      className={`${ROW_ACTION} text-danger hover:text-danger`}
                      onClick={() => setConfirmDeleteId(group.id)}
                    >
                      <Trash2 className="size-3.5" />
                      <span className="sr-only">Eliminar</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </Card>
      )}
    </FormDrawerBody>
  );
}
