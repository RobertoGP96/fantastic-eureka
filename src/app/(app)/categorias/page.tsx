import { Plus } from "lucide-react";
import { FilterChips } from "@/components/filter-chips";
import { PageBody } from "@/components/page-body";
import { PanelButton } from "@/components/panel-button";
import { HEADER_ACTION, ScreenHeader } from "@/components/screen-header";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";
import { type CategoryKind } from "@/lib/domain";
import {
  CategoryManager,
  NewCategoryDrawer,
  type CategoryItem,
} from "./category-manager";
import { KIND_PARAM, NEW_CATEGORY_PANEL } from "./panels";

export const dynamic = "force-dynamic";

export default async function CategoriasPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const user = await requireSessionUser();
  const { tipo } = await searchParams;
  // Pestaña visible en móvil. En escritorio se ven los dos tipos a la vez.
  const kind: CategoryKind = tipo === "ingresos" ? "INCOME" : "EXPENSE";

  // Los dos tipos de una vez: la vista de escritorio los pinta lado a lado.
  const categories = await prisma.category.findMany({
    where: { userId: user.id },
    include: { _count: { select: { transactions: true } } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  const items: CategoryItem[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    kind: category.kind,
    active: category.active,
    usageCount: category._count.transactions,
  }));
  const ofKind = (wanted: CategoryKind) =>
    items.filter((category) => category.kind === wanted);

  // Columna del tipo NO elegido: oculta en móvil, visible cuando caben dos.
  const hiddenOnNarrow = "hidden @2xl:flex";

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader
        title="Categorías"
        backHref="/mas"
        actions={
          <PanelButton
            panel={NEW_CATEGORY_PANEL}
            params={{ tipo: KIND_PARAM[kind] }}
            className={HEADER_ACTION}
          >
            <Plus className="size-3.5" />
            Nueva
          </PanelButton>
        }
      >
        <p className="mt-1 text-sm text-white/80">
          Clasifican tus gastos e ingresos
        </p>
      </ScreenHeader>

      <PageBody>
        {/* Pestañas solo en estrecho; con sitio para dos columnas sobran. */}
        <FilterChips
          className="@2xl:hidden"
          items={[
            { href: "/categorias", label: "Gastos", active: kind === "EXPENSE" },
            {
              href: "/categorias?tipo=ingresos",
              label: "Ingresos",
              active: kind === "INCOME",
            },
          ]}
        />

        <div className="grid gap-5 @2xl:grid-cols-2 @2xl:items-start @2xl:gap-6">
          <CategoryManager
            kind="EXPENSE"
            title="Gastos"
            categories={ofKind("EXPENSE")}
            className={kind === "EXPENSE" ? undefined : hiddenOnNarrow}
          />
          <CategoryManager
            kind="INCOME"
            title="Ingresos"
            categories={ofKind("INCOME")}
            className={kind === "INCOME" ? undefined : hiddenOnNarrow}
          />
        </div>

        <p className="text-xs text-muted">
          Las categorías con movimientos no se pueden eliminar para conservar el
          historial; ocúltalas y dejarán de aparecer al registrar.
        </p>
      </PageBody>

      <NewCategoryDrawer fallbackKind={kind} />
    </main>
  );
}
