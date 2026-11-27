import Link from "next/link";
import { ArrowRightLeft, Plus } from "lucide-react";
import { CurrencyForm } from "@/components/currency-form";
import { PanelDrawer } from "@/components/form-drawer";
import { Page, PageBody } from "@/components/page";
import { PanelButton } from "@/components/panel-button";
import { ScreenHeader } from "@/components/screen-header";
import { buttonVariants } from "@/components/ui/button";
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
    // narrow: con el alta en un drawer la página es una lista simple.
    <Page width="narrow">
      <ScreenHeader
        title="Monedas"
        subtitle="Divisas del sistema y sus denominaciones"
        backHref="/mas"
        actions={
          <>
            <Link
              href="/tasas"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ArrowRightLeft className="size-3.5" />
              Tasas
            </Link>
            <PanelButton
              panel={NEW_CURRENCY_PANEL}
              className={buttonVariants({ size: "sm" })}
            >
              <Plus className="size-3.5" />
              Nueva
            </PanelButton>
          </>
        }
      />

      <PageBody>
        <CurrencyManager currencies={items} />

        <p className="text-xs text-muted">
          La moneda base es en la que se consolidan los totales. Las tasas se
          registran por pares en{" "}
          <Link
            href="/tasas"
            className="font-semibold text-brand-ink hover:text-brand-mid"
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
    </Page>
  );
}
