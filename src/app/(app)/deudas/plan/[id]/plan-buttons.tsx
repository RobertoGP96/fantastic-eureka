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
      showToast("Plan desactivado");
      router.refresh();
    } else {
      showToast(result.error);
    }
  };

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        Desactivar plan
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11.5px] text-muted">¿Desactivar?</span>
      <Button
        variant="danger"
        size="sm"
        disabled={saving}
        onClick={() => void deactivate()}
      >
        Sí, desactivar
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
  );
}
