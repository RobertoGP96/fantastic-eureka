// Schemas Zod compartidos por las server actions. Los montos llegan como
// texto del input y se convierten a unidades menores en la action (necesitan
// los decimales de la moneda), por eso aquí solo se valida la forma.
import { z } from "zod";
import {
  ACCOUNT_TYPES,
  DEBT_DIRECTIONS,
  DENOMINATION_KINDS,
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
  groupId: idSchema.optional(),
  icon: z.string().max(40).optional(),
});

export const accountIconSchema = z.object({
  accountId: idSchema,
  icon: z.string().max(40).nullable(),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(60),
  email: z.string().trim().toLowerCase().email("Correo inválido").max(120),
});

export const updatePasswordSchema = z
  .object({
    current: z.string().min(1, "Indica tu contraseña actual"),
    next: z
      .string()
      .min(8, "La nueva contraseña debe tener al menos 8 caracteres")
      .max(100),
    confirm: z.string(),
  })
  .refine((data) => data.next === data.confirm, {
    message: "Las contraseñas no coinciden",
    path: ["confirm"],
  });

export const groupSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(40),
});

export const renameGroupSchema = groupSchema.extend({ id: idSchema });

export const assignGroupSchema = z.object({
  accountId: idSchema,
  groupId: idSchema.nullable(),
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
  fromCurrencyId: idSchema,
  toCurrencyId: idSchema,
  rate: amountText,
  effectiveAt: z.coerce.date().optional(),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(40),
  kind: z.enum(["EXPENSE", "INCOME"]),
});

export const renameCategorySchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1, "El nombre es obligatorio").max(40),
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
  // Cuenta preferida para los abonos (opcional, misma moneda)
  accountId: idSchema.optional(),
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
  // Cuenta preferida para las cuotas (opcional, misma moneda)
  accountId: idSchema.optional(),
  amount: amountText,
  frequency: z.enum(FREQUENCIES),
  firstDueAt: z.coerce.date(),
  endAt: z.coerce.date().optional(),
});

// Editar la cuenta vinculada tras crear: null la desvincula.
export const setDebtAccountSchema = z.object({
  debtId: idSchema,
  accountId: idSchema.nullable(),
});

export const setPlanAccountSchema = z.object({
  planId: idSchema,
  accountId: idSchema.nullable(),
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

export const currencySchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,6}$/, "Código de 2 a 6 letras (ej. USD)"),
  name: z.string().trim().min(1, "El nombre es obligatorio").max(60),
  symbol: z.string().trim().min(1, "El símbolo es obligatorio").max(4),
  decimalPlaces: z.number().int().min(0).max(4),
});

export const denominationSchema = z.object({
  currencyId: idSchema,
  value: amountText,
  kind: z.enum(DENOMINATION_KINDS),
});

export const updateDenominationSchema = z.object({
  id: idSchema,
  value: amountText,
  kind: z.enum(DENOMINATION_KINDS),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio").max(60),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Correo inválido")
      .max(120),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .max(100),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Las contraseñas no coinciden",
    path: ["confirm"],
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Error de negocio lanzado DENTRO de un $transaction para abortarlo y
 * devolver el mensaje al UI (las validaciones de saldo se releen ahí dentro).
 */
export class ActionError extends Error {}
