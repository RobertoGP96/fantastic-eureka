"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { IconPicker } from "@/components/icon-picker";
import { setAccountIcon } from "@/app/actions/account-actions";
import { getAccountIcon } from "@/lib/account-icons";
import { useUI } from "@/lib/ui-store";

// Fila «Icono» de los ajustes de la cuenta: la fila entera es el botón que
// despliega el selector. No trae marco propio: va dentro de la tarjeta de
// ajustes del detalle.
export function AccountIconEditor({
  accountId,
  icon,
  type,
}: {
  accountId: string;
  icon: string | null;
  type: string;
}) {
  const router = useRouter();
  const { showToast } = useUI();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const Icon = getAccountIcon(icon, type);

  const pick = async (name: string | null) => {
    setSaving(true);
    const result = await setAccountIcon({ accountId, icon: name });
    setSaving(false);
    if (result.success) {
      showToast(name ? "Icono actualizado" : "Icono automático");
      setOpen(false);
      router.refresh();
    } else {
      showToast(result.error);
    }
  };

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={saving}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-none"
      >
        <span className="text-sm font-medium text-ink-soft">Icono</span>
        <span className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-chip text-brand-ink">
            <Icon className="size-[18px]" />
          </span>
          {open ? (
            <ChevronUp className="size-4 text-muted" />
          ) : (
            <ChevronDown className="size-4 text-muted" />
          )}
        </span>
      </button>
      {open && (
        <div className="pt-1 pb-2">
          <IconPicker value={icon} onChange={(name) => void pick(name)} />
        </div>
      )}
    </div>
  );
}
