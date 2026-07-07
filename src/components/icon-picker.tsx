"use client";

import { ACCOUNT_ICONS } from "@/lib/account-icons";

// Cuadrícula de iconos lucide para cuentas. Clic en el seleccionado lo
// deselecciona (null = icono automático según el tipo de cuenta).
export function IconPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (name: string | null) => void;
}) {
  return (
    <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
      {ACCOUNT_ICONS.map(({ name, icon: Icon }) => {
        const selected = value === name;
        return (
          <button
            key={name}
            type="button"
            onClick={() => onChange(selected ? null : name)}
            aria-label={`Icono ${name}`}
            aria-pressed={selected}
            className={`flex h-10 items-center justify-center rounded-[12px] border transition-colors ${
              selected
                ? "border-brand bg-chip text-brand"
                : "border-line bg-white text-ink-soft hover:border-brand-soft hover:text-brand"
            }`}
          >
            <Icon className="h-[18px] w-[18px]" />
          </button>
        );
      })}
    </div>
  );
}
