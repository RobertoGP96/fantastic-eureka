"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
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
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between rounded-[16px] border border-line bg-white px-2 py-1.5">
        <button
          type="button"
          onClick={() => apply({ mes: shiftMonth(filters.mes, -1) })}
          disabled={isAllTime}
          aria-label="Mes anterior"
          className="flex h-9 w-9 items-center justify-center rounded-[10px] text-brand-mid transition-colors hover:bg-chip disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() =>
            apply({ mes: isAllTime ? shiftMonth("", 0) : "todos" })
          }
          className="text-[13px] font-semibold text-navy capitalize transition-colors hover:text-brand"
          title="Alternar entre mes y todo el historial"
        >
          {monthLabel(filters.mes)}
        </button>
        <button
          type="button"
          onClick={() => apply({ mes: shiftMonth(filters.mes, 1) })}
          disabled={isAllTime}
          aria-label="Mes siguiente"
          className="flex h-9 w-9 items-center justify-center rounded-[10px] text-brand-mid transition-colors hover:bg-chip disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.cuenta || ALL}
          onValueChange={(value) => apply({ cuenta: value === ALL ? "" : value })}
        >
          <SelectTrigger>
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

        <Select
          value={filters.categoria || ALL}
          onValueChange={(value) =>
            apply({ categoria: value === ALL ? "" : value })
          }
        >
          <SelectTrigger>
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

        <Select
          value={filters.tipo || ALL}
          onValueChange={(value) => apply({ tipo: value === ALL ? "" : value })}
        >
          <SelectTrigger>
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

        <a
          href={`/api/export?${exportParams.toString()}`}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-chip px-[11px] py-1.5 text-[11.5px] font-semibold text-brand transition-colors hover:bg-brand-soft/30"
        >
          <Download className="h-3.5 w-3.5" />
          CSV
        </a>
      </div>
    </div>
  );
}
