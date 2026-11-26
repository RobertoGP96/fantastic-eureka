import Link from "next/link";
import type { ReactNode } from "react";
import { Banknote, Calculator, ChevronRight } from "lucide-react";
import { getAccountIcon } from "@/lib/account-icons";
import { EmptyState } from "@/components/empty-state";
import { CardGrid, PageBody, SplitLayout } from "@/components/page-body";
import { ScreenHeader } from "@/components/screen-header";
import { Section } from "@/components/section";
import { Badge } from "@/components/ui/badge";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listAccountsWithBalances } from "@/lib/balances";
import { fmtMinor, fmtSignedMinor } from "@/lib/format";
import { isCashLikeType } from "@/lib/domain";
import { panelHref } from "@/lib/panel-core";

export const dynamic = "force-dynamic";

const DATE_FMT = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const ROW_LINK =
  "press flex items-center gap-3.5 rounded-2xl border border-line bg-card p-4 hover:border-brand-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none";

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

  // Calculadora + cajas: la columna principal.
  const boxes: ReactNode = (
    <>
      {/* Un solo atajo: con ancho de sobra no se estira a toda la columna. */}
      <Link href="/calculadora" className={`${ROW_LINK} @2xl:max-w-md`}>
        <span className="flex size-11 flex-none items-center justify-center rounded-xl bg-chip text-brand-ink">
          <Calculator className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-heading">
            Calculadora de efectivo
          </div>
          <div className="text-xs text-muted">
            Cuenta billetes y monedas sin elegir cuenta
          </div>
        </div>
        <ChevronRight className="size-4 flex-none text-muted" />
      </Link>

      {cashAccounts.length === 0 ? (
        <EmptyState
          icon={Banknote}
          title="Sin cajas de efectivo"
          description="Crea una cuenta de tipo Efectivo o Caja (denominaciones) para poder hacer arqueos."
          ctaLabel="Crear cuenta"
          // El alta de cuenta es un drawer de /cuentas.
          ctaHref={panelHref("/cuentas", "nueva-cuenta")}
        />
      ) : (
        <Section title="Elige la caja a contar">
          <CardGrid>
            {cashAccounts.map((account) => {
              const Icon = getAccountIcon(account.icon, account.type);
              return (
                <Link
                  key={account.id}
                  href={`/conteo/${account.id}`}
                  className={ROW_LINK}
                >
                  <span className="flex size-11 flex-none items-center justify-center rounded-xl bg-chip text-brand-ink">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-heading">
                      {account.name}
                    </div>
                    <div className="text-xs text-muted">
                      Saldo teórico:{" "}
                      {fmtMinor(account.balanceMinor, account.currency)}
                    </div>
                  </div>
                  <ChevronRight className="size-4 flex-none text-muted" />
                </Link>
              );
            })}
          </CardGrid>
        </Section>
      )}
    </>
  );

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title="Conteo de efectivo" backHref="/mas" />

      <PageBody>
        {counts.length === 0 ? (
          // Sin historial no hay lateral: las cajas usan todo el ancho.
          boxes
        ) : (
          // Escritorio: cajas a la izquierda y los últimos arqueos fijos a
          // la derecha. En móvil, uno debajo del otro como siempre.
          <SplitLayout
            main={boxes}
            aside={
              <Section title="Arqueos recientes">
                <div className="anim-stagger flex flex-col gap-2">
                  {counts.map((count) => (
                    <div
                      key={count.id}
                      className="flex items-center gap-3 rounded-2xl border border-line bg-card px-3.5 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-heading">
                          {count.account.name} ·{" "}
                          {fmtMinor(count.totalMinor, count.account.currency)}
                        </div>
                        <div className="text-xs text-muted">
                          {DATE_FMT.format(count.countedAt)}
                        </div>
                      </div>
                      {count.differenceMinor === 0 ? (
                        <Badge variant="ok">Cuadra</Badge>
                      ) : (
                        <Badge
                          variant={
                            count.differenceMinor > 0 ? "warn" : "danger"
                          }
                        >
                          {fmtSignedMinor(
                            count.differenceMinor,
                            count.account.currency
                          )}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            }
          />
        )}
      </PageBody>
    </main>
  );
}
