"use client";

import Link from "next/link";
import { Bell, HandCoins } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface InstallmentNotice {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  amountText: string;
  dueText: string;
  overdue: boolean;
}

const TRIGGER_CLASS =
  "relative flex size-10 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-subtle hover:text-heading focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dense:size-9";

/** Silueta de la campana mientras llega la consulta (Suspense del layout). */
export function NotificationsBellFallback() {
  return (
    <span aria-hidden="true" className={TRIGGER_CLASS}>
      <Bell className="h-[18px] w-[18px] opacity-50" />
    </span>
  );
}

/** Campana de notificaciones con las mensualidades por vencer o vencidas. */
export function NotificationsBell({ items }: { items: InstallmentNotice[] }) {
  const overdueCount = items.filter((item) => item.overdue).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={
            items.length === 0
              ? "Notificaciones"
              : `Notificaciones: ${items.length} mensualidades por vencer`
          }
          className={TRIGGER_CLASS}
        >
          <Bell className="h-[18px] w-[18px]" />
          {items.length > 0 && (
            // Vencidas en rojo; por vencer en ámbar con tinta oscura (el
            // blanco sobre dorado no llegaba a 4,5:1).
            <span
              className={`absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-semibold ring-2 ring-background ${
                overdueCount > 0
                  ? "bg-danger text-white"
                  : "bg-gold text-heading"
              }`}
            >
              {items.length > 9 ? "9+" : items.length}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="max-h-[70vh] w-[300px] overflow-y-auto rounded-xl border-line"
      >
        <DropdownMenuLabel className="text-sm font-semibold text-heading">
          Mensualidades por vencer
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="px-3 py-5 text-center text-sm text-muted">
            Sin vencimientos en los próximos días.
          </div>
        ) : (
          items.map((item) => (
            <DropdownMenuItem key={item.id} asChild>
              <Link href={item.href} className="items-start gap-2.5 py-2">
                <span
                  className={`mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg ${
                    item.overdue
                      ? "bg-danger-bg text-danger"
                      : "bg-chip text-brand-ink"
                  }`}
                >
                  <HandCoins className="h-4 w-4" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold text-heading">
                    {item.title}
                  </span>
                  <span className="truncate text-[11px] text-muted">
                    {item.subtitle}
                  </span>
                  <span
                    className={`text-[11px] font-semibold ${
                      item.overdue ? "text-danger" : "text-ink-soft"
                    }`}
                  >
                    {item.amountText} · {item.dueText}
                  </span>
                </span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href="/deudas"
            className="justify-center text-xs font-semibold text-brand-ink"
          >
            Ver todas las deudas
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
