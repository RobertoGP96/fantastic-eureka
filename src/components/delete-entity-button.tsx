"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDrawer } from "@/components/confirm-drawer";
import { deleteDebt } from "@/app/actions/debt-actions";
import { deletePlan } from "@/app/actions/plan-actions";
import { deleteTransaction } from "@/app/actions/transaction-actions";
import { runAction } from "@/lib/run-action";
import { useUI } from "@/lib/ui-store";

const LABELS = {
  debt: {
    button: "Eliminar deuda",
    title: "¿Eliminar la deuda?",
    warning:
      "Se borran sus abonos y planes de cuotas; los movimientos de las cuentas se conservan. No se puede deshacer.",
    done: "Deuda eliminada",
    redirect: "/deudas",
  },
  plan: {
    button: "Eliminar mensualidad",
    title: "¿Eliminar la mensualidad?",
    warning:
      "Se borran todas sus cuotas; los movimientos de las cuentas se conservan. No se puede deshacer.",
    done: "Mensualidad eliminada",
    redirect: "/mensualidades",
  },
  transaction: {
    button: "Eliminar movimiento",
    title: "¿Eliminar el movimiento?",
    warning:
      "El saldo de la cuenta se recalcula sin él; si era un abono, la deuda vuelve a mostrar ese pendiente. No se puede deshacer.",
    done: "Movimiento eliminado",
    redirect: "/movimientos",
  },
} as const;

/**
 * Eliminación de deudas, planes y movimientos con confirmación en drawer.
 * La advertencia deja claro el alcance antes de confirmar.
 */
export function DeleteEntityButton({
  kind,
  targetId,
}: {
  kind: "debt" | "plan" | "transaction";
  targetId: string;
}) {
  const router = useRouter();
  const { showToast } = useUI();
  const [confirming, setConfirming] = useState(false);
  const labels = LABELS[kind];

  const remove = async () => {
    const result = await runAction(() =>
      kind === "debt"
        ? deleteDebt(targetId)
        : kind === "plan"
          ? deletePlan(targetId)
          : deleteTransaction(targetId)
    );
    if (!result.success) return result.error;
    showToast(labels.done);
    // Diferido: navegar en el mismo tick en que resuelve la action hace que
    // Next descarte su resultado y vuelva a pedir la página.
    setTimeout(() => router.replace(labels.redirect), 0);
    return null;
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-danger hover:text-danger"
        onClick={() => setConfirming(true)}
      >
        <Trash2 className="h-3.5 w-3.5" />
        {labels.button}
      </Button>
      <ConfirmDrawer
        open={confirming}
        onClose={() => setConfirming(false)}
        title={labels.title}
        description={labels.warning}
        onConfirm={remove}
      />
    </>
  );
}
