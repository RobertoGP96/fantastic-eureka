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
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title="Grupos de cuentas" backHref="/cuentas">
        <p className="mt-1 text-[12.5px] text-white/70">
          Organiza tus cuentas: negocio, personal, cajas…
        </p>
      </ScreenHeader>
      <div className="anim-fade-up px-5 pt-5 md:max-w-xl md:px-0">
        <GroupManager groups={items} />
      </div>
    </main>
  );
}
