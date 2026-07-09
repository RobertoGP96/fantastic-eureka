import Link from "next/link";
import { Banknote } from "lucide-react";
import { accountDenominationStock } from "@/lib/denominations";
import { fmtMinor, type DisplayCurrency } from "@/lib/format";
import {
  DENOMINATION_KIND_LABELS,
  type DenominationKind,
} from "@/lib/domain";

const DATE_FMT = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

// Disponibilidad de denominaciones de una caja: derivada del ÚLTIMO arqueo
// más los desgloses de los movimientos posteriores (no se almacena stock).
// Cantidades negativas delatan movimientos mal desglosados: se resaltan.
export async function DenominationAvailability({
  userId,
  accountId,
  currency,
}: {
  userId: string;
  accountId: string;
  currency: DisplayCurrency;
}) {
  const stock = await accountDenominationStock(userId, accountId);
  const lines = stock.lines.filter((line) => line.quantity !== 0);
  const totalMinor = stock.lines.reduce(
    (acc, line) => acc + line.valueMinor * line.quantity,
    0
  );
  const hasData = stock.countedAt !== null || stock.movements > 0;

  return (
    <section className="rounded-[18px] border border-line bg-white p-4">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-[13.5px] font-bold text-navy">
          Denominaciones en caja
        </h2>
        <Link
          href={`/conteo/${accountId}`}
          className="text-[12px] font-semibold text-brand-mid hover:text-brand"
        >
          Actualizar conteo
        </Link>
      </div>

      {!hasData ? (
        <p className="py-4 text-center text-[12.5px] text-muted">
          Todavía no hay arqueos ni movimientos con desglose. Haz el primer
          conteo para registrar qué billetes y monedas hay en la caja.
        </p>
      ) : (
        <>
          <p className="mb-3 text-[11.5px] text-muted">
            {stock.countedAt
              ? `Según el arqueo del ${DATE_FMT.format(stock.countedAt)}`
              : "Sin arqueo base"}
            {stock.movements > 0
              ? ` · ${stock.movements} ${
                  stock.movements === 1
                    ? "movimiento posterior"
                    : "movimientos posteriores"
                }`
              : ""}
          </p>
          {lines.length === 0 ? (
            <p className="py-3 text-center text-[12.5px] text-muted">
              La caja está vacía según el último conteo.
            </p>
          ) : (
            <div className="flex flex-col">
              {lines.map((line) => {
                const negative = line.quantity < 0;
                return (
                  <div
                    key={line.denominationId}
                    className="flex items-center gap-3 border-b border-line-2 py-2 last:border-b-0"
                  >
                    <span
                      className={`flex h-8 w-8 flex-none items-center justify-center rounded-[10px] ${
                        negative
                          ? "bg-danger-bg text-danger"
                          : "bg-chip text-brand"
                      }`}
                    >
                      <Banknote className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] font-semibold text-navy">
                        {fmtMinor(line.valueMinor, currency)}
                      </div>
                      <div className="text-[10.5px] text-muted">
                        {DENOMINATION_KIND_LABELS[
                          line.kind as DenominationKind
                        ] ?? line.kind}
                        {" · "}× {line.quantity}
                        {negative ? " · revisa los desgloses" : ""}
                      </div>
                    </div>
                    <div
                      className={`text-right text-[12.5px] font-semibold tabular-nums ${
                        negative ? "text-danger" : "text-ink-soft"
                      }`}
                    >
                      {fmtMinor(line.valueMinor * line.quantity, currency)}
                    </div>
                  </div>
                );
              })}
              <div className="mt-2 flex items-center justify-between border-t border-line pt-2.5">
                <span className="text-[12px] font-semibold text-ink-soft">
                  Total en denominaciones
                </span>
                <span className="text-[14px] font-bold text-navy tabular-nums">
                  {fmtMinor(totalMinor, currency)}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
