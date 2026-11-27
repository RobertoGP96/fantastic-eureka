"use client";

import { ACCOUNT_ICONS } from "@/lib/account-icons";
import { cn } from "@/lib/utils";

// Cuadrícula de iconos lucide para cuentas. Clic en el seleccionado lo
// deselecciona (null = icono automático según el tipo de cuenta).
// Las columnas dependen del ancho del PROPIO selector (@container) y no del
// viewport: se usa en el alta de cuenta y en su detalle, con anchos distintos,
// y así cada tesela conserva ~44 px de lado en táctil.
export function IconPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (name: string | null) => void;
}) {
  return (
    <div className="@container w-full">
      <div className="grid grid-cols-6 gap-1.5 @md:grid-cols-8">
        {ACCOUNT_ICONS.map(({ name, icon: Icon }) => {
          const selected = value === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => onChange(selected ? null : name)}
              aria-label={`Icono ${name}`}
              aria-pressed={selected}
              className={cn(
                "flex h-11 items-center justify-center rounded-xl border transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
                selected
                  ? "border-brand bg-chip text-brand-ink"
                  : "border-line bg-card text-ink-soft hover:bg-subtle"
              )}
            >
              <Icon className="size-[18px]" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
