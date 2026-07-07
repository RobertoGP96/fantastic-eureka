import { notFound } from "next/navigation";
import { ScreenHeader } from "@/components/screen-header";
import { prisma } from "@/lib/db";
import { accountBalanceMinor } from "@/lib/balances";
import { fmtMinor } from "@/lib/format";
import { CountForm } from "./count-form";

export const dynamic = "force-dynamic";

export default async function ConteoCajaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const account = await prisma.account.findUnique({
    where: { id },
    include: { currency: true },
  });
  if (!account || account.type !== "CASH") notFound();

  const [expectedMinor, denominations] = await Promise.all([
    accountBalanceMinor(account.id),
    prisma.denomination.findMany({
      where: { currencyId: account.currencyId, active: true },
      orderBy: [{ kind: "asc" }, { valueMinor: "desc" }],
    }),
  ]);

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title={`Arqueo · ${account.name}`} backHref="/conteo">
        <p className="mt-1 text-[12.5px] text-white/70">
          Saldo teórico: {fmtMinor(expectedMinor, account.currency)}
        </p>
      </ScreenHeader>
      <div className="anim-fade-up px-5 pt-5 md:max-w-xl md:px-0">
        {denominations.length === 0 ? (
          <div className="rounded-[16px] border border-line bg-white px-4 py-6 text-center text-[13px] text-muted">
            La moneda {account.currency.code} no tiene denominaciones
            configuradas (es saldo digital), así que no admite arqueo físico.
          </div>
        ) : (
          <CountForm
            account={{ id: account.id, name: account.name }}
            currency={{
              code: account.currency.code,
              decimalPlaces: account.currency.decimalPlaces,
            }}
            denominations={denominations.map((d) => ({
              id: d.id,
              valueMinor: d.valueMinor,
              kind: d.kind,
            }))}
            expectedMinor={expectedMinor}
          />
        )}
      </div>
    </main>
  );
}
