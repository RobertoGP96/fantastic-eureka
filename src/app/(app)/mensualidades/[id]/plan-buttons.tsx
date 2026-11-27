"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deactivatePlan } from "@/app/actions/plan-actions";
import { useUI } from "@/lib/ui-store";

export function PlanButtons({ planId }: { planId: string }) {
  const router = useRouter();
  const { showToast } = useUI();
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const deactivate = async () => {
    setSaving(true);
    const result = await deactivatePlan(planId);
    setSaving(false);
    setConfirming(false);
    if (result.success) {
      showToast("Mensualidad finalizada");
      router.refresh();
    } else {
      showToast(result.error);
    }
  };

  if (!confirming) {
    return (
      <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
        Finalizar mensualidad
      </Button>
    );
  }

  // Misma forma que la confirmación de DeleteEntityButton (comparten fila):
  // pregunta a todo el ancho y botones debajo.
  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-xs text-ink-soft">
        ¿Finalizar? Las cuotas pendientes se omiten.
      </p>
      <div className="flex justify-end gap-2">
        <Button
          variant="danger"
          size="sm"
          disabled={saving}
          onClick={() => void deactivate()}
        >
          Sí, finalizar
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
