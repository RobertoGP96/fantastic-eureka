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
          className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
        >
          <Bell className="h-[18px] w-[18px]" />
          {items.length > 0 && (
            <span
              className={`absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ring-2 ring-brand ${
                overdueCount > 0 ? "bg-danger" : "bg-gold"
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
        <DropdownMenuLabel className="text-[13px] font-semibold text-navy">
          Mensualidades por vencer
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="px-3 py-5 text-center text-[12.5px] text-muted">
            Sin vencimientos en los próximos días.
          </div>
        ) : (
          items.map((item) => (
            <DropdownMenuItem key={item.id} asChild>
              <Link href={item.href} className="items-start gap-2.5 py-2">
                <span
                  className={`mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-[10px] ${
                    item.overdue
                      ? "bg-danger-bg text-danger"
                      : "bg-chip text-brand"
                  }`}
                >
                  <HandCoins className="h-4 w-4" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[12.5px] font-semibold text-navy">
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
            className="justify-center text-[12px] font-semibold text-brand-mid"
          >
            Ver todas las deudas
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
