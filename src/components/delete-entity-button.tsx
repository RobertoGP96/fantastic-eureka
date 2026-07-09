"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteDebt } from "@/app/actions/debt-actions";
import { deletePlan } from "@/app/actions/plan-actions";
import { useUI } from "@/lib/ui-store";

const LABELS = {
  debt: {
    button: "Eliminar deuda",
    warning:
      "¿Eliminar la deuda? Se borran sus abonos y planes de cuotas; los movimientos de las cuentas se conservan. No se puede deshacer.",
    done: "Deuda eliminada",
  },
  plan: {
    button: "Eliminar plan",
    warning:
      "¿Eliminar el plan? Se borran todas sus cuotas; los movimientos de las cuentas se conservan. No se puede deshacer.",
    done: "Plan eliminado",
  },
} as const;

/**
 * Eliminación con confirmación inline para deudas y planes (mismo patrón
 * que AccountEditor). Borra el seguimiento pero conserva los movimientos de
 * las cuentas — la advertencia lo deja claro antes de confirmar.
 */
export function DeleteEntityButton({
  kind,
  targetId,
}: {
  kind: "debt" | "plan";
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
      kind === "debt" ? await deleteDebt(targetId) : await deletePlan(targetId);
    setSaving(false);
    setConfirming(false);
    if (result.success) {
      showToast(labels.done);
      router.push("/deudas");
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
        className="text-danger hover:text-danger"
        onClick={() => setConfirming(true)}
      >
        <Trash2 className="h-3.5 w-3.5" />
        {labels.button}
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <span className="min-w-0 flex-1 text-[11.5px] text-muted">
        {labels.warning}
      </span>
      <Button
        variant="danger"
        size="sm"
        disabled={saving}
        onClick={() => void remove()}
      >
        Eliminar
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={saving}
        onClick={() => setConfirming(false)}
      >
        Cancelar
      </Button>
    </div>
  );
}
