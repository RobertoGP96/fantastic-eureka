import Link from "next/link";
import { Archive, FolderOpen, Plus, Wallet } from "lucide-react";
import { Page, PageBody } from "@/components/page";
import { ScreenHeader } from "@/components/screen-header";
import { SectionHeader } from "@/components/section-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  latestRatesByCurrency,
  listAccountsWithBalances,
  type AccountWithBalance,
} from "@/lib/balances";
import { consolidatedTotalMinor, totalsByCurrency } from "@/lib/balances-core";
import { fmtMinor } from "@/lib/format";
import { AccountCard } from "./account-card";

export const dynamic = "force-dynamic";

interface Section {
  key: string;
  name: string | null;
  accounts: AccountWithBalance[];
  subtotalMinor: number | null;
}

// Rejilla de teselas, la misma en cada grupo: 1 columna en móvil, 2 y 3 según
// el ancho REAL de la columna de contenido. grid-cols-1 explícito: la columna
// implícita (auto) crecía hasta el nombre más largo y la página desbordaba.
const TILE_GRID =
  "grid grid-cols-1 gap-3 @2xl/main:grid-cols-2 @4xl/main:grid-cols-3";

// Las acciones secundarias de la cabecera quedan en solo icono cuando la
// columna es estrecha (en un móvil los tres botones con texto no caben junto
// al título); el rótulo sigue en el DOM para lectores de pantalla.
const ACTION_LABEL = "sr-only @xl/main:not-sr-only";

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

export default async function CuentasPage() {
  const user = await requireSessionUser();
  const [accounts, groups, base, rates, archivedCount] = await Promise.all([
    listAccountsWithBalances(user.id),
    prisma.accountGroup.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.currency.findFirst({ where: { isBase: true, userId: user.id } }),
    latestRatesByCurrency(user.id),
    prisma.account.count({ where: { userId: user.id, archived: true } }),
  ]);

  const sections: Section[] =
    groups.length > 0
      ? [
          ...groups.map((group) => ({
            key: group.id,
            name: group.name,
            accounts: accounts.filter((a) => a.group?.id === group.id),
            subtotalMinor: null,
          })),
          {
            key: "none",
            name: "Sin grupo",
            accounts: accounts.filter((a) => !a.group),
            subtotalMinor: null,
          },
        ]
      : [{ key: "all", name: null, accounts, subtotalMinor: null }];

  const visible = sections.filter((section) => section.accounts.length > 0);

  // Subtotal por grupo consolidado a la base; se omite si falta alguna tasa
  // (un total parcial engaña).
  if (base) {
    for (const section of visible) {
      const total = consolidatedTotalMinor(section.accounts, base, rates);
      section.subtotalMinor = total.complete ? total.totalMinor : null;
    }
  }

  const accountsLabel = plural(accounts.length, "cuenta", "cuentas");

  return (
    <Page>
      <ScreenHeader
        title="Cuentas"
        subtitle={
          groups.length > 0 ? (
            // Cada dato es indivisible: si no caben los dos, el salto de
            // línea cae entre ellos y no en medio de «3 grupos».
            <>
              <span className="whitespace-nowrap">{accountsLabel}</span> ·{" "}
              <span className="whitespace-nowrap">
                {plural(groups.length, "grupo", "grupos")}
              </span>
            </>
          ) : (
            accountsLabel
          )
        }
        actions={
          <>
            {archivedCount > 0 && (
              <Link
                href="/cuentas/archivadas"
                title={`Archivadas (${archivedCount})`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Archive className="size-3.5" />
                <span className={ACTION_LABEL}>
                  Archivadas ({archivedCount})
                </span>
              </Link>
            )}
            <Link
              href="/cuentas/grupos"
              title="Grupos"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <FolderOpen className="size-3.5" />
              <span className={ACTION_LABEL}>Grupos</span>
            </Link>
            <Link
              href="/cuentas/nueva"
              className={buttonVariants({ size: "sm" })}
            >
              {/* Con el botón de archivadas delante, en móvil el «+» se
                  oculta para que el subtítulo quepa en una línea. */}
              <Plus
                className={
                  archivedCount > 0
                    ? "hidden size-3.5 @xl/main:block"
                    : "size-3.5"
                }
              />
              Nueva cuenta
            </Link>
          </>
        }
      />

      <PageBody className="gap-6">
        {accounts.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Sin cuentas todavía"
            description="Crea tu primera cuenta o caja para empezar a registrar movimientos."
            ctaLabel="Crear cuenta"
            ctaHref="/cuentas/nueva"
          />
        ) : (
          visible.map((section) => {
            const tiles = section.accounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ));

            // Sin grupos no hay cabecera que pintar: la rejilla va sola.
            if (!section.name) {
              return (
                <div key={section.key} className={TILE_GRID}>
                  {tiles}
                </div>
              );
            }

            // Totales por cada divisa usada en el grupo (sin conversión):
            // visibles aunque falten tasas para el consolidado en base. Si el
            // grupo entero está en la base, el consolidado ya es exacto y las
            // insignias serían redundantes.
            const currencyTotals = totalsByCurrency(section.accounts);
            const onlyBase =
              currencyTotals.length === 1 &&
              currencyTotals[0].currency.id === base?.id;

            return (
              <section key={section.key}>
                <SectionHeader
                  title={section.name}
                  description={
                    !onlyBase && currencyTotals.length > 0 ? (
                      <span className="flex flex-wrap gap-1.5 pt-1">
                        {currencyTotals.map((total) => (
                          <Badge
                            key={total.currency.id}
                            variant={total.totalMinor < 0 ? "danger" : "neutral"}
                            className="money"
                          >
                            {fmtMinor(total.totalMinor, total.currency)}
                          </Badge>
                        ))}
                      </span>
                    ) : undefined
                  }
                  action={
                    base && section.subtotalMinor !== null ? (
                      // self-start + leading-6: el subtotal se alinea con el
                      // nombre del grupo aunque debajo haya insignias.
                      <span
                        className={`money flex-none self-start text-sm leading-6 font-semibold ${
                          section.subtotalMinor < 0
                            ? "text-danger"
                            : "text-heading"
                        }`}
                        title={`Consolidado en ${base.code}`}
                      >
                        {onlyBase ? "" : "≈ "}
                        {fmtMinor(section.subtotalMinor, base)}
                      </span>
                    ) : undefined
                  }
                />
                <div className={TILE_GRID}>{tiles}</div>
              </section>
            );
          })
        )}
      </PageBody>
    </Page>
  );
}
