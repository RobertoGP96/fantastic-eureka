"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDrawer } from "@/components/confirm-drawer";
import { deactivatePlan } from "@/app/actions/plan-actions";
import { runAction } from "@/lib/run-action";
import { useUI } from "@/lib/ui-store";

/** «Finalizar mensualidad» con confirmación en drawer. */
export function PlanButtons({ planId }: { planId: string }) {
  const { showToast } = useUI();
  const [confirming, setConfirming] = useState(false);

  const deactivate = async () => {
    const result = await runAction(() => deactivatePlan(planId));
    if (!result.success) return result.error;
    showToast("Mensualidad finalizada");
    setConfirming(false);
    return null;
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
        Finalizar mensualidad
      </Button>
      <ConfirmDrawer
        open={confirming}
        onClose={() => setConfirming(false)}
        title="¿Finalizar la mensualidad?"
        description="Deja de generar cuotas y las pendientes se marcan como omitidas. El historial se conserva."
        confirmLabel="Sí, finalizar"
        busyLabel="Finalizando…"
        onConfirm={deactivate}
      />
    </>
  );
}
