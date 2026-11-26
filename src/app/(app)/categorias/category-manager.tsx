"use client";

import { useState } from "react";
import {
  EllipsisVertical,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { CategoryForm } from "@/components/category-form";
import { ConfirmDrawer } from "@/components/confirm-drawer";
import { FormDrawer } from "@/components/form-drawer";
import { PanelButton } from "@/components/panel-button";
import { Section } from "@/components/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  deleteCategory,
  toggleCategory,
} from "@/app/actions/category-actions";
import { usePanel } from "@/hooks/use-panel";
import { type CategoryKind } from "@/lib/domain";
import { runAction } from "@/lib/run-action";
import { useUI } from "@/lib/ui-store";
import { cn } from "@/lib/utils";
import { KIND_PARAM, NEW_CATEGORY_PANEL } from "./panels";

export interface CategoryItem {
  id: string;
  name: string;
  kind: string;
  active: boolean;
  usageCount: number;
}

/**
 * Columna con las categorías de UN tipo (gastos o ingresos). Crear se hace
 * en el drawer de la página (`NewCategoryDrawer`); renombrar y eliminar, en
 * drawers propios de la columna. Ocultar/activar es de un toque, en el ⋮.
 */
export function CategoryManager({
  kind,
  title,
  categories,
  className,
}: {
  kind: CategoryKind;
  title: string;
  categories: CategoryItem[];
  className?: string;
}) {
  const { showToast } = useUI();
  // El elemento y el «abierto» van aparte: al cerrar, el drawer sigue
  // pintando la categoría mientras dura su animación de salida.
  const [editing, setEditing] = useState<CategoryItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState<CategoryItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const toggle = async (id: string) => {
    const result = await runAction(() => toggleCategory(id));
    showToast(
      result.success
        ? result.data.active
          ? "Categoría activada"
          : "Categoría oculta"
        : result.error
    );
  };

  const remove = async () => {
    if (!deleting) return null;
    const result = await runAction(() => deleteCategory(deleting.id));
    if (!result.success) return result.error;
    showToast("Categoría eliminada");
    setDeleteOpen(false);
    return null;
  };

  const requestDelete = (category: CategoryItem) => {
    // Con movimientos no se puede borrar (se perdería la clasificación);
    // avisamos directo sin pasar por la confirmación.
    if (category.usageCount > 0) {
      showToast("Tiene movimientos asociados; ocúltala en su lugar");
      return;
    }
    setDeleting(category);
    setDeleteOpen(true);
  };

  return (
    <Section
      title={title}
      className={className}
      action={
        <PanelButton
          panel={NEW_CATEGORY_PANEL}
          params={{ tipo: KIND_PARAM[kind] }}
          aria-label={`Añadir categoría de ${title.toLowerCase()}`}
          className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-chip px-3 text-xs font-semibold text-brand-ink transition-colors hover:bg-brand-soft/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
        >
          <Plus className="size-3.5" />
          Añadir
        </PanelButton>
      }
    >
      <div className="anim-stagger flex flex-col gap-1.5">
        {categories.map((category) => (
          <div
            key={category.id}
            className={cn(
              "flex items-center justify-between gap-2 rounded-xl border border-line bg-card py-1 pr-1 pl-3.5",
              !category.active && "opacity-55"
            )}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="min-w-0 truncate text-sm font-semibold text-heading">
                {category.name}
              </span>
              {category.usageCount > 0 && (
                <Badge variant="neutral" className="flex-none">
                  {category.usageCount} mov.
                </Badge>
              )}
              {!category.active && (
                <Badge variant="neutral" className="flex-none">
                  Oculta
                </Badge>
              )}
            </div>
            {/* modal={false}: el menú abre drawers (diálogos modales). Con el
                menú también modal, los dos se disputan el foco y el bloqueo
                de punteros del body al cerrarse uno y abrirse el otro. */}
            <DropdownMenu modal={false}>
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
              <DropdownMenuContent
                align="end"
                className="min-w-44 rounded-xl border-line"
              >
                <DropdownMenuItem
                  onSelect={() => {
                    setEditing(category);
                    setEditOpen(true);
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
        ))}
        {categories.length === 0 && (
          <div className="rounded-xl border border-line bg-card px-3.5 py-4 text-center text-sm text-muted">
            Sin categorías de este tipo.
          </div>
        )}
      </div>

      <FormDrawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Renombrar categoría"
      >
        {editing && (
          <CategoryForm
            key={editing.id}
            category={{ id: editing.id, name: editing.name }}
          />
        )}
      </FormDrawer>

      <ConfirmDrawer
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`¿Eliminar «${deleting?.name ?? ""}»?`}
        description="La categoría desaparece de los formularios. No se puede deshacer."
        onConfirm={remove}
      />
    </Section>
  );
}

/**
 * Drawer de alta de la página. El tipo inicial viene del botón que lo abre
 * (parámetro `tipo` del panel: cada columna pasa el suyo) y, si no, de la
 * pestaña visible; dentro del formulario se puede cambiar.
 */
export function NewCategoryDrawer({
  fallbackKind,
}: {
  fallbackKind: CategoryKind;
}) {
  const { isOpen, params, close, closeAndGo } =
    usePanel<"tipo">(NEW_CATEGORY_PANEL);
  const defaultKind: CategoryKind =
    params.tipo === KIND_PARAM.INCOME
      ? "INCOME"
      : params.tipo === KIND_PARAM.EXPENSE
        ? "EXPENSE"
        : fallbackKind;

  return (
    <FormDrawer
      open={isOpen}
      onClose={close}
      onCloseAndGo={closeAndGo}
      title="Nueva categoría"
      description="Para clasificar tus movimientos al registrarlos."
    >
      <CategoryForm defaultKind={defaultKind} />
    </FormDrawer>
  );
}
