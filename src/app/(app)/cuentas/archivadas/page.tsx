import { Archive } from "lucide-react";
import { Page, PageBody } from "@/components/page";
import { ScreenHeader } from "@/components/screen-header";
import { EmptyState } from "@/components/empty-state";
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
    <Page>
      <ScreenHeader
        title="Cuentas archivadas"
        // Sin archivadas, el vacío de abajo ya lo explica: no se repite.
        subtitle={
          accounts.length > 0
            ? "Las cuentas archivadas conservan su historial y no aparecen al registrar movimientos. Entra al detalle para activarlas de nuevo."
            : undefined
        }
        backHref="/cuentas"
      />

      <PageBody>
        {accounts.length === 0 ? (
          <EmptyState
            icon={Archive}
            title="Sin cuentas archivadas"
            description="Cuando archives una cuenta desde su detalle, aparecerá aquí con su historial intacto."
          />
        ) : (
          // grid-cols-1 explícito: la columna implícita (auto) crecía hasta
          // el nombre más largo y la página desbordaba en móvil.
          <div className="grid grid-cols-1 gap-3 @2xl/main:grid-cols-2 @4xl/main:grid-cols-3">
            {accounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        )}
      </PageBody>
    </Page>
  );
}
