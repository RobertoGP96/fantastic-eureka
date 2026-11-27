import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  ChevronRight,
  HandCoins,
  Pencil,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { Page, PageBody } from "@/components/page";
import { ScreenHeader } from "@/components/screen-header";
import { SectionHeader } from "@/components/section-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";
import { fmtMinor, fmtMinorParts, fmtRate } from "@/lib/format";
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

const DATE_FMT = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const DATE_TIME_FMT = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function DetailRow({
  label,
  numeric = false,
  children,
}: {
  label: string;
  /** Cifras tabulares (montos y tasas). */
  numeric?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="flex-none text-sm text-muted">{label}</span>
      <span
        className={`min-w-0 text-right text-sm font-medium break-words text-heading ${
          numeric ? "money" : ""
        }`}
      >
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
      cashCount: { select: { id: true } },
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
  const amount = fmtMinorParts(signedMinor, tx.currency);
  const isTransfer = tx.kind === "TRANSFER";
  // INCOME/EXPENSE multi-moneda: el original quedó en counterAmountMinor.
  const crossCurrency =
    !isTransfer && tx.counterAmountMinor !== null && tx.counterCurrency;

  // Vínculo con deudas: abono directo o cuota de un plan.
  const linkedDebt = tx.debtPayment?.debt ?? tx.installment?.plan.debt ?? null;
  const linkedPlan = tx.installment?.plan ?? null;

  // Corrección de equivocaciones: editar (salvo ajustes) y eliminar (salvo el
  // ajuste de un arqueo, que vive ligado a su conteo).
  const canEdit = tx.kind !== "ADJUSTMENT";
  const canDelete = tx.kind !== "ADJUSTMENT" || !tx.cashCount;

  return (
    <Page>
      <ScreenHeader
        title="Detalle del movimiento"
        subtitle={`${kindLabel} · ${DATE_FMT.format(tx.occurredAt)}`}
        backHref="/movimientos"
        actions={
          canEdit && (
            <Link
              href={`/movimientos/${tx.id}/editar`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Pencil className="size-3.5" />
              Editar
            </Link>
          )
        }
      />

      <PageBody>
        {/* grid-cols-1: en móvil la columna tiene mínimo 0, así ningún hijo
            suelto la ensancha más allá de la pantalla. */}
        <div className="grid grid-cols-1 gap-5 @4xl/main:grid-cols-12">
          <div className="flex min-w-0 flex-col gap-5 @4xl/main:col-span-8">
            <Card padding="none" className="divide-y divide-line-2">
              <DetailRow label="Fecha">
                {DATE_TIME_FMT.format(tx.occurredAt)}
              </DetailRow>
              <DetailRow label={isTransfer ? "Cuenta de origen" : "Cuenta"}>
                <Link
                  href={`/cuentas/${tx.account.id}`}
                  className="text-brand-ink hover:text-brand-mid"
                >
                  {tx.account.name}
                </Link>
              </DetailRow>
              {isTransfer && tx.counterAccount && (
                <DetailRow label="Cuenta de destino">
                  <Link
                    href={`/cuentas/${tx.counterAccount.id}`}
                    className="text-brand-ink hover:text-brand-mid"
                  >
                    {tx.counterAccount.name}
                  </Link>
                </DetailRow>
              )}
              <DetailRow label={isTransfer ? "Monto enviado" : "Monto"} numeric>
                {fmtMinor(tx.amountMinor, tx.currency)}
              </DetailRow>
              {isTransfer && tx.counterAmountMinor !== null && (
                <DetailRow label="Monto recibido" numeric>
                  {fmtMinor(
                    tx.counterAmountMinor,
                    tx.counterCurrency ?? tx.currency
                  )}
                </DetailRow>
              )}
              {crossCurrency && (
                <DetailRow label="Monto original" numeric>
                  {fmtMinor(tx.counterAmountMinor!, tx.counterCurrency!)}
                </DetailRow>
              )}
              {tx.rateScaled !== null && tx.counterCurrency && (
                <DetailRow label="Tasa aplicada" numeric>
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
            </Card>

            {breakdownSides.length > 0 && (
              <section>
                <SectionHeader title="Desglose de denominaciones" />
                <div className="flex flex-col gap-3">
                  {breakdownSides.map((side) => {
                    const isOrigin = side.account.id === tx.account.id;
                    const sideCurrency = isOrigin
                      ? tx.currency
                      : (tx.counterCurrency ?? tx.currency);
                    const enters = tx.kind === "INCOME" || !isOrigin;
                    return (
                      <Card
                        key={side.account.id}
                        padding="none"
                        className="divide-y divide-line-2"
                      >
                        <div className="px-4 py-2.5 text-xs font-medium text-muted">
                          {enters ? "Entra en" : "Sale de"} «{side.account.name}»
                        </div>
                        {side.lines.map((line) => (
                          <div
                            key={line.id}
                            className="flex items-baseline justify-between gap-3 px-4 py-2.5"
                          >
                            <span className="money text-sm font-medium text-heading">
                              {fmtMinor(line.denomination.valueMinor, sideCurrency)}
                              <span className="font-normal text-muted">
                                {" "}
                                × {line.quantity}
                              </span>
                            </span>
                            <span className="money text-sm font-semibold text-heading">
                              {fmtMinor(
                                line.denomination.valueMinor * line.quantity,
                                sideCurrency
                              )}
                            </span>
                          </div>
                        ))}
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* En móvil esta columna se «disuelve» (contents) y sus bloques
              pasan a ser hijos de la rejilla: el monto sube arriba del todo
              (order-first) y el vínculo y el borrado quedan al final, tras
              los datos. En escritorio vuelve a ser la columna lateral. */}
          <div className="contents @4xl/main:col-span-4 @4xl/main:flex @4xl/main:min-w-0 @4xl/main:flex-col @4xl/main:gap-5">
            {/* El tipo ya es el rótulo de la cifra: la insignia conserva su
                icono pero dice de qué cuenta sale o a cuál entra, en vez de
                repetirlo. */}
            <StatCard
              size="lg"
              className="order-first min-w-0 @4xl/main:order-none"
              label={kindLabel}
              value={`${signedMinor > 0 ? "+" : ""}${amount.amount}`}
              unit={amount.code}
              hint={
                <Badge className="max-w-full">
                  <Icon className="size-3 flex-none" />
                  <span className="truncate">
                    {tx.account.name}
                    {isTransfer && tx.counterAccount
                      ? ` → ${tx.counterAccount.name}`
                      : ""}
                  </span>
                </Badge>
              }
            />

            {(linkedDebt || linkedPlan) && (
              <Card padding="none" className="min-w-0 overflow-hidden">
                <h2 className="px-4 pt-4 pb-1 text-sm font-semibold text-heading">
                  Vinculado a
                </h2>
                <Link
                  href={
                    linkedDebt
                      ? `/deudas/${linkedDebt.id}`
                      : `/mensualidades/${linkedPlan!.id}`
                  }
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-subtle/60"
                >
                  <span className="flex size-9 flex-none items-center justify-center rounded-xl bg-chip text-brand-ink">
                    <HandCoins className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-heading">
                      {linkedDebt
                        ? `Deuda con ${linkedDebt.contact.name}`
                        : linkedPlan!.description}
                    </div>
                    <div className="truncate text-xs text-muted">
                      {linkedDebt ? linkedDebt.description : "Plan de cuotas"}
                      {linkedPlan?.contact ? ` · ${linkedPlan.contact.name}` : ""}
                    </div>
                  </div>
                  <ChevronRight className="size-4 flex-none text-muted" />
                </Link>
              </Card>
            )}

            {canDelete && (
              <div className="flex min-w-0 justify-end">
                <DeleteEntityButton kind="transaction" targetId={tx.id} />
              </div>
            )}
          </div>
        </div>
      </PageBody>
    </Page>
  );
}
