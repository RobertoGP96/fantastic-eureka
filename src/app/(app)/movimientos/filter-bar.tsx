"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TRANSACTION_KINDS,
  TRANSACTION_KIND_LABELS,
} from "@/lib/domain";

const ALL = "__all__";

interface Option {
  id: string;
  name: string;
}

interface Filters {
  mes: string;
  cuenta: string;
  categoria: string;
  tipo: string;
}

const MONTH_FMT = new Intl.DateTimeFormat("es", {
  month: "long",
  year: "numeric",
});

// Piezas del selector de mes. Van dentro de un marco con overflow-hidden, así
// que el foco se pinta hacia dentro (ring-inset) para que no quede recortado.
const STEP_FOCUS =
  "transition-colors hover:bg-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset";
// Flechas: 44 px en táctil, 32 px con ratón (dense), como los filtros de al lado.
const STEP_ARROW = `flex h-full w-11 flex-none items-center justify-center text-ink-soft hover:text-heading disabled:pointer-events-none disabled:opacity-50 dense:w-8 ${STEP_FOCUS}`;

// Filtro compacto: si el valor elegido es largo (nombre de cuenta), se trunca
// en vez de desbordar la barra.
const FILTER_TRIGGER = "max-w-full min-w-0";

function shiftMonth(mes: string, delta: number): string {
  const match = /^(\d{4})-(\d{2})$/.exec(mes);
  const now = new Date();
  const year = match ? Number(match[1]) : now.getFullYear();
  const monthIndex = (match ? Number(match[2]) - 1 : now.getMonth()) + delta;
  const date = new Date(year, monthIndex, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(mes: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(mes);
  if (!match) return "Todo el historial";
  return MONTH_FMT.format(new Date(Number(match[1]), Number(match[2]) - 1, 1));
}

export function FilterBar({
  filters,
  accounts,
  categories,
}: {
  filters: Filters;
  accounts: Option[];
  categories: Option[];
}) {
  const router = useRouter();
  const isAllTime = filters.mes === "todos";

  const apply = (next: Partial<Filters>) => {
    const merged = { ...filters, ...next };
    const params = new URLSearchParams();
    if (merged.mes) params.set("mes", merged.mes);
    if (merged.cuenta) params.set("cuenta", merged.cuenta);
    if (merged.categoria) params.set("categoria", merged.categoria);
    if (merged.tipo) params.set("tipo", merged.tipo);
    router.replace(`/movimientos?${params.toString()}`);
  };

  const exportParams = new URLSearchParams();
  if (filters.mes) exportParams.set("mes", filters.mes);
  if (filters.cuenta) exportParams.set("cuenta", filters.cuenta);
  if (filters.categoria) exportParams.set("categoria", filters.categoria);
  if (filters.tipo) exportParams.set("tipo", filters.tipo);

  return (
    // Una sola barra: en móvil el selector de mes ocupa su línea y los
    // filtros se reparten debajo; en escritorio todo cabe en una fila.
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex h-11 w-full items-stretch overflow-hidden rounded-lg border border-line bg-card @2xl/main:w-auto dense:h-8">
        <button
          type="button"
          onClick={() => apply({ mes: shiftMonth(filters.mes, -1) })}
          disabled={isAllTime}
          aria-label="Mes anterior"
          className={STEP_ARROW}
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={() =>
            apply({ mes: isAllTime ? shiftMonth("", 0) : "todos" })
          }
          className={`min-w-40 flex-1 px-2 text-center text-sm font-medium text-heading ${STEP_FOCUS}`}
          title="Alternar entre mes y todo el historial"
        >
          {/* inline-block: ::first-letter no aplica a un contenedor flex. */}
          <span className="inline-block first-letter:uppercase">
            {monthLabel(filters.mes)}
          </span>
        </button>
        <button
          type="button"
          onClick={() => apply({ mes: shiftMonth(filters.mes, 1) })}
          disabled={isAllTime}
          aria-label="Mes siguiente"
          className={STEP_ARROW}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <Select
        value={filters.cuenta || ALL}
        onValueChange={(value) => apply({ cuenta: value === ALL ? "" : value })}
      >
        <SelectTrigger className={FILTER_TRIGGER}>
          <span className="truncate">
            <SelectValue placeholder="Cuenta" />
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas las cuentas</SelectItem>
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              {account.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.categoria || ALL}
        onValueChange={(value) =>
          apply({ categoria: value === ALL ? "" : value })
        }
      >
        <SelectTrigger className={FILTER_TRIGGER}>
          <span className="truncate">
            <SelectValue placeholder="Categoría" />
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas las categorías</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.tipo || ALL}
        onValueChange={(value) => apply({ tipo: value === ALL ? "" : value })}
      >
        <SelectTrigger className={FILTER_TRIGGER}>
          <span className="truncate">
            <SelectValue placeholder="Tipo" />
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos los tipos</SelectItem>
          {TRANSACTION_KINDS.map((kind) => (
            <SelectItem key={kind} value={kind}>
              {TRANSACTION_KIND_LABELS[kind]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <a
        href={`/api/export?${exportParams.toString()}`}
        className={buttonVariants({
          variant: "outline",
          size: "sm",
          className: "ml-auto",
        })}
      >
        <Download className="size-3.5" />
        CSV
      </a>
    </div>
  );
}
