import Link from "next/link";
import { ArrowRightLeft } from "lucide-react";
import { Page, PageBody } from "@/components/page";
import { ScreenHeader } from "@/components/screen-header";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";
import { CurrencyManager, type CurrencyItem } from "./currency-manager";

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
    <Page>
      <ScreenHeader
        title="Monedas"
        subtitle="Divisas del sistema y sus denominaciones"
        backHref="/mas"
        actions={
          <Link
            href="/tasas"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ArrowRightLeft className="size-3.5" />
            Tasas
          </Link>
        }
      />
      <PageBody>
        <CurrencyManager currencies={items} />
      </PageBody>
    </Page>
  );
}
