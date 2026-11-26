import { Archive } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { CardGrid, PageBody } from "@/components/page-body";
import { ScreenHeader } from "@/components/screen-header";
import { requireSessionUser } from "@/lib/auth";
import { listAccountsWithBalances } from "@/lib/balances";
import { AccountCard } from "../account-card";

export const dynamic = "force-dynamic";

export default async function CuentasArchivadasPage() {
  const user = await requireSessionUser();
  const accounts = (
    await listAccountsWithBalances(user.id, { includeArchived: true })
  ).filter((account) => account.archived);

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title="Cuentas archivadas" backHref="/cuentas" />

      <PageBody>
        {accounts.length === 0 ? (
          <EmptyState
            icon={Archive}
            title="Sin cuentas archivadas"
            description="Cuando archives una cuenta desde su detalle, aparecerá aquí con su historial intacto."
          />
        ) : (
          <>
            <p className="text-xs text-muted">
              Las cuentas archivadas conservan su historial y no aparecen al
              registrar movimientos. Entra al detalle para activarlas de nuevo.
            </p>
            <CardGrid>
              {accounts.map((account) => (
                <AccountCard key={account.id} account={account} />
              ))}
            </CardGrid>
          </>
        )}
      </PageBody>
    </main>
  );
}
