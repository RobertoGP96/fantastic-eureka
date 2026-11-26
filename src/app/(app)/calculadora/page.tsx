import { Coins } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageBody } from "@/components/page-body";
import { ScreenHeader } from "@/components/screen-header";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CashCalculator, type CalculatorCurrency } from "./cash-calculator";

export const dynamic = "force-dynamic";

export default async function CalculadoraPage() {
  const user = await requireSessionUser();

  const currencies = await prisma.currency.findMany({
    where: { userId: user.id, active: true },
    orderBy: [{ isBase: "desc" }, { code: "asc" }],
    include: {
      denominations: {
        where: { active: true },
        orderBy: [{ kind: "asc" }, { valueMinor: "desc" }],
        select: { id: true, valueMinor: true, kind: true },
      },
    },
  });

  const options: CalculatorCurrency[] = currencies
    .filter((currency) => currency.denominations.length > 0)
    .map((currency) => ({
      id: currency.id,
      code: currency.code,
      name: currency.name,
      decimalPlaces: currency.decimalPlaces,
      denominations: currency.denominations,
    }));

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title="Calculadora de efectivo" backHref="/">
        <p className="mt-1 text-sm text-white/80">
          Cuenta billetes y monedas sin elegir cuenta; no se guarda nada.
        </p>
      </ScreenHeader>
      {/* Ancho completo: la calculadora reparte contadores y total en dos
          columnas (SplitLayout) cuando hay sitio. */}
      <PageBody>
        {options.length === 0 ? (
          <EmptyState
            icon={Coins}
            title="Sin denominaciones"
            description="Ninguna moneda tiene billetes o monedas configurados. Añádelos para poder contar efectivo."
            ctaLabel="Ir a Monedas"
            ctaHref="/monedas"
          />
        ) : (
          <CashCalculator currencies={options} />
        )}
      </PageBody>
    </main>
  );
}
