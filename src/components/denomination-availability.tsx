import { Banknote } from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { Card } from "@/components/ui/card";
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
// Se pinta en el detalle de la cuenta y dentro del gadget de cuenta de Inicio.
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
    <Card asChild>
      <section>
        <SectionHeader
          size="sm"
          title="Denominaciones en caja"
          action={{ href: `/conteo/${accountId}`, label: "Actualizar conteo" }}
          className="mb-1"
        />

        {!hasData ? (
          <p className="py-4 text-center text-sm text-muted">
            Todavía no hay arqueos ni movimientos con desglose. Haz el primer
            conteo para registrar qué billetes y monedas hay en la caja.
          </p>
        ) : (
          <>
            <p className="mb-2 text-xs text-muted">
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
              <p className="py-3 text-center text-sm text-muted">
                La caja está vacía según el último conteo.
              </p>
            ) : (
              <>
                <div className="divide-y divide-line-2">
                  {lines.map((line) => {
                    const negative = line.quantity < 0;
                    return (
                      <div
                        key={line.denominationId}
                        className="flex items-center gap-3 py-2.5"
                      >
                        <span
                          className={`flex size-9 flex-none items-center justify-center rounded-xl ${
                            negative
                              ? "bg-danger-bg text-danger"
                              : "bg-chip text-brand-ink"
                          }`}
                        >
                          <Banknote className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="money truncate text-sm font-medium text-heading">
                            {fmtMinor(line.valueMinor, currency)}
                          </div>
                          <div className="text-xs text-muted">
                            {DENOMINATION_KIND_LABELS[
                              line.kind as DenominationKind
                            ] ?? line.kind}
                            {" · "}× {line.quantity}
                            {negative ? " · revisa los desgloses" : ""}
                          </div>
                        </div>
                        <div
                          className={`money text-right text-sm font-semibold ${
                            negative ? "text-danger" : "text-heading"
                          }`}
                        >
                          {fmtMinor(line.valueMinor * line.quantity, currency)}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
                  <span className="text-xs font-medium text-muted">
                    Total en denominaciones
                  </span>
                  <span className="money text-sm font-semibold text-heading">
                    {fmtMinor(totalMinor, currency)}
                  </span>
                </div>
              </>
            )}
          </>
        )}
      </section>
    </Card>
  );
}
