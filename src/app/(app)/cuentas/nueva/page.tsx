import { Page, PageBody } from "@/components/page";
import { ScreenHeader } from "@/components/screen-header";
import { Card } from "@/components/ui/card";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AccountForm } from "./account-form";

export const dynamic = "force-dynamic";

export default async function NuevaCuentaPage() {
  const user = await requireSessionUser();
  const [currencies, groups] = await Promise.all([
    prisma.currency.findMany({
      where: { active: true, userId: user.id },
      orderBy: [{ isBase: "desc" }, { code: "asc" }],
      select: { id: true, code: true, name: true, kind: true },
    }),
    prisma.accountGroup.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <Page width="form">
      <ScreenHeader
        title="Nueva cuenta"
        subtitle="Efectivo, caja, banco o saldo digital"
        backHref="/cuentas"
      />
      <PageBody>
        <Card>
          <AccountForm currencies={currencies} groups={groups} />
        </Card>
      </PageBody>
    </Page>
  );
}
