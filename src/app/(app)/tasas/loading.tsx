import { DetailSkeleton } from "@/components/page-skeleton";

// /tasas es principal (pares e histórico) + lateral (conversor), igual que
// el detalle de un par, que también usa este fallback.
export default function Loading() {
  return <DetailSkeleton asideFirst />;
}
