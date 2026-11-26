"use client";

import { useState } from "react";
import { EllipsisVertical, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { ConfirmDrawer } from "@/components/confirm-drawer";
import { DenominationForm } from "@/components/denomination-form";
import { EMPTY_STATE_CTA } from "@/components/empty-state";
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
  deleteDenomination,
  toggleDenomination,
} from "@/app/actions/currency-actions";
import {
  DENOMINATION_KINDS,
  DENOMINATION_KIND_LABELS,
  type DenominationKind,
} from "@/lib/domain";
import { fmtMinor, type DisplayCurrency } from "@/lib/format";
import { runAction } from "@/lib/run-action";
import { useUI } from "@/lib/ui-store";
import { cn } from "@/lib/utils";
import { NEW_DENOMINATION_PANEL } from "../panels";

export interface DenominationItem {
  id: string;
  valueMinor: number;
  kind: string;
  active: boolean;
  usageCount: number;
}

/**
 * Billetes y monedas de una divisa, agrupados por tipo. El alta vive en el
 * drawer de la página; editar y eliminar, en drawers propios. Ocultar/activar
 * es de un toque, en el ⋮.
 */
export function DenominationManager({
  currency,
  denominations,
}: {
  currency: DisplayCurrency & { id: string };
  denominations: DenominationItem[];
}) {
  const { showToast } = useUI();
  // El elemento y el «abierto» van aparte: al cerrar, el drawer sigue
  // pintando la denominación mientras dura su animación de salida.
  const [editing, setEditing] = useState<DenominationItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState<DenominationItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const toggle = async (id: string) => {
    const result = await runAction(() => toggleDenomination(id));
    showToast(
      result.success
        ? result.data.active
          ? "Denominación activada"
          : "Denominación oculta"
        : result.error
    );
  };

  const remove = async () => {
    if (!deleting) return null;
    const result = await runAction(() => deleteDenomination(deleting.id));
    if (!result.success) return result.error;
    showToast("Denominación eliminada");
    setDeleteOpen(false);
    return null;
  };

  // Las usadas en arqueos no se editan ni borran: alteraría el historial.
  const requestEdit = (denomination: DenominationItem) => {
    if (denomination.usageCount > 0) {
      showToast("Ya se usó en arqueos; ocúltala y crea una nueva");
      return;
    }
    setEditing(denomination);
    setEditOpen(true);
  };

  const requestDelete = (denomination: DenominationItem) => {
    if (denomination.usageCount > 0) {
      showToast("Se usó en arqueos guardados; ocúltala en su lugar");
      return;
    }
    setDeleting(denomination);
    setDeleteOpen(true);
  };

  const groups = DENOMINATION_KINDS.map((groupKind) => ({
    kind: groupKind,
    items: denominations.filter((d) => d.kind === groupKind),
  }));

  return (
    <div className="flex flex-col gap-5">
      {denominations.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-card px-4 py-6 text-center">
          <p className="text-sm text-muted">
            Esta moneda todavía no tiene billetes ni monedas.
          </p>
          <PanelButton
            panel={NEW_DENOMINATION_PANEL}
            className={EMPTY_STATE_CTA}
          >
            Nueva denominación
          </PanelButton>
        </div>
      )}

      {groups.map(
        (group) =>
          group.items.length > 0 && (
            <Section
              key={group.kind}
              title={`${DENOMINATION_KIND_LABELS[group.kind as DenominationKind]}s`}
            >
              <div className="anim-stagger grid grid-cols-2 gap-1.5 @lg:grid-cols-3 @3xl:grid-cols-4">
                {group.items.map((denomination) => {
                  const label = fmtMinor(denomination.valueMinor, currency);
                  return (
                    <div
                      key={denomination.id}
                      className={cn(
                        "flex items-center justify-between gap-1.5 rounded-xl border border-line bg-card py-1 pr-1 pl-3",
                        !denomination.active && "opacity-55"
                      )}
                    >
                      <span className="money truncate text-sm font-bold text-heading">
                        {label}
                      </span>
                      <div className="flex flex-none items-center gap-1">
                        {denomination.usageCount > 0 && (
                          <Badge variant="neutral">
                            {denomination.usageCount}
                          </Badge>
                        )}
                        {/* modal={false}: el menú abre drawers (diálogos
                            modales). Con el menú también modal, los dos se
                            disputan el foco y el bloqueo de punteros del
                            body al cerrarse uno y abrirse el otro. */}
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label={`Opciones de ${label}`}
                            >
                              <EllipsisVertical />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="min-w-40 rounded-xl border-line"
                          >
                            <DropdownMenuItem
                              onSelect={() => requestEdit(denomination)}
                            >
                              <Pencil />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => void toggle(denomination.id)}
                            >
                              {denomination.active ? <EyeOff /> : <Eye />}
                              {denomination.active ? "Ocultar" : "Activar"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => requestDelete(denomination)}
                            >
                              <Trash2 />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )
      )}

      <p className="text-xs text-muted">
        Las denominaciones usadas en arqueos guardados no se pueden editar ni
        eliminar; ocúltalas y dejarán de aparecer en los arqueos nuevos.
      </p>

      <FormDrawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar denominación"
      >
        {editing && (
          <DenominationForm
            key={editing.id}
            currency={currency}
            denomination={editing}
          />
        )}
      </FormDrawer>

      <ConfirmDrawer
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`¿Eliminar ${deleting ? fmtMinor(deleting.valueMinor, currency) : ""}?`}
        description="La denominación deja de existir para esta moneda. No se puede deshacer."
        onConfirm={remove}
      />
    </div>
  );
}
