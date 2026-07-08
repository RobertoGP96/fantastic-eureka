import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { minorToInput } from "@/lib/format";
import { buildTxWhere } from "@/lib/report";
import {
  TRANSACTION_KIND_LABELS,
  type TransactionKind,
} from "@/lib/domain";

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

const DATE_FMT = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return new Response("No autorizado", { status: 401 });
  }

  const url = new URL(request.url);
  const filters = {
    mes: url.searchParams.get("mes") ?? undefined,
    cuenta: url.searchParams.get("cuenta") ?? undefined,
    categoria: url.searchParams.get("categoria") ?? undefined,
    tipo: url.searchParams.get("tipo") ?? undefined,
  };

  const transactions = await prisma.transaction.findMany({
    where: buildTxWhere(user.id, filters),
    include: {
      account: { select: { name: true } },
      counterAccount: { select: { name: true } },
      currency: { select: { code: true, decimalPlaces: true } },
      category: { select: { name: true } },
    },
    orderBy: { occurredAt: "asc" },
  });

  const header = [
    "Fecha",
    "Tipo",
    "Cuenta",
    "Contracuenta",
    "Categoría",
    "Monto",
    "Moneda",
    "Nota",
  ];

  const lines = transactions.map((tx) =>
    [
      DATE_FMT.format(tx.occurredAt),
      TRANSACTION_KIND_LABELS[tx.kind as TransactionKind] ?? tx.kind,
      tx.account.name,
      tx.counterAccount?.name ?? "",
      tx.category?.name ?? "",
      minorToInput(
        tx.kind === "EXPENSE" || tx.kind === "TRANSFER"
          ? -tx.amountMinor
          : tx.amountMinor,
        tx.currency.decimalPlaces
      ),
      tx.currency.code,
      tx.note ?? "",
    ]
      .map(csvEscape)
      .join(",")
  );

  // BOM para que Excel abra el UTF-8 con acentos correctamente.
  const csv = "﻿" + [header.join(","), ...lines].join("\r\n");
  const suffix = filters.mes && filters.mes !== "todos" ? filters.mes : "todos";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="movimientos-${suffix}.csv"`,
    },
  });
}
