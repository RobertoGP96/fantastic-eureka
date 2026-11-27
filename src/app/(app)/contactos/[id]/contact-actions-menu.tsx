"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GitMerge, Pencil, Trash2 } from "lucide-react";
import { ConfirmDrawer } from "@/components/confirm-drawer";
import {
  FormDrawer,
  FormDrawerBody,
  FormDrawerFooter,
} from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { deleteContact } from "@/app/actions/contact-actions";
import { openPanel } from "@/hooks/use-panel";
import { runAction } from "@/lib/run-action";
import { useUI } from "@/lib/ui-store";
import { EDIT_CONTACT_PANEL, MERGE_CONTACT_PANEL } from "./panels";

/**
 * Acciones secundarias de la ficha: editar, fusionar y eliminar. Eliminar
 * solo procede sin deudas; con deudas se explica por qué y se ofrece
 * fusionar (el servicio lo bloquea igualmente).
 */
export function ContactActionsMenu({
  contactId,
  contactName,
  debtCount,
  planCount,
  canMerge,
}: {
  contactId: string;
  contactName: string;
  debtCount: number;
  /** Mensualidades sueltas que quedarían «Sin contacto». */
  planCount: number;
  /** Hay otro contacto con el que fusionar. */
  canMerge: boolean;
}) {
  const router = useRouter();
  const { showToast } = useUI();
  const [deleting, setDeleting] = useState(false);

  const remove = async () => {
    const result = await runAction(() => deleteContact(contactId));
    if (!result.success) return result.error;
    showToast("Contacto eliminado");
    // Diferido: navegar en el mismo tick en que resuelve la action hace que
    // Next descarte su resultado.
    setTimeout(() => router.replace("/contactos"), 0);
    return null;
  };

  const blocked = debtCount > 0;

  return (
    <>
      <div className="flex flex-wrap items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openPanel(EDIT_CONTACT_PANEL)}
        >
          <Pencil className="size-3.5" />
          Editar
        </Button>
        {canMerge && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openPanel(MERGE_CONTACT_PANEL)}
          >
            <GitMerge className="size-3.5" />
            Fusionar
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="text-danger hover:bg-danger-bg hover:text-danger"
          onClick={() => setDeleting(true)}
        >
          <Trash2 className="size-3.5" />
          Eliminar
        </Button>
      </div>

      {blocked ? (
        <FormDrawer
          open={deleting}
          onClose={() => setDeleting(false)}
          title="No se puede eliminar todavía"
          side="bottom"
        >
          <FormDrawerBody>
            <p className="text-sm text-ink-soft">
              «{contactName}» tiene {debtCount} deuda
              {debtCount === 1 ? " registrada" : "s registradas"}. Elimina
              antes esas deudas
              {canMerge
                ? " o fusiona este contacto con otro para conservarlas."
                : "."}
            </p>
          </FormDrawerBody>
          <FormDrawerFooter>
            <Button
              variant="ghost"
              className="flex-none"
              onClick={() => setDeleting(false)}
            >
              Entendido
            </Button>
            {canMerge && (
              <Button
                className="flex-1"
                onClick={() => {
                  setDeleting(false);
                  openPanel(MERGE_CONTACT_PANEL);
                }}
              >
                <GitMerge className="size-4" />
                Fusionar con otro
              </Button>
            )}
          </FormDrawerFooter>
        </FormDrawer>
      ) : (
        <ConfirmDrawer
          open={deleting}
          onClose={() => setDeleting(false)}
          title="¿Eliminar el contacto?"
          description={
            planCount > 0
              ? `Se elimina «${contactName}». ${planCount === 1 ? "Su mensualidad queda" : `Sus ${planCount} mensualidades quedan`} «Sin contacto». No se puede deshacer.`
              : `Se elimina «${contactName}». No se puede deshacer.`
          }
          onConfirm={remove}
        />
      )}
    </>
  );
}
