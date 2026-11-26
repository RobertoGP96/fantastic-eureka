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
import { Field, FIELD_SELECT } from "@/components/form-field";
import { Button } from "@/components/ui/button";
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
  type TransactionKind,
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

const MONTH_ARROW =
  "flex size-9 items-center justify-center rounded-lg text-brand-ink transition-colors hover:bg-chip focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-40";

/**
 * Filtros de /movimientos. El mes siempre está a la vista; cuenta, categoría
 * y tipo se muestran en línea cuando la página va a dos columnas (lateral
 * ancho) y, en una columna, dentro de un drawer que abre «Filtros». Los
 * filtros activos se resumen en chips que se quitan de un toque.
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

  // Chips de lo que está filtrando ahora mismo (sin contar el mes).
  const active = [
    filters.cuenta && {
      key: "cuenta" as const,
      label:
        accounts.find((a) => a.id === filters.cuenta)?.name ?? "Cuenta",
    },
    filters.categoria && {
      key: "categoria" as const,
      label:
        categories.find((c) => c.id === filters.categoria)?.name ??
        "Categoría",
    },
    filters.tipo && {
      key: "tipo" as const,
      label:
        TRANSACTION_KIND_LABELS[filters.tipo as TransactionKind] ??
        filters.tipo,
    },
  ].filter((chip): chip is { key: "cuenta" | "categoria" | "tipo"; label: string } =>
    Boolean(chip)
  );

  const selects = (
    <>
      <Field label="Cuenta">
        <Select
          value={filters.cuenta || ALL}
          onValueChange={(value) =>
            apply({ cuenta: value === ALL ? "" : value })
          }
        >
          <SelectTrigger className={FIELD_SELECT}>
            <SelectValue placeholder="Cuenta" />
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
      </Field>

      <Field label="Categoría">
        <Select
          value={filters.categoria || ALL}
          onValueChange={(value) =>
            apply({ categoria: value === ALL ? "" : value })
          }
        >
          <SelectTrigger className={FIELD_SELECT}>
            <SelectValue placeholder="Categoría" />
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
      </Field>

      <Field label="Tipo">
        <Select
          value={filters.tipo || ALL}
          onValueChange={(value) => apply({ tipo: value === ALL ? "" : value })}
        >
          <SelectTrigger className={FIELD_SELECT}>
            <SelectValue placeholder="Tipo" />
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
      </Field>
    </>
  );

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between rounded-2xl border border-line bg-card px-2 py-1.5">
        <button
          type="button"
          onClick={() => apply({ mes: shiftMonth(filters.mes, -1) })}
          disabled={isAllTime}
          aria-label="Mes anterior"
          className={MONTH_ARROW}
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={() =>
            apply({ mes: isAllTime ? shiftMonth("", 0) : "todos" })
          }
          className="min-h-9 rounded-lg px-2 text-sm font-semibold text-heading capitalize transition-colors hover:text-brand-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          title="Alternar entre mes y todo el historial"
        >
          {monthLabel(filters.mes)}
        </button>
        <button
          type="button"
          onClick={() => apply({ mes: shiftMonth(filters.mes, 1) })}
          disabled={isAllTime}
          aria-label="Mes siguiente"
          className={MONTH_ARROW}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Dos columnas: los selectores caben en el lateral. */}
      <div className="hidden flex-col gap-3 rounded-2xl border border-line bg-card p-4 @4xl:flex">
        {selects}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Una columna: los selectores van en un drawer. */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-chip px-3 text-xs font-semibold text-brand-ink transition-colors hover:bg-brand-soft/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none @4xl:hidden"
        >
          <SlidersHorizontal className="size-3.5" />
          Filtros
          {active.length > 0 && (
            <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">
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
            className="inline-flex min-h-9 max-w-full items-center gap-1 rounded-lg border border-line bg-card pr-2 pl-3 text-xs font-semibold text-ink-soft transition-colors hover:border-brand-soft hover:text-brand-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <span className="truncate">{chip.label}</span>
            <X className="size-3.5 flex-none" />
          </button>
        ))}

        <a
          href={`/api/export?${query(filters)}`}
          className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-chip px-3 text-xs font-semibold text-brand-ink transition-colors hover:bg-brand-soft/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Download className="size-3.5" />
          CSV
        </a>
      </div>

      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Filtros"
        description="Se aplican al momento."
        side="bottom"
      >
        <FormDrawerBody>{selects}</FormDrawerBody>
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
