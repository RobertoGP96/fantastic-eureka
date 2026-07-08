"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  EllipsisVertical,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  createCategory,
  deleteCategory,
  renameCategory,
  toggleCategory,
} from "@/app/actions/category-actions";
import { useUI } from "@/lib/ui-store";

export interface CategoryItem {
  id: string;
  name: string;
  kind: string;
  active: boolean;
  usageCount: number;
}

export function CategoryManager({
  kind,
  categories,
}: {
  kind: string;
  categories: CategoryItem[];
}) {
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
    const result = await createCategory({ name, kind });
    setSaving(false);
    if (result.success) {
      showToast("Categoría creada");
      setName("");
      router.refresh();
    } else {
      setError(result.error);
    }
  };

  const toggle = async (id: string) => {
    const result = await toggleCategory(id);
    if (result.success) {
      showToast(result.data.active ? "Categoría activada" : "Categoría oculta");
      router.refresh();
    } else {
      showToast(result.error);
    }
  };

  const rename = async (id: string) => {
    setSaving(true);
    const result = await renameCategory({ id, name: editName });
    setSaving(false);
    if (result.success) {
      showToast("Categoría renombrada");
      setEditingId(null);
      router.refresh();
    } else {
      showToast(result.error);
    }
  };

  const remove = async (id: string) => {
    setSaving(true);
    const result = await deleteCategory(id);
    setSaving(false);
    setConfirmDeleteId(null);
    if (result.success) {
      showToast("Categoría eliminada");
      router.refresh();
    } else {
      showToast(result.error);
    }
  };

  const requestDelete = (category: CategoryItem) => {
    // Con movimientos no se puede borrar (se perdería la clasificación);
    // avisamos directo sin pasar por la confirmación.
    if (category.usageCount > 0) {
      showToast("Tiene movimientos asociados; ocúltala en su lugar");
      return;
    }
    setConfirmDeleteId(category.id);
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
          placeholder="Nueva categoría"
          maxLength={40}
          required
        />
        <Button type="submit" disabled={saving || !name.trim()}>
          <Plus className="h-4 w-4" />
          Añadir
        </Button>
      </form>

      {error && (
        <div className="rounded-[13px] bg-danger-bg px-3.5 py-2.5 text-[12.5px] font-medium text-danger">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {categories.map((category) => (
          <div
            key={category.id}
            className={`rounded-[13px] border border-line bg-white px-3.5 py-2 ${
              category.active ? "" : "opacity-55"
            }`}
          >
            {editingId === category.id ? (
              <form
                className="flex items-center gap-2 py-0.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  void rename(category.id);
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
            ) : confirmDeleteId === category.id ? (
              <div className="flex items-center gap-2 py-0.5">
                <span className="min-w-0 flex-1 truncate text-[12px] text-muted">
                  ¿Eliminar “{category.name}”? No se puede deshacer.
                </span>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={saving}
                  onClick={() => void remove(category.id)}
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
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="min-w-0 truncate text-[13px] font-semibold text-navy">
                    {category.name}
                  </span>
                  {category.usageCount > 0 && (
                    <Badge variant="neutral" className="flex-none">
                      {category.usageCount} mov.
                    </Badge>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="flex-none"
                      aria-label={`Opciones de ${category.name}`}
                    >
                      <EllipsisVertical />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-44">
                    <DropdownMenuItem
                      onSelect={() => {
                        setEditingId(category.id);
                        setEditName(category.name);
                      }}
                    >
                      <Pencil />
                      Renombrar
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => void toggle(category.id)}>
                      {category.active ? <EyeOff /> : <Eye />}
                      {category.active ? "Ocultar" : "Activar"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => requestDelete(category)}
                    >
                      <Trash2 />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        ))}
        {categories.length === 0 && (
          <div className="rounded-[13px] border border-line bg-white px-3.5 py-4 text-center text-[12.5px] text-muted">
            Sin categorías de este tipo.
          </div>
        )}
      </div>

      <p className="text-[11.5px] text-muted">
        Las categorías con movimientos no se pueden eliminar para conservar el
        historial; ocúltalas y dejarán de aparecer al registrar.
      </p>
    </div>
  );
}
