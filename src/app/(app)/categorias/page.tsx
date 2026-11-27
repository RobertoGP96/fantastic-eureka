import { Plus } from "lucide-react";
import { Page, PageBody } from "@/components/page";
import { PanelButton } from "@/components/panel-button";
import { ScreenHeader } from "@/components/screen-header";
import { buttonVariants } from "@/components/ui/button";
import { SegmentedLinks } from "@/components/ui/segmented";
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

const KIND_TABS = [
  { value: "EXPENSE", label: "Gastos", href: "/categorias" },
  { value: "INCOME", label: "Ingresos", href: "/categorias?tipo=ingresos" },
] as const;

// Columna del tipo NO elegido: oculta en estrecho, visible cuando caben dos.
const HIDDEN_ON_NARROW = "hidden @2xl/main:block";

export default async function CategoriasPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const user = await requireSessionUser();
  const { tipo } = await searchParams;
  // Pestaña visible en estrecho. Con sitio se ven los dos tipos a la vez.
  const kind: CategoryKind = tipo === "ingresos" ? "INCOME" : "EXPENSE";

  // Los dos tipos de una vez: en escritorio se pintan lado a lado.
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

  return (
    <Page>
      <ScreenHeader
        title="Categorías"
        subtitle="Clasifican tus gastos e ingresos"
        backHref="/mas"
        actions={
          <PanelButton
            panel={NEW_CATEGORY_PANEL}
            params={{ tipo: KIND_PARAM[kind] }}
            className={buttonVariants({ size: "sm" })}
          >
            <Plus className="size-3.5" />
            Nueva
          </PanelButton>
        }
      />

      <PageBody>
        {/* Pestañas solo en estrecho; con sitio para dos columnas sobran.
            self-start: la pista se ajusta a sus dos opciones. */}
        <SegmentedLinks
          ariaLabel="Tipo de categoría"
          className="self-start @2xl/main:hidden"
          options={KIND_TABS}
          current={kind}
        />

        <div className="grid grid-cols-1 gap-5 @2xl/main:grid-cols-2 @2xl/main:items-start">
          <CategoryManager
            kind="EXPENSE"
            title="Gastos"
            categories={ofKind("EXPENSE")}
            className={kind === "EXPENSE" ? undefined : HIDDEN_ON_NARROW}
          />
          <CategoryManager
            kind="INCOME"
            title="Ingresos"
            categories={ofKind("INCOME")}
            className={kind === "INCOME" ? undefined : HIDDEN_ON_NARROW}
          />
        </div>

        <p className="text-xs text-muted">
          Las categorías con movimientos no se pueden eliminar para conservar el
          historial; ocúltalas y dejarán de aparecer al registrar.
        </p>
      </PageBody>

      <NewCategoryDrawer fallbackKind={kind} />
    </Page>
  );
}
