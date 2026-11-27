import { Card } from "@/components/ui/card";
import type { ActivityLevel, ActivityMap } from "@/lib/activity-map";

// Gadget «Mapa de actividad»: rejilla de puntos semana × día (estilo
// «contribution graph») con los movimientos registrados cada día del último
// año. Componente de servidor, sin JS de cliente: el servidor ya conoce «hoy»
// en la zona de la app, así que no hay nada que recalcular al montar.
//
// La rejilla va en flex-row-reverse con overflow oculto: la semana actual
// queda pegada a la derecha y, si la tarjeta es estrecha (móvil, gadget
// pequeño), se recortan las semanas más antiguas en vez de encoger los puntos.

// Una sola tinta (secuencial): más actividad = más opaco.
const LEVEL_CLASS: Record<ActivityLevel, string> = {
  0: "bg-subtle",
  1: "bg-brand/25",
  2: "bg-brand/50",
  3: "bg-brand/75",
  4: "bg-brand",
};

const DAY_TITLE = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

// Tamaño del punto: 10 px, y 12 px cuando la columna de contenido es ancha
// (en una tarjeta a todo el ancho caben así las 53 semanas sin sobrar media
// tarjeta). Cadenas literales para el escáner de Tailwind.
const DOT = "size-2.5 @4xl/main:size-3";
const DOT_W = "w-2.5 @4xl/main:w-3";
const DOT_H = "h-2.5 @4xl/main:h-3";

// Lunes, miércoles y viernes: las filas alternas bastan para orientarse.
const WEEKDAY_LABELS = ["L", "", "X", "", "V", "", ""];

function countLabel(count: number): string {
  if (count === 0) return "sin movimientos";
  return count === 1 ? "1 movimiento" : `${count} movimientos`;
}

export function ActivityMapCard({
  map,
  heading = "Actividad",
}: {
  map: ActivityMap;
  heading?: string;
}) {
  const summary =
    map.total === 0
      ? "Sin movimientos en el último año"
      : `${countLabel(map.total)} en ${map.activeDays} ${
          map.activeDays === 1 ? "día" : "días"
        } · último año`;
  // La más reciente primero: con flex-row-reverse queda a la derecha.
  const weeks = [...map.weeks].reverse();

  return (
    <Card asChild className="flex h-full flex-col">
      <section>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-heading">{heading}</h2>
            <p className="mt-0.5 text-xs text-muted">{summary}</p>
          </div>
          <div
            aria-hidden="true"
            className="flex flex-none items-center gap-1 text-[11px] text-muted"
          >
            <span className="mr-0.5">Menos</span>
            {([0, 1, 2, 3, 4] as const).map((level) => (
              <span
                key={level}
                className={`size-2.5 rounded-full ${LEVEL_CLASS[level]}`}
              />
            ))}
            <span className="ml-0.5">Más</span>
          </div>
        </div>

        <div
          role="img"
          aria-label={`Mapa de actividad: ${summary}`}
          className="flex gap-2"
        >
          <div
            aria-hidden="true"
            className="flex flex-none flex-col gap-1 pt-5 text-[11px] text-muted"
          >
            {WEEKDAY_LABELS.map((label, index) => (
              <span key={index} className={`flex items-center leading-none ${DOT_H}`}>
                {label}
              </span>
            ))}
          </div>
          {/* Sin flex-1: si caben todas las semanas la rejilla queda pegada a
              las iniciales de los días; si no caben, encoge y recorta por la
              izquierda. La máscara difumina ese borde para que el corte (y la
              etiqueta de mes a medias) se lea como «continúa», y el
              espaciador final ocupa la zona difuminada cuando no hay recorte. */}
          <div
            aria-hidden="true"
            className="flex min-w-0 flex-row-reverse gap-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_1.5rem)]"
          >
            {weeks.map((week) => (
              <div key={week.key} className="flex flex-none flex-col gap-1">
                {/* Ancho de un punto y desborde visible: la etiqueta del mes
                    se extiende sobre las columnas siguientes sin moverlas. */}
                <span
                  className={`h-4 text-[11px] leading-4 whitespace-nowrap text-muted ${DOT_W}`}
                >
                  {week.monthLabel ?? ""}
                </span>
                {week.days.map((day, index) =>
                  day ? (
                    <span
                      key={day.key}
                      title={`${DAY_TITLE.format(day.date)}: ${countLabel(day.count)}`}
                      className={`rounded-full ${DOT} ${LEVEL_CLASS[day.level]}`}
                    />
                  ) : (
                    // Día que aún no llega: hueco para conservar la fila.
                    <span key={index} className={DOT} />
                  )
                )}
              </div>
            ))}
            <span className="w-5 flex-none" />
          </div>
        </div>
      </section>
    </Card>
  );
}
