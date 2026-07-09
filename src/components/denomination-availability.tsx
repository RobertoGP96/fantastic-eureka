import Link from "next/link";
import { Banknote } from "lucide-react";
import { prisma } from "@/lib/db";
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
// (no se almacena stock por denominación; el arqueo es la fuente de verdad).
export async function DenominationAvailability({
  accountId,
  currency,
}: {
  accountId: string;
  currency: DisplayCurrency;
}) {
  const lastCount = await prisma.cashCount.findFirst({
    where: { accountId },
    orderBy: { countedAt: "desc" },
    include: {
      lines: {
        where: { quantity: { gt: 0 } },
        include: {
          denomination: { select: { valueMinor: true, kind: true } },
        },
      },
    },
  });

  const lines = (lastCount?.lines ?? [])
    .slice()
    .sort(
      (a, b) =>
        a.denomination.kind.localeCompare(b.denomination.kind) ||
        b.denomination.valueMinor - a.denomination.valueMinor
    );

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

      {!lastCount ? (
        <p className="py-4 text-center text-[12.5px] text-muted">
          Todavía no hay arqueos. Haz el primer conteo para registrar qué
          billetes y monedas hay en la caja.
        </p>
      ) : (
        <>
          <p className="mb-3 text-[11.5px] text-muted">
            Según el arqueo del {DATE_FMT.format(lastCount.countedAt)}
          </p>
          {lines.length === 0 ? (
            <p className="py-3 text-center text-[12.5px] text-muted">
              La caja quedó vacía en el último arqueo.
            </p>
          ) : (
            <div className="flex flex-col">
              {lines.map((line) => (
                <div
                  key={line.id}
                  className="flex items-center gap-3 border-b border-line-2 py-2 last:border-b-0"
                >
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] bg-chip text-brand">
                    <Banknote className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-semibold text-navy">
                      {fmtMinor(line.denomination.valueMinor, currency)}
                    </div>
                    <div className="text-[10.5px] text-muted">
                      {DENOMINATION_KIND_LABELS[
                        line.denomination.kind as DenominationKind
                      ] ?? line.denomination.kind}
                      {" · "}× {line.quantity}
                    </div>
                  </div>
                  <div className="text-right text-[12.5px] font-semibold text-ink-soft tabular-nums">
                    {fmtMinor(
                      line.denomination.valueMinor * line.quantity,
                      currency
                    )}
                  </div>
                </div>
              ))}
              <div className="mt-2 flex items-center justify-between border-t border-line pt-2.5">
                <span className="text-[12px] font-semibold text-ink-soft">
                  Total contado
                </span>
                <span className="text-[14px] font-bold text-navy tabular-nums">
                  {fmtMinor(lastCount.totalMinor, currency)}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
