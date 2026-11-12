import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { minorToInput } from "@/lib/format";
import { buildTxWhere, monthRange } from "@/lib/report";
import {
  TRANSACTION_KIND_LABELS,
  type TransactionKind,
} from "@/lib/domain";

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/**
 * Texto libre (nombres, notas) para una celda: Excel/Sheets interpretan como
 * FÓRMULA lo que empieza por = + - @ (una nota «+53 5 555…» daba #NAME?, y
 * un «=…» malicioso se ejecutaría). El apóstrofo inicial lo deja como texto.
 * No se aplica a la columna Monto, que sí debe ser numérica (y negativa).
 */
function csvText(value: string): string {
  return csvEscape(/^[=+\-@\t\r]/.test(value) ? `'${value}` : value);
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
      counterCurrency: { select: { code: true, decimalPlaces: true } },
      category: { select: { name: true } },
    },
    orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
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

  const lines = transactions.map((tx) => {
    // Exportando UNA cuenta, la transferencia que ella recibe entra en
    // positivo y en su moneda (lado destino); el resto, signo del origen.
    const incoming =
      tx.kind === "TRANSFER" &&
      !!filters.cuenta &&
      tx.counterAccountId === filters.cuenta;
    const currency = incoming ? (tx.counterCurrency ?? tx.currency) : tx.currency;
    const signedMinor = incoming
      ? (tx.counterAmountMinor ?? tx.amountMinor)
      : tx.kind === "EXPENSE" || tx.kind === "TRANSFER"
        ? -tx.amountMinor
        : tx.amountMinor;
    return [
      csvEscape(DATE_FMT.format(tx.occurredAt)),
      csvText(TRANSACTION_KIND_LABELS[tx.kind as TransactionKind] ?? tx.kind),
      csvText(tx.account.name),
      csvText(tx.counterAccount?.name ?? ""),
      csvText(tx.category?.name ?? ""),
      csvEscape(minorToInput(signedMinor, currency.decimalPlaces)),
      csvText(currency.code),
      csvText(tx.note ?? ""),
    ].join(",");
  });

  // BOM para que Excel abra el UTF-8 con acentos correctamente.
  const csv = "﻿" + [header.join(","), ...lines].join("\r\n");
  // Solo un mes VÁLIDO llega al nombre del archivo (va en una cabecera HTTP).
  const suffix = filters.mes && monthRange(filters.mes) ? filters.mes : "todos";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="movimientos-${suffix}.csv"`,
    },
  });
}
