import { notFound } from "next/navigation";
import { Page, PageBody } from "@/components/page";
import { ScreenHeader } from "@/components/screen-header";
import { Card } from "@/components/ui/card";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { accountBalanceMinor } from "@/lib/balances";
import { fmtMinor } from "@/lib/format";
import { isCashLikeType } from "@/lib/domain";
import { CountForm } from "./count-form";

export const dynamic = "force-dynamic";

export default async function ConteoCajaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireSessionUser();

  const account = await prisma.account.findFirst({
    where: { id, userId: user.id },
    include: { currency: true },
  });
  if (!account || !isCashLikeType(account.type)) notFound();

  const [expectedMinor, denominations] = await Promise.all([
    accountBalanceMinor(account.id),
    prisma.denomination.findMany({
      where: {
        currencyId: account.currencyId,
        active: true,
        currency: { userId: user.id },
      },
      orderBy: [{ kind: "asc" }, { valueMinor: "desc" }],
    }),
  ]);

  return (
    <Page>
      {/* El saldo teórico va como UNA sola frase en el subtítulo: el test de
          arqueo exige que «1 750 CUP» a secas solo aparezca en el total
          contado, así que aquí no se pinta como cifra suelta (StatCard). */}
      <ScreenHeader
        title={`Arqueo · ${account.name}`}
        subtitle={`Saldo teórico: ${fmtMinor(expectedMinor, account.currency)}`}
        backHref="/conteo"
      />
      <PageBody>
        {denominations.length === 0 ? (
          <Card dashed className="py-6 text-center text-sm text-muted">
            La moneda {account.currency.code} no tiene denominaciones
            configuradas (es saldo digital), así que no admite arqueo físico.
          </Card>
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
      </PageBody>
    </Page>
  );
}
