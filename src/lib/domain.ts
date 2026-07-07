// Constantes de dominio compartidas entre Prisma (SQLite no soporta enums),
// las server actions (validación Zod) y la UI (etiquetas en español).

export const ACCOUNT_TYPES = ["CASH", "BANK", "DIGITAL"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CASH: "Efectivo",
  BANK: "Banco",
  DIGITAL: "Digital",
};

export const TRANSACTION_KINDS = [
  "INCOME",
  "EXPENSE",
  "TRANSFER",
  "ADJUSTMENT",
] as const;
export type TransactionKind = (typeof TRANSACTION_KINDS)[number];

export const TRANSACTION_KIND_LABELS: Record<TransactionKind, string> = {
  INCOME: "Ingreso",
  EXPENSE: "Gasto",
  TRANSFER: "Transferencia",
  ADJUSTMENT: "Ajuste",
};

export const CATEGORY_KINDS = ["EXPENSE", "INCOME"] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export const DENOMINATION_KINDS = ["BILL", "COIN"] as const;
export type DenominationKind = (typeof DENOMINATION_KINDS)[number];

export const DENOMINATION_KIND_LABELS: Record<DenominationKind, string> = {
  BILL: "Billete",
  COIN: "Moneda",
};

export const DEBT_DIRECTIONS = ["RECEIVABLE", "PAYABLE"] as const;
export type DebtDirection = (typeof DEBT_DIRECTIONS)[number];

export const DEBT_DIRECTION_LABELS: Record<DebtDirection, string> = {
  RECEIVABLE: "Por cobrar",
  PAYABLE: "Por pagar",
};

export const DEBT_STATUSES = ["OPEN", "PAID", "CANCELLED"] as const;
export type DebtStatus = (typeof DEBT_STATUSES)[number];

export const DEBT_STATUS_LABELS: Record<DebtStatus, string> = {
  OPEN: "Abierta",
  PAID: "Saldada",
  CANCELLED: "Cancelada",
};

export const PLAN_KINDS = ["COLLECT", "PAY"] as const;
export type PlanKind = (typeof PLAN_KINDS)[number];

export const PLAN_KIND_LABELS: Record<PlanKind, string> = {
  COLLECT: "Cobro",
  PAY: "Pago",
};

export const FREQUENCIES = ["ONCE", "WEEKLY", "BIWEEKLY", "MONTHLY"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  ONCE: "Única",
  WEEKLY: "Semanal",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
};

export const INSTALLMENT_STATUSES = ["PENDING", "PAID", "SKIPPED"] as const;
export type InstallmentStatus = (typeof INSTALLMENT_STATUSES)[number];
