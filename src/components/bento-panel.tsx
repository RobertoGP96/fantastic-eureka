"use client";

// Panel bento de gadgets: rejilla de tarjetas con tamaño configurable
// (sm/md/lg = columnas) y reordenable arrastrando desde el asa. El orden
// se persiste en User.dashboardPrefs (mismo array `widgets` que edita el
// sheet «Personalizar Inicio»); en móvil se reordena desde ese sheet.

import {
  Children,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import { GripHorizontal } from "lucide-react";
import { saveDashboardPrefs } from "@/app/actions/dashboard-actions";
import type { DashboardPrefs, WidgetSize } from "@/lib/dashboard-prefs";
import { useUI } from "@/lib/ui-store";

const SIZE_CLASSES: Record<WidgetSize, string> = {
  sm: "lg:col-span-2",
  md: "sm:col-span-2 lg:col-span-3",
  lg: "sm:col-span-2 lg:col-span-6",
};

export function BentoPanel({
  prefs,
  children,
}: {
  prefs: DashboardPrefs;
  children: ReactNode;
}) {
  const { showToast } = useUI();
  const widgets = prefs.widgets;
  const nodes = Children.toArray(children);
  const nodeById = useMemo(
    () => new Map(widgets.map((w, i) => [w.id, nodes[i]])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [widgets, children]
  );

  const [order, setOrder] = useState(() => widgets.map((w) => w.id));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  // Solo el asa arma el arrastre: los botones/enlaces del gadget siguen vivos.
  const [armedId, setArmedId] = useState<string | null>(null);
  const orderBeforeDrag = useRef<string[]>([]);

  // Si el sheet añadió/quitó gadgets, el orden local se re-sincroniza.
  const idsKey = widgets.map((w) => w.id).join("|");
  useEffect(() => {
    setOrder(widgets.map((w) => w.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const widgetById = useMemo(
    () => new Map(widgets.map((w) => [w.id, w])),
    [widgets]
  );

  const handleDragStart = (id: string) => (event: DragEvent) => {
    event.dataTransfer.effectAllowed = "move";
    orderBeforeDrag.current = order;
    setDraggingId(id);
  };

  const handleDragOver = (overId: string) => (event: DragEvent) => {
    if (!draggingId || draggingId === overId) return;
    event.preventDefault();
    setOrder((prev) => {
      const from = prev.indexOf(draggingId);
      const to = prev.indexOf(overId);
      if (from === -1 || to === -1 || from === to) return prev;
      const next = prev.slice();
      next.splice(to, 0, ...next.splice(from, 1));
      return next;
    });
  };

  const handleDragEnd = async () => {
    const previous = orderBeforeDrag.current;
    const current = order;
    setDraggingId(null);
    setArmedId(null);
    if (previous.join("|") === current.join("|")) return;
    const result = await saveDashboardPrefs({
      sections: prefs.sections,
      widgets: current
        .map((id) => widgetById.get(id))
        .filter((w): w is NonNullable<typeof w> => Boolean(w)),
      accountIds: prefs.accountIds,
    });
    if (!result.success) {
      setOrder(previous);
      showToast(result.error);
    }
  };

  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-[14.5px] font-bold text-navy">Panel</h2>
        <span className="hidden text-[11.5px] text-muted md:block">
          Arrastra el asa para reordenar
        </span>
      </div>
      <div
        className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-6"
        onDrop={(event) => event.preventDefault()}
        onDragOver={(event) => {
          if (draggingId) event.preventDefault();
        }}
      >
        {order.map((id) => {
          const widget = widgetById.get(id);
          const node = nodeById.get(id);
          if (!widget || !node) return null;
          return (
            <div
              key={id}
              draggable={armedId === id}
              onDragStart={handleDragStart(id)}
              onDragOver={handleDragOver(id)}
              onDragEnd={() => void handleDragEnd()}
              className={`group relative min-w-0 transition-opacity ${
                SIZE_CLASSES[widget.size ?? "md"]
              } ${draggingId === id ? "opacity-50" : ""}`}
            >
              <button
                type="button"
                aria-label="Arrastrar para reordenar"
                onPointerDown={() => setArmedId(id)}
                onPointerUp={() => setArmedId(null)}
                className="absolute top-1 left-1/2 z-10 hidden -translate-x-1/2 cursor-grab rounded-md px-2 py-0.5 text-muted-2 opacity-0 transition-opacity group-hover:opacity-100 hover:text-brand active:cursor-grabbing md:block"
              >
                <GripHorizontal className="h-4 w-4" />
              </button>
              {node}
            </div>
          );
        })}
      </div>
    </section>
  );
}
