"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  FormDrawer,
  FormDrawerBody,
  FormDrawerFooter,
} from "@/components/form-drawer";
import { Field } from "@/components/form-field";
import { Button, buttonVariants } from "@/components/ui/button";
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

type SelectKey = "cuenta" | "categoria" | "tipo";

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

/**
 * Filtros de /movimientos, en una sola barra. El mes siempre está a la
 * vista. Cuenta, categoría y tipo van en línea cuando la columna de
 * contenido es ancha (`@2xl/main`); en estrecho (móvil) pasan a un drawer
 * que abre «Filtros», y lo que está filtrando se resume en chips que se
 * quitan de un toque. Todo se aplica al momento (el filtro vive en la URL).
 */
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isAllTime = filters.mes === "todos";

  const query = (source: Filters) => {
    const params = new URLSearchParams();
    if (source.mes) params.set("mes", source.mes);
    if (source.cuenta) params.set("cuenta", source.cuenta);
    if (source.categoria) params.set("categoria", source.categoria);
    if (source.tipo) params.set("tipo", source.tipo);
    return params.toString();
  };

  const apply = (next: Partial<Filters>) => {
    router.replace(`/movimientos?${query({ ...filters, ...next })}`);
  };

  // Los tres selectores, descritos una vez: se pintan compactos en la barra
  // (ancho) o como campos dentro del drawer (estrecho).
  const selects: {
    key: SelectKey;
    label: string;
    allLabel: string;
    options: { value: string; label: string }[];
  }[] = [
    {
      key: "cuenta",
      label: "Cuenta",
      allLabel: "Todas las cuentas",
      options: accounts.map((a) => ({ value: a.id, label: a.name })),
    },
    {
      key: "categoria",
      label: "Categoría",
      allLabel: "Todas las categorías",
      options: categories.map((c) => ({ value: c.id, label: c.name })),
    },
    {
      key: "tipo",
      label: "Tipo",
      allLabel: "Todos los tipos",
      options: TRANSACTION_KINDS.map((kind) => ({
        value: kind,
        label: TRANSACTION_KIND_LABELS[kind],
      })),
    },
  ];

  // Lo que está filtrando ahora mismo (sin contar el mes).
  const active = selects.flatMap((filter) => {
    const value = filters[filter.key];
    if (!value) return [];
    return [
      {
        key: filter.key,
        label:
          filter.options.find((option) => option.value === value)?.label ??
          filter.label,
      },
    ];
  });

  const selectItems = (filter: (typeof selects)[number]) => (
    <SelectContent>
      <SelectItem value={ALL}>{filter.allLabel}</SelectItem>
      {filter.options.map((option) => (
        <SelectItem key={option.value} value={option.value}>
          {option.label}
        </SelectItem>
      ))}
    </SelectContent>
  );

  const pick = (key: SelectKey) => (value: string) =>
    apply({ [key]: value === ALL ? "" : value });

  return (
    // Una sola barra: en móvil el selector de mes ocupa su línea y debajo van
    // «Filtros», los chips activos y el CSV; en escritorio todo cabe en una
    // fila.
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

      {/* Ancho: los selectores van en la propia barra (`contents` los deja
          como hijos directos de la fila). */}
      <div className="hidden @2xl/main:contents">
        {selects.map((filter) => (
          <Select
            key={filter.key}
            value={filters[filter.key] || ALL}
            onValueChange={pick(filter.key)}
          >
            <SelectTrigger aria-label={filter.label} className={FILTER_TRIGGER}>
              <span className="truncate">
                <SelectValue placeholder={filter.label} />
              </span>
            </SelectTrigger>
            {selectItems(filter)}
          </Select>
        ))}
      </div>

      {/* Estrecho: los selectores van en un drawer y lo activo queda a la
          vista en chips. */}
      <div className="contents @2xl/main:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <SlidersHorizontal className="size-3.5" />
          Filtros
          {active.length > 0 && (
            <span className="money flex size-4 flex-none items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
              {active.length}
            </span>
          )}
        </button>

        {active.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => apply({ [chip.key]: "" })}
            aria-label={`Quitar filtro ${chip.label}`}
            className="inline-flex min-h-8 max-w-full min-w-0 items-center gap-1 rounded-lg bg-chip py-1.5 pr-1.5 pl-2.5 text-xs font-medium text-brand-ink transition-colors hover:bg-brand-soft/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <span className="truncate">{chip.label}</span>
            <X className="size-3.5 flex-none" />
          </button>
        ))}
      </div>

      <a
        href={`/api/export?${query(filters)}`}
        className={buttonVariants({
          variant: "outline",
          size: "sm",
          className: "ml-auto",
        })}
      >
        <Download className="size-3.5" />
        CSV
      </a>

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Filtros"
        description="Se aplican al momento."
        side="bottom"
      >
        <FormDrawerBody>
          {selects.map((filter) => (
            <Field key={filter.key} label={filter.label}>
              <Select
                value={filters[filter.key] || ALL}
                onValueChange={pick(filter.key)}
              >
                <SelectTrigger variant="form" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                {selectItems(filter)}
              </Select>
            </Field>
          ))}
        </FormDrawerBody>
        <FormDrawerFooter>
          <Button
            variant="ghost"
            className="flex-none"
            disabled={active.length === 0}
            onClick={() => apply({ cuenta: "", categoria: "", tipo: "" })}
          >
            Limpiar
          </Button>
          <Button className="flex-1" onClick={() => setDrawerOpen(false)}>
            Listo
          </Button>
        </FormDrawerFooter>
      </FormDrawer>
    </div>
  );
}
