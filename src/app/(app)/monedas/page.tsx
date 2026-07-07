import { ScreenHeader } from "@/components/screen-header";
import { prisma } from "@/lib/db";
import { CurrencyManager, type CurrencyItem } from "./currency-manager";

export const dynamic = "force-dynamic";

export default async function MonedasPage() {
  const currencies = await prisma.currency.findMany({
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
    accountCount: currency._count.accounts,
    denominationCount: currency._count.denominations,
  }));

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title="Monedas" backHref="/mas">
        <p className="mt-1 text-[12.5px] text-white/70">
          Divisas del sistema y sus denominaciones
        </p>
      </ScreenHeader>
      <div className="anim-fade-up px-5 pt-5 md:max-w-xl md:px-0">
        <CurrencyManager currencies={items} />
      </div>
    </main>
  );
}
