"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { saveDashboardPrefs } from "@/app/actions/dashboard-actions";
import {
  DASHBOARD_SECTIONS,
  defaultDashboardPrefs,
  type DashboardSectionPref,
} from "@/lib/dashboard-prefs";
import { useUI } from "@/lib/ui-store";

const LABELS = new Map<string, string>(
  DASHBOARD_SECTIONS.map((s) => [s.key, s.label])
);

// Personalización de Inicio: qué secciones se muestran y en qué orden.
// El botón vive en el header (junto a la campana) y abre un sheet inferior.
export function DashboardCustomizer({
  sections,
}: {
  sections: DashboardSectionPref[];
}) {
  const router = useRouter();
  const { showToast } = useUI();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(sections);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openSheet = (next: boolean) => {
    // Al abrir se parte SIEMPRE del estado guardado (props del servidor).
    if (next) {
      setItems(sections);
      setError(null);
    }
    setOpen(next);
  };

  const toggle = (key: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.key === key ? { ...item, visible: !item.visible } : item
      )
    );
  };

  const move = (index: number, delta: -1 | 1) => {
    setItems((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = prev.slice();
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    const result = await saveDashboardPrefs({ sections: items });
    setSaving(false);
    if (result.success) {
      setOpen(false);
      showToast("Inicio actualizado");
      router.refresh();
    } else {
      setError(result.error);
    }
  };

  return (
    <Sheet open={open} onOpenChange={openSheet}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Personalizar Inicio"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
        >
          <SlidersHorizontal className="h-[18px] w-[18px]" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[85vh] w-full overflow-y-auto rounded-t-[22px] border-line sm:max-w-md"
      >
        <SheetHeader className="pb-0">
          <SheetTitle className="text-[15px] text-navy">
            Personalizar Inicio
          </SheetTitle>
          <SheetDescription className="text-[12.5px] text-muted">
            Elige qué secciones se muestran y en qué orden.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-2 px-4">
          {items.map((item, index) => (
            <div
              key={item.key}
              className={`flex items-center gap-2 rounded-[14px] border px-3 py-2.5 transition-colors ${
                item.visible
                  ? "border-line bg-white"
                  : "border-line-2 bg-app opacity-70"
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(item.key)}
                aria-label={
                  item.visible
                    ? `Ocultar ${LABELS.get(item.key)}`
                    : `Mostrar ${LABELS.get(item.key)}`
                }
                className={`flex h-8 w-8 flex-none items-center justify-center rounded-[10px] transition-colors ${
                  item.visible
                    ? "bg-chip text-brand"
                    : "bg-white text-muted"
                }`}
              >
                {item.visible ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </button>
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink-soft">
                {LABELS.get(item.key) ?? item.key}
              </span>
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`Subir ${LABELS.get(item.key)}`}
                className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] bg-app text-brand-mid transition-colors hover:text-brand disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === items.length - 1}
                aria-label={`Bajar ${LABELS.get(item.key)}`}
                className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] bg-app text-brand-mid transition-colors hover:text-brand disabled:opacity-30"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {error && (
          <div className="mx-4 rounded-[13px] bg-danger-bg px-3.5 py-2.5 text-[12.5px] font-medium text-danger">
            {error}
          </div>
        )}

        <SheetFooter className="flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setItems(defaultDashboardPrefs().sections)}
            className="flex-none gap-1.5"
          >
            <RotateCcw className="h-4 w-4" />
            Restablecer
          </Button>
          <Button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="flex-1"
          >
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
