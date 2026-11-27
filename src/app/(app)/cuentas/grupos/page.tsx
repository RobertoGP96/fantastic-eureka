import { Page, PageBody } from "@/components/page";
import { ScreenHeader } from "@/components/screen-header";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { GroupManager, type GroupItem } from "./group-manager";

export const dynamic = "force-dynamic";

export default async function GruposPage() {
  const user = await requireSessionUser();
  const groups = await prisma.accountGroup.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    include: { _count: { select: { accounts: true } } },
  });

  const items: GroupItem[] = groups.map((group) => ({
    id: group.id,
    name: group.name,
    accountCount: group._count.accounts,
  }));

  return (
    <Page width="narrow">
      <ScreenHeader
        title="Grupos de cuentas"
        subtitle="Organiza tus cuentas: negocio, personal, cajas…"
        backHref="/cuentas"
      />
      <PageBody>
        <GroupManager groups={items} />
      </PageBody>
    </Page>
  );
}
