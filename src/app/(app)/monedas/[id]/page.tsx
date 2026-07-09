import { notFound } from "next/navigation";
import { ScreenHeader } from "@/components/screen-header";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";
import {
  DenominationManager,
  type DenominationItem,
} from "./denomination-manager";

export const dynamic = "force-dynamic";

export default async function MonedaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireSessionUser();
  const { id } = await params;

  const currency = await prisma.currency.findFirst({
    where: { id, userId: user.id },
    include: {
      denominations: {
        orderBy: [{ kind: "asc" }, { valueMinor: "desc" }],
        include: { _count: { select: { countLines: true, txLines: true } } },
      },
    },
  });
  if (!currency) notFound();

  const items: DenominationItem[] = currency.denominations.map((d) => ({
    id: d.id,
    valueMinor: d.valueMinor,
    kind: d.kind,
    active: d.active,
    usageCount: d._count.countLines + d._count.txLines,
  }));

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader
        title={`${currency.code} · ${currency.name}`}
        backHref="/monedas"
      >
        <p className="mt-1 text-[12.5px] text-white/70">
          {currency.decimalPlaces} decimales
          {currency.isBase ? " · Moneda base" : ""}
          {currency.denominations.length === 0
            ? " · Sin denominaciones (solo saldo digital)"
            : ""}
        </p>
      </ScreenHeader>
      <div className="anim-fade-up px-5 pt-5 md:max-w-xl md:px-0">
        <DenominationManager
          currency={{
            id: currency.id,
            code: currency.code,
            decimalPlaces: currency.decimalPlaces,
          }}
          denominations={items}
        />
      </div>
    </main>
  );
}
