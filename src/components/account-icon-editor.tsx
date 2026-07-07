"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { IconPicker } from "@/components/icon-picker";
import { setAccountIcon } from "@/app/actions/account-actions";
import { getAccountIcon } from "@/lib/account-icons";
import { useUI } from "@/lib/ui-store";

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
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={saving}
        className="flex w-full items-center justify-between"
      >
        <span className="text-[12.5px] font-semibold text-ink-soft">
          Icono
        </span>
        <span className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-chip text-brand">
            <Icon className="h-[18px] w-[18px]" />
          </span>
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-2" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-2" />
          )}
        </span>
      </button>
      {open && <IconPicker value={icon} onChange={(name) => void pick(name)} />}
    </div>
  );
}
