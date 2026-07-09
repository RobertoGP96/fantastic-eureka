import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  HandCoins,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { ScreenHeader } from "@/components/screen-header";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";
import { fmtMinor, fmtRate, fmtSignedMinor } from "@/lib/format";
import {
  TRANSACTION_KIND_LABELS,
  type TransactionKind,
} from "@/lib/domain";

export const dynamic = "force-dynamic";

const KIND_ICONS: Record<string, LucideIcon> = {
  INCOME: ArrowDownLeft,
  EXPENSE: ArrowUpRight,
  TRANSFER: ArrowRightLeft,
  ADJUSTMENT: SlidersHorizontal,
};

const DATE_TIME_FMT = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <span className="flex-none text-[12px] font-medium text-muted">
        {label}
      </span>
      <span className="min-w-0 text-right text-[13px] font-semibold text-navy">
        {children}
      </span>
    </div>
  );
}

export default async function MovimientoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireSessionUser();
  const { id } = await params;

  const tx = await prisma.transaction.findFirst({
    where: { id, userId: user.id },
    include: {
      account: { select: { id: true, name: true } },
      counterAccount: { select: { id: true, name: true } },
      currency: { select: { code: true, decimalPlaces: true } },
      counterCurrency: { select: { code: true, decimalPlaces: true } },
      category: { select: { name: true } },
      debtPayment: {
        include: {
          debt: { include: { contact: { select: { name: true } } } },
        },
      },
      installment: {
        include: {
          plan: {
            include: {
              contact: { select: { name: true } },
              debt: { include: { contact: { select: { name: true } } } },
            },
          },
        },
      },
      denominationLines: {
        include: {
          denomination: { select: { valueMinor: true, kind: true } },
          account: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!tx) notFound();

  // Desglose por lado (en TRANSFER puede haber salida y entrada); dentro de
  // cada lado, mayor valor primero.
  const breakdownSides = [
    ...new Map(
      tx.denominationLines.map((line) => [line.account.id, line.account])
    ).values(),
  ].map((account) => ({
    account,
    lines: tx.denominationLines
      .filter((line) => line.account.id === account.id)
      .sort(
        (a, b) =>
          a.denomination.kind.localeCompare(b.denomination.kind) ||
          b.denomination.valueMinor - a.denomination.valueMinor
      ),
  }));

  const kindLabel =
    TRANSACTION_KIND_LABELS[tx.kind as TransactionKind] ?? tx.kind;
  const Icon = KIND_ICONS[tx.kind] ?? ArrowRightLeft;
  // Signo desde la cuenta de origen (en TRANSFER el destino recibe aparte).
  const signedMinor =
    tx.kind === "EXPENSE" || tx.kind === "TRANSFER"
      ? -tx.amountMinor
      : tx.amountMinor;
  const isTransfer = tx.kind === "TRANSFER";
  // INCOME/EXPENSE multi-moneda: el original quedó en counterAmountMinor.
  const crossCurrency =
    !isTransfer && tx.counterAmountMinor !== null && tx.counterCurrency;

  // Vínculo con deudas: abono directo o cuota de un plan.
  const linkedDebt = tx.debtPayment?.debt ?? tx.installment?.plan.debt ?? null;
  const linkedPlan = tx.installment?.plan ?? null;

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title="Detalle del movimiento" backHref="/movimientos">
        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="text-[11.5px] font-medium tracking-wide text-white/60 uppercase">
              {kindLabel}
            </div>
            <div className="mt-0.5 text-[26px] font-bold tracking-[-0.5px]">
              {fmtSignedMinor(signedMinor, tx.currency)}
            </div>
          </div>
          <Badge variant="neutral" className="mb-1.5 bg-white/15 text-white">
            <Icon className="h-3 w-3" />
            {kindLabel}
          </Badge>
        </div>
      </ScreenHeader>

      <div className="anim-fade-up flex flex-col gap-5 px-5 pt-5 md:max-w-2xl md:px-0">
        <section className="divide-y divide-line rounded-[18px] border border-line bg-white px-4 py-1">
          <DetailRow label="Fecha">
            {DATE_TIME_FMT.format(tx.occurredAt)}
          </DetailRow>
          <DetailRow label={isTransfer ? "Cuenta de origen" : "Cuenta"}>
            <Link
              href={`/cuentas/${tx.account.id}`}
              className="text-brand hover:underline"
            >
              {tx.account.name}
            </Link>
          </DetailRow>
          {isTransfer && tx.counterAccount && (
            <DetailRow label="Cuenta de destino">
              <Link
                href={`/cuentas/${tx.counterAccount.id}`}
                className="text-brand hover:underline"
              >
                {tx.counterAccount.name}
              </Link>
            </DetailRow>
          )}
          <DetailRow label={isTransfer ? "Monto enviado" : "Monto"}>
            {fmtMinor(tx.amountMinor, tx.currency)}
          </DetailRow>
          {isTransfer && tx.counterAmountMinor !== null && (
            <DetailRow label="Monto recibido">
              {fmtMinor(
                tx.counterAmountMinor,
                tx.counterCurrency ?? tx.currency
              )}
            </DetailRow>
          )}
          {crossCurrency && (
            <DetailRow label="Monto original">
              {fmtMinor(tx.counterAmountMinor!, tx.counterCurrency!)}
            </DetailRow>
          )}
          {tx.rateScaled !== null && tx.counterCurrency && (
            <DetailRow label="Tasa aplicada">
              1 {tx.currency.code} = {fmtRate(tx.rateScaled)}{" "}
              {tx.counterCurrency.code}
            </DetailRow>
          )}
          {tx.category && (
            <DetailRow label="Categoría">{tx.category.name}</DetailRow>
          )}
          {tx.note && <DetailRow label="Nota">{tx.note}</DetailRow>}
          <DetailRow label="Registrado el">
            {DATE_TIME_FMT.format(tx.createdAt)}
          </DetailRow>
        </section>

        {breakdownSides.length > 0 && (
          <section>
            <h2 className="mb-2.5 text-[14.5px] font-bold text-navy">
              Desglose de denominaciones
            </h2>
            <div className="flex flex-col gap-2.5">
              {breakdownSides.map((side) => {
                const isOrigin = side.account.id === tx.account.id;
                const sideCurrency = isOrigin
                  ? tx.currency
                  : (tx.counterCurrency ?? tx.currency);
                const enters = tx.kind === "INCOME" || !isOrigin;
                return (
                  <div
                    key={side.account.id}
                    className="rounded-[16px] border border-line bg-white px-4 py-2"
                  >
                    <div className="border-b border-line-2 py-2 text-[11.5px] font-semibold text-muted">
                      {enters ? "Entra en" : "Sale de"} «{side.account.name}»
                    </div>
                    {side.lines.map((line) => (
                      <div
                        key={line.id}
                        className="flex items-baseline justify-between gap-3 border-b border-line-2 py-2 last:border-b-0"
                      >
                        <span className="text-[12.5px] font-semibold text-navy">
                          {fmtMinor(line.denomination.valueMinor, sideCurrency)}
                          <span className="font-normal text-muted">
                            {" "}
                            × {line.quantity}
                          </span>
                        </span>
                        <span className="text-[12.5px] font-semibold text-ink-soft tabular-nums">
                          {fmtMinor(
                            line.denomination.valueMinor * line.quantity,
                            sideCurrency
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {(linkedDebt || linkedPlan) && (
          <section>
            <h2 className="mb-2.5 text-[14.5px] font-bold text-navy">
              Vinculado a
            </h2>
            <Link
              href={
                linkedDebt
                  ? `/deudas/${linkedDebt.id}`
                  : `/deudas/plan/${linkedPlan!.id}`
              }
              className="flex items-center gap-3 rounded-[16px] border border-line bg-white px-3.5 py-3 transition-colors hover:border-brand-soft"
            >
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[12px] bg-chip text-brand">
                <HandCoins className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-navy">
                  {linkedDebt
                    ? `Deuda con ${linkedDebt.contact.name}`
                    : linkedPlan!.description}
                </div>
                <div className="truncate text-[11.5px] text-muted">
                  {linkedDebt ? linkedDebt.description : "Plan de cuotas"}
                  {linkedPlan?.contact ? ` · ${linkedPlan.contact.name}` : ""}
                </div>
              </div>
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
