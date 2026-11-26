import Link from "next/link";
import { Plus } from "lucide-react";
import { CurrencyForm } from "@/components/currency-form";
import { PanelDrawer } from "@/components/form-drawer";
import { PageBody } from "@/components/page-body";
import { PanelButton } from "@/components/panel-button";
import { HEADER_ACTION, ScreenHeader } from "@/components/screen-header";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";
import { CurrencyManager, type CurrencyItem } from "./currency-manager";
import { NEW_CURRENCY_PANEL } from "./panels";

export const dynamic = "force-dynamic";

export default async function MonedasPage() {
  const user = await requireSessionUser();
  const currencies = await prisma.currency.findMany({
    where: { userId: user.id },
    orderBy: [{ isBase: "desc" }, { code: "asc" }],
    include: {
      _count: { select: { accounts: true, denominations: true } },
    },
  });

  const items: CurrencyItem[] = currencies.map((currency) => ({
    id: currency.id,
    code: currency.code,
    name: currency.name,
    symbol: currency.symbol,
    decimalPlaces: currency.decimalPlaces,
    isBase: currency.isBase,
    active: currency.active,
    kind: currency.kind,
    accountCount: currency._count.accounts,
    denominationCount: currency._count.denominations,
  }));

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader
        title="Monedas"
        backHref="/mas"
        actions={
          <PanelButton panel={NEW_CURRENCY_PANEL} className={HEADER_ACTION}>
            <Plus className="size-3.5" />
            Nueva
          </PanelButton>
        }
      >
        <p className="mt-1 text-sm text-white/80">
          Divisas del sistema y sus denominaciones
        </p>
      </ScreenHeader>

      <PageBody>
        <CurrencyManager currencies={items} />

        <p className="text-xs text-muted @2xl:max-w-2xl">
          La moneda base es en la que se consolidan los totales. Las tasas se
          registran por pares en{" "}
          <Link
            href="/tasas"
            className="font-semibold text-brand-ink hover:underline"
          >
            Tasas
          </Link>
          , así que cambiar la base no invalida ninguna: solo hace falta que
          exista un par (directo o inverso) entre cada moneda y la nueva base.
        </p>
      </PageBody>

      <PanelDrawer
        panel={NEW_CURRENCY_PANEL}
        title="Nueva moneda"
        description="Las de efectivo nacen con sus denominaciones básicas."
      >
        <CurrencyForm />
      </PanelDrawer>
    </main>
  );
}
