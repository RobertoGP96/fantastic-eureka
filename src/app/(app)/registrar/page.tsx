import { ScreenHeader } from "@/components/screen-header";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { latestPairRatesLite } from "@/lib/rates";
import { RegisterForm } from "./register-form";

export const dynamic = "force-dynamic";

const VALID_MODES = ["gasto", "ingreso", "transferencia"] as const;
type Mode = (typeof VALID_MODES)[number];

export default async function RegistrarPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; cuenta?: string }>;
}) {
  const { tipo, cuenta } = await searchParams;
  const user = await requireSessionUser();

  const [accounts, categories, currencies, base, pairRates] =
    await Promise.all([
      prisma.account.findMany({
        where: { archived: false, userId: user.id },
        include: {
          currency: { select: { id: true, code: true, decimalPlaces: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.category.findMany({
        where: { active: true, userId: user.id },
        orderBy: { name: "asc" },
        select: { id: true, name: true, kind: true },
      }),
      prisma.currency.findMany({
        where: { active: true, userId: user.id },
        orderBy: { code: "asc" },
        select: { id: true, code: true, decimalPlaces: true },
      }),
      prisma.currency.findFirst({
        where: { isBase: true, userId: user.id },
        select: { id: true },
      }),
      latestPairRatesLite(user.id),
    ]);

  const initialMode: Mode = VALID_MODES.includes(tipo as Mode)
    ? (tipo as Mode)
    : "gasto";

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title="Registrar" backHref="/" />
      <div className="anim-fade-up px-5 pt-5 md:max-w-md md:px-0">
        <RegisterForm
          accounts={accounts.map((account) => ({
            id: account.id,
            name: account.name,
            currency: account.currency,
          }))}
          categories={categories}
          currencies={currencies}
          pairRates={pairRates}
          baseCurrencyId={base?.id ?? null}
          initialMode={initialMode}
          initialAccountId={
            accounts.some((account) => account.id === cuenta)
              ? cuenta
              : undefined
          }
        />
      </div>
    </main>
  );
}
