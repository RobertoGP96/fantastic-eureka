"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteDebt } from "@/app/actions/debt-actions";
import { deletePlan } from "@/app/actions/plan-actions";
import { deleteTransaction } from "@/app/actions/transaction-actions";
import { useUI } from "@/lib/ui-store";

const LABELS = {
  debt: {
    button: "Eliminar deuda",
    warning:
      "¿Eliminar la deuda? Se borran sus abonos y planes de cuotas; los movimientos de las cuentas se conservan. No se puede deshacer.",
    done: "Deuda eliminada",
    redirect: "/deudas",
  },
  plan: {
    button: "Eliminar mensualidad",
    warning:
      "¿Eliminar la mensualidad? Se borran todas sus cuotas; los movimientos de las cuentas se conservan. No se puede deshacer.",
    done: "Mensualidad eliminada",
    redirect: "/mensualidades",
  },
  transaction: {
    button: "Eliminar movimiento",
    warning:
      "¿Eliminar el movimiento? El saldo de la cuenta se recalcula sin él; si era un abono, la deuda vuelve a mostrar ese pendiente. No se puede deshacer.",
    done: "Movimiento eliminado",
    redirect: "/movimientos",
  },
} as const;

/**
 * Eliminación con confirmación inline para deudas, planes y movimientos
 * (mismo patrón que AccountEditor). La advertencia deja claro el alcance
 * antes de confirmar.
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
  const [saving, setSaving] = useState(false);
  const labels = LABELS[kind];

  const remove = async () => {
    setSaving(true);
    const result =
      kind === "debt"
        ? await deleteDebt(targetId)
        : kind === "plan"
          ? await deletePlan(targetId)
          : await deleteTransaction(targetId);
    setSaving(false);
    setConfirming(false);
    if (result.success) {
      showToast(labels.done);
      router.push(labels.redirect);
      router.refresh();
    } else {
      showToast(result.error);
    }
  };

  if (!confirming) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="text-danger hover:bg-danger-bg hover:text-danger"
        onClick={() => setConfirming(true)}
      >
        <Trash2 className="size-3.5" />
        {labels.button}
      </Button>
    );
  }

  // La advertencia va en su propia línea a todo el ancho y los botones
  // debajo: en fila, a 375 px el texto quedaba en una columna de pocas
  // palabras junto a los botones.
  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-xs text-ink-soft">{labels.warning}</p>
      <div className="flex justify-end gap-2">
        <Button
          variant="danger"
          size="sm"
          disabled={saving}
          onClick={() => void remove()}
        >
          Eliminar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={saving}
          onClick={() => setConfirming(false)}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
