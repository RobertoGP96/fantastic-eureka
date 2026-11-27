import { Page, PageBody } from "@/components/page";
import { ScreenHeader } from "@/components/screen-header";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";
import { DebtForm } from "./debt-form";

export const dynamic = "force-dynamic";

export default async function NuevaDeudaPage() {
  const user = await requireSessionUser();
  const [contacts, currencies, accounts] = await Promise.all([
    prisma.contact.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.currency.findMany({
      where: { userId: user.id, active: true },
      orderBy: [{ isBase: "desc" }, { code: "asc" }],
      select: { id: true, code: true },
    }),
    prisma.account.findMany({
      where: { userId: user.id, archived: false },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, currencyId: true },
    }),
  ]);

  return (
    <Page width="form">
      <ScreenHeader
        title="Nueva deuda"
        subtitle="Lo que te deben o lo que debes"
        backHref="/deudas"
      />
      <PageBody>
        <Card>
          <DebtForm
            contacts={contacts}
            currencies={currencies}
            accounts={accounts}
          />
        </Card>
      </PageBody>
    </Page>
  );
}
