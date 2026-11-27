import { ListSkeleton } from "@/components/page-skeleton";

// /movimientos: barra de filtros, totales y la lista en una tarjeta.
export default function Loading() {
  return <ListSkeleton filters stats />;
}
