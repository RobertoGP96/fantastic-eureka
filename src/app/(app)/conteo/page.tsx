import Link from "next/link";
import { Banknote, Calculator, ChevronRight } from "lucide-react";
import { getAccountIcon } from "@/lib/account-icons";
import { Page, PageBody } from "@/components/page";
import { ScreenHeader } from "@/components/screen-header";
import { SectionHeader } from "@/components/section-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listAccountsWithBalances } from "@/lib/balances";
import { fmtMinor, fmtSignedMinor } from "@/lib/format";
import { isCashLikeType } from "@/lib/domain";

export const dynamic = "force-dynamic";

const DATE_FMT = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function ConteoPage() {
  const user = await requireSessionUser();
  const [accounts, counts] = await Promise.all([
    listAccountsWithBalances(user.id),
    prisma.cashCount.findMany({
      where: { userId: user.id },
      include: { account: { include: { currency: true } } },
      orderBy: { countedAt: "desc" },
      take: 10,
    }),
  ]);
  const cashAccounts = accounts.filter((account) =>
    isCashLikeType(account.type)
  );

  // Sin arqueos previos no hay columna lateral: las cajas ocupan todo el
  // ancho (y caben tres por fila). Cadenas literales para el escáner de
  // Tailwind.
  const hasCounts = counts.length > 0;
  const mainSpan = hasCounts
    ? "min-w-0 @4xl/main:col-span-8"
    : "min-w-0 @4xl/main:col-span-12";
  const tileGrid = hasCounts
    ? "grid gap-3 @2xl/main:grid-cols-2"
    : "grid gap-3 @2xl/main:grid-cols-2 @4xl/main:grid-cols-3";

  return (
    <Page>
      <ScreenHeader
        title="Conteo de efectivo"
        subtitle="Arqueo de cajas con denominaciones"
        backHref="/mas"
        actions={
          <Link
            href="/calculadora"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Calculator className="size-3.5" />
            Calculadora
          </Link>
        }
      />

      <PageBody>
        <div className="grid gap-5 @4xl/main:grid-cols-12">
          {cashAccounts.length === 0 ? (
            <div className={mainSpan}>
              <EmptyState
                icon={Banknote}
                title="Sin cajas de efectivo"
                description="Crea una cuenta de tipo Efectivo o Caja (denominaciones) para poder hacer arqueos."
                ctaLabel="Crear cuenta"
                ctaHref="/cuentas/nueva"
              />
            </div>
          ) : (
            <section className={mainSpan}>
              <SectionHeader title="Elige la caja a contar" />
              <div className={tileGrid}>
                {cashAccounts.map((account) => {
                  const Icon = getAccountIcon(account.icon, account.type);
                  return (
                    // Cada caja es UN solo enlace con el nombre y el saldo
                    // teórico en una sola frase: los tests E2E la localizan
                    // por el nombre y leen «Saldo teórico: …» dentro.
                    <Card key={account.id} asChild interactive>
                      <Link
                        href={`/conteo/${account.id}`}
                        className="flex items-center gap-3"
                      >
                        <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-chip text-brand-ink">
                          <Icon className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-heading">
                            {account.name}
                          </div>
                          <div className="money truncate text-xs text-muted">
                            {`Saldo teórico: ${fmtMinor(account.balanceMinor, account.currency)}`}
                          </div>
                        </div>
                        <ChevronRight className="size-4 flex-none text-muted" />
                      </Link>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {hasCounts && (
            <section className="min-w-0 @4xl/main:col-span-4">
              <SectionHeader title="Arqueos recientes" />
              {/* OJO, estructura fijada por el test de arqueo: fila > columna
                  de texto > título cuyo texto COMPLETO es «{caja} · {monto}»
                  (sin spans intermedios), con la insignia en la misma fila.
                  Las filas NO son enlaces: en la página solo puede haber un
                  enlace que contenga el nombre de la caja (su tarjeta). */}
              <Card
                padding="none"
                className="divide-y divide-line-2 overflow-hidden"
              >
                {counts.map((count) => (
                  <div
                    key={count.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="money text-sm font-medium break-words text-heading">
                        {count.account.name} ·{" "}
                        {fmtMinor(count.totalMinor, count.account.currency)}
                      </div>
                      <div className="text-xs text-muted">
                        {DATE_FMT.format(count.countedAt)}
                      </div>
                    </div>
                    {count.differenceMinor === 0 ? (
                      <Badge variant="ok" className="flex-none">
                        Cuadra
                      </Badge>
                    ) : (
                      <Badge
                        variant={count.differenceMinor > 0 ? "warn" : "danger"}
                        className="money flex-none"
                      >
                        {fmtSignedMinor(
                          count.differenceMinor,
                          count.account.currency
                        )}
                      </Badge>
                    )}
                  </div>
                ))}
              </Card>
            </section>
          )}
        </div>
      </PageBody>
    </Page>
  );
}
