import { HandCoins, Plus } from "lucide-react";
import { DebtCard, ClosedDebtRow } from "@/components/debt-card";
import { DebtForm } from "@/components/debt-form";
import { EMPTY_STATE_CTA, EmptyState } from "@/components/empty-state";
import { FilterChips } from "@/components/filter-chips";
import { PanelDrawer } from "@/components/form-drawer";
import { CardGrid, PageBody } from "@/components/page-body";
import { PanelButton } from "@/components/panel-button";
import {
  HEADER_ACTION,
  HeaderPill,
  HeaderStats,
  ScreenHeader,
} from "@/components/screen-header";
import { Section } from "@/components/section";
import { DebtsTabs } from "@/components/section-tabs";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";
import { DEBT_CARD_INCLUDE, toDebtCard } from "@/lib/debt-cards";
import { type DebtDirection } from "@/lib/domain";
import { loadDebtFormOptions } from "@/lib/form-options";
import { fmtMinor } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Nombre del drawer de alta (`/deudas#panel=nueva-deuda`). */
const NEW_DEBT_PANEL = "nueva-deuda";

export default async function DeudasPage({
  searchParams,
}: {
  searchParams: Promise<{ dir?: string }>;
}) {
  const user = await requireSessionUser();
  const { dir } = await searchParams;
  // Sin filtro por defecto: se ven TODAS las deudas, en ambas direcciones.
  const direction: DebtDirection | null =
    dir === "pagar" ? "PAYABLE" : dir === "cobrar" ? "RECEIVABLE" : null;

  // Sin filtro de estado: las saldadas/canceladas se quedan en el historial.
  // El filtro de dirección se aplica en memoria para que los totales de la
  // cabecera («Me deben» / «Debo») no dependan del chip elegido.
  const [debts, formOptions] = await Promise.all([
    prisma.debt.findMany({
      where: { userId: user.id },
      include: DEBT_CARD_INCLUDE,
      orderBy: { createdAt: "desc" },
    }),
    loadDebtFormOptions(user.id),
  ]);

  const all = debts.map(toDebtCard);
  const allOpen = all.filter((debt) => debt.status === "OPEN");
  const visible = direction
    ? all.filter((debt) => debt.direction === direction)
    : all;
  const open = visible.filter((debt) => debt.status === "OPEN");
  const closed = visible.filter((debt) => debt.status !== "OPEN");

  // Pendiente por moneda de TODAS las deudas abiertas, por dirección.
  const totalsText = (wanted: DebtDirection) => {
    const totals = new Map<string, { amount: number; debt: (typeof all)[number] }>();
    for (const debt of allOpen) {
      if (debt.direction !== wanted) continue;
      const entry = totals.get(debt.currencyId);
      if (entry) entry.amount += debt.remainingMinor;
      else totals.set(debt.currencyId, { amount: debt.remainingMinor, debt });
    }
    return [...totals.values()]
      .sort((a, b) => b.amount - a.amount)
      .map((total) => fmtMinor(total.amount, total.debt.currency))
      .join(" · ");
  };
  const receivableText = totalsText("RECEIVABLE");
  const payableText = totalsText("PAYABLE");

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader
        title="Deudas"
        actions={
          <PanelButton panel={NEW_DEBT_PANEL} className={HEADER_ACTION}>
            <Plus className="size-3.5" />
            Nueva
          </PanelButton>
        }
      >
        <HeaderStats
          items={[
            ...(receivableText
              ? [{ label: "Me deben", value: receivableText }]
              : []),
            ...(payableText ? [{ label: "Debo", value: payableText }] : []),
          ]}
        />
        <div className="mt-3">
          <HeaderPill>
            {allOpen.length} abierta{allOpen.length === 1 ? "" : "s"}
          </HeaderPill>
        </div>
      </ScreenHeader>

      <PageBody>
        <DebtsTabs current="/deudas" />

        <FilterChips
          items={[
            { href: "/deudas", label: "Todas", active: direction === null },
            {
              href: "/deudas?dir=cobrar",
              label: "Por cobrar",
              active: direction === "RECEIVABLE",
            },
            {
              href: "/deudas?dir=pagar",
              label: "Por pagar",
              active: direction === "PAYABLE",
            },
          ]}
        />

        {all.length === 0 ? (
          <EmptyState
            icon={HandCoins}
            title="Sin deudas registradas"
            description="Anota lo que te deben o lo que debes para llevar el control de abonos y vencimientos."
            cta={
              <PanelButton panel={NEW_DEBT_PANEL} className={EMPTY_STATE_CTA}>
                Nueva deuda
              </PanelButton>
            }
          />
        ) : visible.length === 0 ? (
          <p className="rounded-2xl border border-line bg-card px-4 py-6 text-center text-sm text-muted">
            No hay deudas {direction === "PAYABLE" ? "por pagar" : "por cobrar"}.
          </p>
        ) : open.length > 0 ? (
          <CardGrid>
            {open.map((debt) => (
              <DebtCard key={debt.id} debt={debt} />
            ))}
          </CardGrid>
        ) : null}

        {closed.length > 0 && (
          <Section title="Historial">
            <CardGrid className="gap-2 @2xl:gap-2.5">
              {closed.map((debt) => (
                <ClosedDebtRow key={debt.id} debt={debt} />
              ))}
            </CardGrid>
          </Section>
        )}
      </PageBody>

      <PanelDrawer
        panel={NEW_DEBT_PANEL}
        title="Nueva deuda"
        description="Anota lo que te deben o lo que debes."
      >
        <DebtForm {...formOptions} />
      </PanelDrawer>
    </main>
  );
}
