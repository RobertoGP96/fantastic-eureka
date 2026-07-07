// Schemas Zod compartidos por las server actions. Los montos llegan como
// texto del input y se convierten a unidades menores en la action (necesitan
// los decimales de la moneda), por eso aquí solo se valida la forma.
import { z } from "zod";
import {
  ACCOUNT_TYPES,
  DEBT_DIRECTIONS,
  FREQUENCIES,
  PLAN_KINDS,
} from "@/lib/domain";

export const amountText = z
  .string()
  .trim()
  .min(1, "El monto es obligatorio")
  .regex(/^\d{1,13}([.,]\d{1,6})?$/, "Monto inválido");

export const idSchema = z.string().min(1);

export const createAccountSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(60),
  type: z.enum(ACCOUNT_TYPES),
  currencyId: idSchema,
  initialAmount: amountText.optional(),
});

export const updateAccountSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(60),
  archived: z.boolean().optional(),
});

export const incomeExpenseSchema = z.object({
  kind: z.enum(["INCOME", "EXPENSE"]),
  accountId: idSchema,
  amount: amountText,
  categoryId: idSchema.optional(),
  note: z.string().trim().max(200).optional(),
  occurredAt: z.coerce.date().optional(),
});

export const transferSchema = z.object({
  accountId: idSchema,
  counterAccountId: idSchema,
  amount: amountText,
  counterAmount: amountText.optional(),
  note: z.string().trim().max(200).optional(),
  occurredAt: z.coerce.date().optional(),
});

export const cashCountSchema = z.object({
  accountId: idSchema,
  note: z.string().trim().max(200).optional(),
  createAdjustment: z.boolean(),
  lines: z
    .array(
      z.object({
        denominationId: idSchema,
        quantity: z.number().int().min(0).max(1_000_000),
      })
    )
    .min(1),
});

export const exchangeRateSchema = z.object({
  currencyId: idSchema,
  rate: amountText,
  effectiveAt: z.coerce.date().optional(),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(40),
  kind: z.enum(["EXPENSE", "INCOME"]),
});

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(60),
  phone: z.string().trim().max(30).optional(),
  note: z.string().trim().max(200).optional(),
});

export const createDebtSchema = z.object({
  contactId: idSchema.optional(),
  contactName: z.string().trim().min(1).max(60).optional(),
  direction: z.enum(DEBT_DIRECTIONS),
  description: z.string().trim().min(1).max(120),
  total: amountText,
  currencyId: idSchema,
  // Plan de cuotas opcional al crear la deuda
  frequency: z.enum(FREQUENCIES).optional(),
  installmentAmount: amountText.optional(),
  firstDueAt: z.coerce.date().optional(),
});

export const createPlanSchema = z.object({
  debtId: idSchema.optional(),
  contactId: idSchema.optional(),
  kind: z.enum(PLAN_KINDS),
  description: z.string().trim().min(1).max(120),
  currencyId: idSchema,
  amount: amountText,
  frequency: z.enum(FREQUENCIES),
  firstDueAt: z.coerce.date(),
  endAt: z.coerce.date().optional(),
});

export const settleInstallmentSchema = z.object({
  installmentId: idSchema,
  accountId: idSchema,
  amount: amountText.optional(),
  note: z.string().trim().max(200).optional(),
});

export const debtPaymentSchema = z.object({
  debtId: idSchema,
  accountId: idSchema,
  amount: amountText,
  note: z.string().trim().max(200).optional(),
});

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Error de negocio lanzado DENTRO de un $transaction para abortarlo y
 * devolver el mensaje al UI (las validaciones de saldo se releen ahí dentro).
 */
export class ActionError extends Error {}
