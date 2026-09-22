// Catálogo de operaciones del push móvil: tipo → servicio. Cada entrada
// llama al MISMO servicio que la server action web equivalente, con el
// mismo `payload` que recibe esa action. `ids` trae los ids que el móvil
// generó offline para las filas que crea la operación: así el pull
// posterior devuelve esas filas con el MISMO id y el móvil no las duplica.
//
// Fuera del catálogo a propósito (necesitan respuesta del servidor en el
// momento, no tiene sentido encolarlas offline): compartir cuenta y cambiar
// contraseña. Irán como endpoints directos.
//
// Documentado en docs/mobile-api.md: si añades una entrada aquí, añádela
// allí también.

import type { ActionResult } from "@/lib/schemas";
import type { ServiceContext } from "@/lib/services/context";
import * as account from "@/lib/services/account-service";
import * as cashCount from "@/lib/services/cash-count-service";
import * as category from "@/lib/services/category-service";
import * as currency from "@/lib/services/currency-service";
import * as dashboard from "@/lib/services/dashboard-service";
import * as debt from "@/lib/services/debt-service";
import * as group from "@/lib/services/group-service";
import * as plan from "@/lib/services/plan-service";
import * as profile from "@/lib/services/profile-service";
import * as rate from "@/lib/services/rate-service";
import * as tx from "@/lib/services/transaction-service";

export type OpIds = Record<string, string>;

export type OpHandler = (
  ctx: ServiceContext,
  payload: unknown,
  ids: OpIds
) => Promise<ActionResult<unknown>>;

export const OP_HANDLERS: Record<string, OpHandler> = {
  // ── Cuentas y grupos ──────────────────────────────────────────────────────
  "account.create": (c, p, ids) =>
    account.createAccount(c, p, {
      id: ids.id,
      initialTransactionId: ids.initialTransactionId,
    }),
  "account.update": (c, p) => account.updateAccount(c, p),
  "account.setIcon": (c, p) => account.setAccountIcon(c, p),
  "account.delete": (c, p) => account.deleteAccount(c, p),
  "group.create": (c, p, ids) => group.createAccountGroup(c, p, { id: ids.id }),
  "group.rename": (c, p) => group.renameAccountGroup(c, p),
  "group.delete": (c, p) => group.deleteAccountGroup(c, p),
  "group.assign": (c, p) => group.assignAccountGroup(c, p),

  // ── Catálogo ──────────────────────────────────────────────────────────────
  "category.create": (c, p, ids) => category.createCategory(c, p, { id: ids.id }),
  "category.rename": (c, p) => category.renameCategory(c, p),
  "category.toggle": (c, p) => category.toggleCategory(c, p),
  "category.delete": (c, p) => category.deleteCategory(c, p),
  "currency.create": (c, p, ids) => currency.createCurrency(c, p, { id: ids.id }),
  "currency.toggle": (c, p) => currency.toggleCurrency(c, p),
  "currency.setKind": (c, p) => currency.setCurrencyKind(c, p),
  "currency.setBase": (c, p) => currency.setBaseCurrency(c, p),
  "denomination.create": (c, p, ids) =>
    currency.createDenomination(c, p, { id: ids.id }),
  "denomination.update": (c, p) => currency.updateDenomination(c, p),
  "denomination.toggle": (c, p) => currency.toggleDenomination(c, p),
  "denomination.delete": (c, p) => currency.deleteDenomination(c, p),
  "rate.create": (c, p, ids) => rate.createExchangeRate(c, p, { id: ids.id }),

  // ── Libro mayor ───────────────────────────────────────────────────────────
  "tx.incomeExpense": (c, p, ids) =>
    tx.registerIncomeExpense(c, p, { id: ids.id }),
  "tx.transfer": (c, p, ids) => tx.registerTransfer(c, p, { id: ids.id }),
  "tx.update": (c, p) => tx.updateTransaction(c, p),
  "tx.delete": (c, p) => tx.deleteTransaction(c, p),
  "cashCount.create": (c, p, ids) =>
    cashCount.createCashCount(c, p, {
      id: ids.id,
      adjustmentTransactionId: ids.adjustmentTransactionId,
    }),

  // ── Deudas y mensualidades ────────────────────────────────────────────────
  "debt.create": (c, p, ids) =>
    debt.createDebt(c, p, {
      id: ids.id,
      contactId: ids.contactId,
      planId: ids.planId,
      installmentId: ids.installmentId,
    }),
  "debt.setAccount": (c, p) => debt.setDebtAccount(c, p),
  "debt.payment": (c, p, ids) =>
    debt.registerDebtPayment(c, p, {
      id: ids.id,
      transactionId: ids.transactionId,
    }),
  "debt.delete": (c, p) => debt.deleteDebt(c, p),
  "plan.create": (c, p, ids) =>
    plan.createPlan(c, p, { id: ids.id, installmentId: ids.installmentId }),
  "plan.setAccount": (c, p) => plan.setPlanAccount(c, p),
  "plan.settle": (c, p, ids) =>
    plan.settleInstallment(c, p, {
      transactionId: ids.transactionId,
      debtPaymentId: ids.debtPaymentId,
      nextInstallmentId: ids.nextInstallmentId,
    }),
  "plan.skip": (c, p, ids) =>
    plan.skipInstallment(c, p, { nextInstallmentId: ids.nextInstallmentId }),
  "plan.deactivate": (c, p) => plan.deactivatePlan(c, p),
  "plan.delete": (c, p) => plan.deletePlan(c, p),

  // ── Usuario ───────────────────────────────────────────────────────────────
  "dashboard.savePrefs": (c, p) => dashboard.saveDashboardPrefs(c, p),
  "profile.update": (c, p) => profile.updateProfile(c, p),
};
